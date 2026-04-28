package domaincontrol

import (
	"context"
	"crypto/tls"
	"net"
	"net/http"
	"strings"

	"golang.org/x/crypto/acme/autocert"
)

type ACMEOptions struct {
	Email    string
	CacheDir string
}

type HostAuthorizer interface {
	HostAllowed(ctx context.Context, host string) error
}

func NewACMEManager(authorizer HostAuthorizer, opts ACMEOptions) *autocert.Manager {
	cacheDir := strings.TrimSpace(opts.CacheDir)
	if cacheDir == "" {
		cacheDir = "certs"
	}

	return &autocert.Manager{
		Prompt: autocert.AcceptTOS,
		Email:  opts.Email,
		Cache:  autocert.DirCache(cacheDir),
		HostPolicy: func(ctx context.Context, host string) error {
			return authorizer.HostAllowed(ctx, host)
		},
	}
}

func TLSConfig(manager *autocert.Manager) *tls.Config {
	return &tls.Config{
		GetCertificate: manager.GetCertificate,
		MinVersion:     tls.VersionTLS12,
		NextProtos:     []string{"h2", "http/1.1", "acme-tls/1"},
	}
}

func HTTPHandler(manager *autocert.Manager, fallback http.Handler) http.Handler {
	return manager.HTTPHandler(fallback)
}

func HTTPSRedirectHandler() http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		host := req.Host
		if h, _, err := net.SplitHostPort(host); err == nil {
			host = h
		}
		target := "https://" + host + req.URL.RequestURI()
		http.Redirect(rw, req, target, http.StatusMovedPermanently)
	})
}
