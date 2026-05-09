package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/spf13/cobra"

	"github.com/fatedier/frp/pkg/config"
	v1 "github.com/fatedier/frp/pkg/config/v1"
	"github.com/fatedier/frp/pkg/nova/domaincontrol"
	"github.com/fatedier/frp/server"
)

var novaSmokeHost string
var novaSmokeFRPCBinary string
var novaSmokeProxyName string
var novaSmokeTimeout time.Duration
var novaSmokeCleanup bool
var novaSmokeInsecureTLS bool

func init() {
	novaSmokeCmd.Flags().StringVar(&novaSmokeHost, "host", "test.dlx.studio", "public hostname to test")
	novaSmokeCmd.Flags().StringVar(&novaSmokeFRPCBinary, "frpc-binary", "frpc", "frpc binary path")
	novaSmokeCmd.Flags().StringVar(&novaSmokeProxyName, "proxy-name", "nova-smoke-workspace", "temporary proxy name")
	novaSmokeCmd.Flags().DurationVar(&novaSmokeTimeout, "timeout", 2*time.Minute, "maximum time to wait for HTTPS to work")
	novaSmokeCmd.Flags().BoolVar(&novaSmokeCleanup, "cleanup", false, "delete temporary SurrealDB records after the smoke test")
	novaSmokeCmd.Flags().BoolVar(&novaSmokeInsecureTLS, "insecure-skip-verify", false, "skip TLS verification for debugging only")
	rootCmd.AddCommand(novaSmokeCmd)
}

var novaSmokeCmd = &cobra.Command{
	Use:   "nova-smoke",
	Short: "Run an end-to-end Nova domain smoke test",
	RunE: func(cmd *cobra.Command, args []string) error {
		if cfgFile == "" {
			return fmt.Errorf("frps nova-smoke: the configuration file is not specified")
		}
		host := strings.TrimSpace(strings.ToLower(novaSmokeHost))
		if host == "" {
			return fmt.Errorf("frps nova-smoke: --host is required")
		}

		svrCfg, _, err := config.LoadServerConfig(cfgFile, strictConfigMode)
		if err != nil {
			return err
		}
		if !svrCfg.NovaDomainControl.Enable || svrCfg.NovaDomainControl.Surreal.URL == "" {
			return fmt.Errorf("frps nova-smoke requires novaDomainControl.enable and novaDomainControl.surreal.url")
		}

		ctx, cancel := context.WithTimeout(context.Background(), novaSmokeTimeout)
		defer cancel()

		surreal, err := domaincontrol.NewSurrealClient(domaincontrol.SurrealOptions{
			URL:              svrCfg.NovaDomainControl.Surreal.URL,
			Namespace:        svrCfg.NovaDomainControl.Surreal.Namespace,
			Database:         svrCfg.NovaDomainControl.Surreal.Database,
			Username:         svrCfg.NovaDomainControl.Surreal.Username,
			Password:         svrCfg.NovaDomainControl.Surreal.Password,
			ConnectTimeoutMS: svrCfg.NovaDomainControl.Surreal.ConnectTimeoutMS,
		})
		if err != nil {
			return err
		}

		workspacePort, stopWorkspace, err := startSmokeWorkspace()
		if err != nil {
			return err
		}
		defer stopWorkspace()

		stopServer, err := ensureSmokeFRPS(ctx, svrCfg)
		if err != nil {
			return err
		}
		defer stopServer()

		if ips, err := net.LookupHost(host); err == nil {
			fmt.Printf("nova-smoke: DNS %s -> %s\n", host, strings.Join(ips, ", "))
		} else {
			fmt.Printf("nova-smoke: DNS lookup warning for %s: %v\n", host, err)
		}

		frpcConfig, err := writeSmokeFRPCConfig(svrCfg.BindPort, svrCfg.Auth.Token, workspacePort, host)
		if err != nil {
			return err
		}
		defer os.Remove(frpcConfig)

		frpcCmd := exec.CommandContext(ctx, novaSmokeFRPCBinary, "-c", frpcConfig)
		frpcCmd.Stdout = os.Stdout
		frpcCmd.Stderr = os.Stderr
		if err := frpcCmd.Start(); err != nil {
			return fmt.Errorf("start frpc: %w", err)
		}
		defer func() {
			_ = frpcCmd.Process.Kill()
			_, _ = frpcCmd.Process.Wait()
		}()
		fmt.Printf("nova-smoke: frpc started with proxy %s -> 127.0.0.1:%d\n", novaSmokeProxyName, workspacePort)

		fmt.Printf("nova-smoke: creating/updating SurrealDB workspace/domain records for %s\n", host)
		if err := surreal.UpsertSmokeWorkspace(ctx, domaincontrol.SmokeWorkspaceOptions{
			Host:      host,
			ProxyName: novaSmokeProxyName,
			LocalPort: workspacePort,
		}); err != nil {
			return err
		}
		if novaSmokeCleanup {
			defer func() {
				cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 10*time.Second)
				defer cleanupCancel()
				_ = surreal.DeleteSmokeWorkspace(cleanupCtx, host, novaSmokeProxyName)
			}()
		}

		if err := waitUntil(ctx, func() error {
			return surreal.HostAllowed(ctx, host)
		}); err != nil {
			return fmt.Errorf("host was not allowed after record creation: %w", err)
		}
		fmt.Printf("nova-smoke: SurrealDB host authorization passed\n")

		if err := waitForHTTPRedirect(ctx, host); err != nil {
			return err
		}
		fmt.Printf("nova-smoke: HTTP redirects to HTTPS\n")

		body, err := waitForHTTPS(ctx, host)
		if err != nil {
			return err
		}
		fmt.Printf("nova-smoke: HTTPS workspace response ok: %s\n", strings.TrimSpace(body))
		fmt.Printf("nova-smoke: PASS https://%s\n", host)
		return nil
	},
}

