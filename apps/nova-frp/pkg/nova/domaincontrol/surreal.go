package domaincontrol

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

var recordIDPattern = regexp.MustCompile(`^[A-Za-z0-9_]+:[A-Za-z0-9_-]+$`)

type SurrealOptions struct {
	URL              string
	Namespace        string
	Database         string
	Username         string
	Password         string
	ConnectTimeoutMS int
}

type SurrealClient struct {
	sqlURL    string
	namespace string
	database  string
	username  string
	password  string
	http      *http.Client
}

type surrealStatement struct {
	Status string          `json:"status"`
	Result json.RawMessage `json:"result"`
	Detail string          `json:"detail"`
}

type proxyDomainRow struct {
	ProxyID string `json:"proxyId"`
}

type workspaceProxyRow struct {
	Enabled bool `json:"enabled"`
}

type SmokeWorkspaceOptions struct {
	Host      string
	ProxyName string
	LocalPort int
}

func NewSurrealClient(opts SurrealOptions) (*SurrealClient, error) {
	sqlURL, err := surrealSQLURL(opts.URL)
	if err != nil {
		return nil, err
	}
	timeout := time.Duration(opts.ConnectTimeoutMS) * time.Millisecond
	if timeout <= 0 {
		timeout = 5 * time.Second
	}
	namespace := strings.TrimSpace(opts.Namespace)
	if namespace == "" {
		namespace = "main"
	}
	database := strings.TrimSpace(opts.Database)
	if database == "" {
		database = "main"
	}
	return &SurrealClient{
		sqlURL:    sqlURL,
		namespace: namespace,
		database:  database,
		username:  opts.Username,
		password:  opts.Password,
		http:      &http.Client{Timeout: timeout},
	}, nil
}

func (c *SurrealClient) HostAllowed(ctx context.Context, host string) error {
	host = normalizeHost(host)
	if host == "" {
		return fmt.Errorf("empty host")
	}

	domainRows := []proxyDomainRow{}
	if err := c.queryOne(ctx, fmt.Sprintf(
		"SELECT proxyId FROM proxy_domain WHERE host = %s AND status = 'active' LIMIT 1;",
		surrealString(host),
	), &domainRows); err != nil {
		return err
	}
	if len(domainRows) == 0 {
		return fmt.Errorf("host %q is not active in SurrealDB", host)
	}

	proxyID := strings.TrimSpace(domainRows[0].ProxyID)
	if !recordIDPattern.MatchString(proxyID) {
		return fmt.Errorf("invalid proxy id for host %q", host)
	}

	proxyRows := []workspaceProxyRow{}
	if err := c.queryOne(ctx, fmt.Sprintf(
		"SELECT enabled FROM %s WHERE enabled = true LIMIT 1;",
		proxyID,
	), &proxyRows); err != nil {
		return err
	}
	if len(proxyRows) == 0 || !proxyRows[0].Enabled {
		return fmt.Errorf("proxy %q for host %q is not enabled", proxyID, host)
	}
	return nil
}

func (c *SurrealClient) UpsertSmokeWorkspace(ctx context.Context, opts SmokeWorkspaceOptions) error {
	host := normalizeHost(opts.Host)
	if host == "" {
		return fmt.Errorf("empty smoke host")
	}
	proxyName := strings.TrimSpace(opts.ProxyName)
	if proxyName == "" {
		proxyName = "nova-smoke-workspace"
	}
	if opts.LocalPort <= 0 {
		return fmt.Errorf("local port is required")
	}

	proxyRecord := "workspace_proxy:" + safeRecordPart(proxyName)
	domainRecord := "proxy_domain:" + safeRecordPart(host)
	now := time.Now().UnixMilli()

	sql := strings.Join([]string{
		fmt.Sprintf(
			"UPSERT %s MERGE { userId: 'nova-smoke', studioId: 'nova-smoke', proxyName: %s, proxyType: 'http', localIP: '127.0.0.1', localPort: %d, enabled: true, updatedAt: %d };",
			proxyRecord,
			surrealString(proxyName),
			opts.LocalPort,
			now,
		),
		fmt.Sprintf(
			"UPSERT %s MERGE { host: %s, proxyId: %s, kind: 'custom', status: 'active', updatedAt: %d };",
			domainRecord,
			surrealString(host),
			surrealString(proxyRecord),
			now,
		),
	}, "\n")
	return c.exec(ctx, sql)
}

