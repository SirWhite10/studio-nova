package domaincontrol

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSurrealClientHostAllowed(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		requests++
		if req.URL.Path != "/sql" {
			t.Fatalf("unexpected path: %s", req.URL.Path)
		}
		if req.Header.Get("Surreal-NS") != "main" || req.Header.Get("Surreal-DB") != "main" {
			t.Fatalf("missing surreal namespace/database headers")
		}
		if req.Header.Get("Authorization") == "" {
			t.Fatalf("missing basic auth header")
		}

		body := readRequestBody(t, req)
		rw.Header().Set("Content-Type", "application/json")
		switch {
		case strings.Contains(body, "FROM proxy_domain"):
			if !strings.Contains(body, `"supremesolutionsusa.com"`) {
				t.Fatalf("host was not normalized in query: %s", body)
			}
			_, _ = rw.Write([]byte(`[{"status":"OK","result":[{"proxyId":"workspace_proxy:abc123"}]}]`))
		case strings.Contains(body, `FROM type::thing("workspace_proxy", "abc123")`):
			_, _ = rw.Write([]byte(`[{"status":"OK","result":[{"enabled":true}]}]`))
		default:
			t.Fatalf("unexpected query: %s", body)
		}
	}))
	defer server.Close()

	client, err := NewSurrealClient(SurrealOptions{
		URL:       server.URL + "/rpc",
		Namespace: "main",
		Database:  "main",
		Username:  "root",
		Password:  "root",
	})
	if err != nil {
		t.Fatal(err)
	}

	if err := client.HostAllowed(context.Background(), "SupremeSolutionsUSA.com."); err != nil {
		t.Fatal(err)
	}
	if requests != 2 {
		t.Fatalf("expected 2 surreal queries, got %d", requests)
	}
}

func TestSurrealClientHostAllowedRejectsInactiveDomain(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		rw.Header().Set("Content-Type", "application/json")
		_, _ = rw.Write([]byte(`[{"status":"OK","result":[]}]`))
	}))
	defer server.Close()

	client, err := NewSurrealClient(SurrealOptions{URL: server.URL + "/sql"})
	if err != nil {
		t.Fatal(err)
	}

	if err := client.HostAllowed(context.Background(), "missing.example.com"); err == nil {
		t.Fatal("expected missing domain to be rejected")
	}
}

func TestSurrealClientHostAllowedReturnsRichStatementErrors(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		rw.Header().Set("Content-Type", "application/json")
		_, _ = rw.Write([]byte(`[{"status":"ERR","result":"The namespace 'nova' does not exist","details":{"kind":"Namespace","details":{"name":"nova"}}}]`))
	}))
	defer server.Close()

	client, err := NewSurrealClient(SurrealOptions{URL: server.URL + "/sql"})
	if err != nil {
		t.Fatal(err)
	}

	err = client.HostAllowed(context.Background(), "missing.example.com")
	if err == nil {
		t.Fatal("expected surreal statement error")
	}
	message := err.Error()
	if !strings.Contains(message, "The namespace 'nova' does not exist") {
		t.Fatalf("expected result text in error, got %q", message)
	}
	if !strings.Contains(message, `"kind":"Namespace"`) {
		t.Fatalf("expected details payload in error, got %q", message)
	}
}

func TestSurrealSQLURL(t *testing.T) {
	tests := map[string]string{
		"wss://surrealdb.example.com/rpc": "https://surrealdb.example.com/sql",
		"ws://127.0.0.1:8000/rpc":         "http://127.0.0.1:8000/sql",
		"https://db.example.com":          "https://db.example.com/sql",
		"https://db.example.com/sql":      "https://db.example.com/sql",
	}
	for input, expected := range tests {
		actual, err := surrealSQLURL(input)
		if err != nil {
			t.Fatal(err)
		}
		if actual != expected {
			t.Fatalf("expected %q, got %q", expected, actual)
		}
	}
}

func TestSurrealRecordExpr(t *testing.T) {
	actual, err := surrealRecordExpr("workspace_proxy:nova-smoke-workspace")
	if err != nil {
		t.Fatal(err)
	}
	expected := `type::thing("workspace_proxy", "nova-smoke-workspace")`
	if actual != expected {
		t.Fatalf("expected %q, got %q", expected, actual)
	}
}

func readRequestBody(t *testing.T, req *http.Request) string {
	t.Helper()
	body, err := io.ReadAll(req.Body)
	if err != nil {
		t.Fatal(err)
	}
	return string(body)
}
