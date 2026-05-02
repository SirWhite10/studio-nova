package domaincontrol

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	surrealdb "github.com/surrealdb/surrealdb.go"
	"github.com/surrealdb/surrealdb.go/pkg/models"
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
	namespace string
	database  string
	db        *surrealdb.DB
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
	endpointURL, err := surrealEndpointURL(opts.URL)
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

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	db, err := surrealdb.FromEndpointURLString(ctx, endpointURL)
	if err != nil {
		return nil, err
	}
	if err := db.Use(ctx, namespace, database); err != nil {
		_ = db.Close(context.Background())
		return nil, err
	}
	if _, err := db.SignIn(ctx, &surrealdb.Auth{
		Username: opts.Username,
		Password: opts.Password,
	}); err != nil {
		_ = db.Close(context.Background())
		return nil, err
	}

	return &SurrealClient{
		namespace: namespace,
		database:  database,
		db:        db,
	}, nil
}

func (c *SurrealClient) HostAllowed(ctx context.Context, host string) error {
	host = normalizeHost(host)
	if host == "" {
		return fmt.Errorf("empty host")
	}

	domainRows, err := surrealdb.Query[[]proxyDomainRow](
		ctx,
		c.db,
		"SELECT proxyId FROM proxy_domain WHERE host = $host AND status = 'active' LIMIT 1",
		map[string]any{"host": host},
	)
	if err != nil {
		return err
	}
	if len(*domainRows) == 0 || len((*domainRows)[0].Result) == 0 {
		return fmt.Errorf("host %q is not active in SurrealDB", host)
	}

	proxyID := strings.TrimSpace((*domainRows)[0].Result[0].ProxyID)
	recordID, err := parseRecordID(proxyID)
	if err != nil {
		return fmt.Errorf("invalid proxy id for host %q: %w", host, err)
	}

	proxy, err := surrealdb.Select[workspaceProxyRow](ctx, c.db, *recordID)
	if err != nil {
		return err
	}
	if proxy == nil || !proxy.Enabled {
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

	proxyRecord := models.NewRecordID("workspace_proxy", safeRecordPart(proxyName))
	domainRecord := models.NewRecordID("proxy_domain", safeRecordPart(host))
	now := time.Now().UnixMilli()

	if _, err := surrealdb.Upsert[map[string]any](ctx, c.db, proxyRecord, map[string]any{
		"userId":    "nova-smoke",
		"studioId":  "nova-smoke",
		"proxyName": proxyName,
		"proxyType": "http",
		"localIP":   "127.0.0.1",
		"localPort": opts.LocalPort,
		"enabled":   true,
		"createdAt": now,
		"updatedAt": now,
	}); err != nil {
		return err
	}

	if _, err := surrealdb.Upsert[map[string]any](ctx, c.db, domainRecord, map[string]any{
		"host":      host,
		"proxyId":   recordIDValue(proxyRecord),
		"kind":      "custom",
		"status":    "active",
		"createdAt": now,
		"updatedAt": now,
	}); err != nil {
		return err
	}

	return nil
}

func (c *SurrealClient) DeleteSmokeWorkspace(ctx context.Context, host, proxyName string) error {
	host = normalizeHost(host)
	proxyName = strings.TrimSpace(proxyName)
	if host == "" || proxyName == "" {
		return nil
	}

	domainRecord := models.NewRecordID("proxy_domain", safeRecordPart(host))
	if _, err := surrealdb.Delete[map[string]any](ctx, c.db, domainRecord); err != nil {
		return err
	}

	proxyRecord := models.NewRecordID("workspace_proxy", safeRecordPart(proxyName))
	if _, err := surrealdb.Delete[map[string]any](ctx, c.db, proxyRecord); err != nil {
		return err
	}

	return nil
}

func surrealEndpointURL(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", fmt.Errorf("surreal URL is required")
	}

	switch {
	case strings.HasSuffix(raw, "/sql"):
		raw = strings.TrimSuffix(raw, "/sql")
	case strings.HasSuffix(raw, "/rpc"):
		raw = strings.TrimSuffix(raw, "/rpc")
	}

	if strings.HasPrefix(raw, "ws://") || strings.HasPrefix(raw, "wss://") {
		return raw, nil
	}
	if strings.HasPrefix(raw, "http://") || strings.HasPrefix(raw, "https://") {
		return raw, nil
	}
	return "", fmt.Errorf("unsupported surreal URL scheme in %q", raw)
}

func recordIDValue(recordID models.RecordID) string {
	return fmt.Sprintf("%s:%v", recordID.Table, recordID.ID)
}

func parseRecordID(value string) (*models.RecordID, error) {
	value = strings.TrimSpace(value)
	if !recordIDPattern.MatchString(value) {
		return nil, fmt.Errorf("invalid surreal record id %q", value)
	}
	recordID, err := models.ParseRecordID(value)
	if err != nil {
		return nil, err
	}
	return recordID, nil
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