func ensureSmokeFRPS(ctx context.Context, cfg *v1.ServerConfig) (func(), error) {
	address := net.JoinHostPort("127.0.0.1", strconv.Itoa(cfg.BindPort))
	if err := probeTCP(ctx, address); err == nil {
		fmt.Printf("nova-smoke: existing frps detected on %s\n", address)
		return func() {}, nil
	}

	svr, err := server.NewService(cfg)
	if err != nil {
		return nil, err
	}
	serverCtx, stopServer := context.WithCancel(context.Background())
	go svr.Run(serverCtx)
	if err := waitForTCP(ctx, address); err != nil {
		stopServer()
		return nil, fmt.Errorf("started frps but control port did not become available: %w", err)
	}
	fmt.Printf("nova-smoke: frps was not already running, started from %s\n", cfgFile)
	return stopServer, nil
}

func startSmokeWorkspace() (int, func(), error) {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(rw http.ResponseWriter, req *http.Request) {
		rw.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = fmt.Fprintf(rw, "<!doctype html><title>Nova Smoke</title><h1>Nova smoke workspace</h1><p>host=%s</p>\n", req.Host)
	})
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, nil, err
	}
	port := listener.Addr().(*net.TCPAddr).Port
	server := &http.Server{Handler: mux}
	go func() {
		_ = server.Serve(listener)
	}()
	return port, func() {
		_ = server.Close()
	}, nil
}

func writeSmokeFRPCConfig(bindPort int, authToken string, workspacePort int, host string) (string, error) {
	path := filepath.Join(os.TempDir(), fmt.Sprintf("nova-smoke-frpc-%d.toml", os.Getpid()))
	content := strings.Join([]string{
		`serverAddr = "127.0.0.1"`,
		`serverPort = ` + strconv.Itoa(bindPort),
		`auth.method = "token"`,
		`auth.token = "` + escapeTOML(authToken) + `"`,
		`loginFailExit = true`,
		`transport.tls.enable = false`,
		`log.to = "console"`,
		`log.level = "info"`,
		``,
		`[[proxies]]`,
		`name = "` + escapeTOML(novaSmokeProxyName) + `"`,
		`type = "http"`,
		`localIP = "127.0.0.1"`,
		`localPort = ` + strconv.Itoa(workspacePort),
		`customDomains = ["` + escapeTOML(host) + `"]`,
		``,
	}, "\n")
	return path, os.WriteFile(path, []byte(content), 0o600)
}

func waitForHTTPRedirect(ctx context.Context, host string) error {
	client := &http.Client{
		Timeout: 5 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
	return waitUntil(ctx, func() error {
		resp, err := client.Get("http://" + host + "/")
		if err != nil {
			return err
		}
		defer resp.Body.Close()
		location := resp.Header.Get("Location")
		if resp.StatusCode < 300 || resp.StatusCode >= 400 || !strings.HasPrefix(location, "https://"+host) {
			return fmt.Errorf("expected HTTP redirect to HTTPS, got %d location=%q", resp.StatusCode, location)
		}
		return nil
	})
}

func waitForHTTPS(ctx context.Context, host string) (string, error) {
	client := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{InsecureSkipVerify: novaSmokeInsecureTLS}, //nolint:gosec
		},
	}
	var body string
	err := waitUntil(ctx, func() error {
		resp, err := client.Get("https://" + host + "/")
		if err != nil {
			return err
		}
		defer resp.Body.Close()
		data, err := io.ReadAll(resp.Body)
		if err != nil {
			return err
		}
		body = string(data)
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return fmt.Errorf("expected HTTPS 2xx, got %d: %s", resp.StatusCode, strings.TrimSpace(body))
		}
		if !strings.Contains(body, "Nova smoke workspace") {
			return fmt.Errorf("unexpected HTTPS body: %s", strings.TrimSpace(body))
		}
		return nil
	})
	return body, err
}

func waitUntil(ctx context.Context, fn func() error) error {
	var lastErr error
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()
	for {
		if err := fn(); err == nil {
			return nil
		} else {
			lastErr = err
		}
		select {
		case <-ctx.Done():
			return fmt.Errorf("timed out: %w", lastErr)
		case <-ticker.C:
		}
	}
}

func probeTCP(ctx context.Context, address string) error {
	var dialer net.Dialer
	conn, err := dialer.DialContext(ctx, "tcp", address)
	if err != nil {
		return err
	}
	_ = conn.Close()
	return nil
}

func waitForTCP(ctx context.Context, address string) error {
	return waitUntil(ctx, func() error {
		return probeTCP(ctx, address)
	})
}

func escapeTOML(value string) string {
	return strings.ReplaceAll(value, `"`, `\"`)
}