func (c *SurrealClient) DeleteSmokeWorkspace(ctx context.Context, host, proxyName string) error {
	host = normalizeHost(host)
	proxyName = strings.TrimSpace(proxyName)
	if host == "" || proxyName == "" {
		return nil
	}
	sql := strings.Join([]string{
		fmt.Sprintf("DELETE %s;", "proxy_domain:"+safeRecordPart(host)),
		fmt.Sprintf("DELETE %s;", "workspace_proxy:"+safeRecordPart(proxyName)),
	}, "\n")
	return c.exec(ctx, sql)
}

func (c *SurrealClient) queryOne(ctx context.Context, sql string, out any) error {
	body, err := c.doSQL(ctx, sql)
	if err != nil {
		return err
	}

	var statements []surrealStatement
	if err := json.Unmarshal(body, &statements); err != nil {
		return err
	}
	if len(statements) == 0 {
		return fmt.Errorf("surreal sql returned no statements")
	}
	if !strings.EqualFold(statements[0].Status, "OK") {
		if statements[0].Detail != "" {
			return fmt.Errorf("surreal sql error: %s", statements[0].Detail)
		}
		return fmt.Errorf("surreal sql error: %s", statements[0].Status)
	}
	return json.Unmarshal(statements[0].Result, out)
}

func (c *SurrealClient) exec(ctx context.Context, sql string) error {
	body, err := c.doSQL(ctx, sql)
	if err != nil {
		return err
	}
	var statements []surrealStatement
	if err := json.Unmarshal(body, &statements); err != nil {
		return err
	}
	for _, statement := range statements {
		if !strings.EqualFold(statement.Status, "OK") {
			if statement.Detail != "" {
				return fmt.Errorf("surreal sql error: %s", statement.Detail)
			}
			return fmt.Errorf("surreal sql error: %s", statement.Status)
		}
	}
	return nil
}

func (c *SurrealClient) doSQL(ctx context.Context, sql string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.sqlURL, bytes.NewBufferString(sql))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "text/plain")
	req.Header.Set("Surreal-NS", c.namespace)
	req.Header.Set("Surreal-DB", c.database)
	if c.username != "" || c.password != "" {
		req.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(c.username+":"+c.password)))
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("surreal sql status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return body, nil
}

func surrealSQLURL(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", fmt.Errorf("surreal URL is required")
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return "", err
	}
	if parsed.Scheme == "ws" {
		parsed.Scheme = "http"
	}
	if parsed.Scheme == "wss" {
		parsed.Scheme = "https"
	}
	if strings.HasSuffix(parsed.Path, "/rpc") {
		parsed.Path = strings.TrimSuffix(parsed.Path, "/rpc") + "/sql"
	} else if !strings.HasSuffix(parsed.Path, "/sql") {
		parsed.Path = strings.TrimRight(parsed.Path, "/") + "/sql"
	}
	return parsed.String(), nil
}

func surrealString(value string) string {
	encoded, _ := json.Marshal(value)
	return string(encoded)
}

func safeRecordPart(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var b strings.Builder
	for _, r := range value {
		switch {
		case r >= 'a' && r <= 'z':
			b.WriteRune(r)
		case r >= '0' && r <= '9':
			b.WriteRune(r)
		case r == '_' || r == '-':
			b.WriteRune(r)
		case r == '.':
			b.WriteRune('_')
		default:
			b.WriteRune('_')
		}
	}
	out := strings.Trim(b.String(), "_-")
	if out == "" {
		return "nova_smoke"
	}
	return out
}
