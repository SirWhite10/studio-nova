package domaincontrol

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientHostAllowed(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		if req.URL.Path != "/resolve" {
			t.Fatalf("unexpected path: %s", req.URL.Path)
		}
		if req.URL.Query().Get("host") != "ws-1.workspace.example.com" {
			t.Fatalf("unexpected host query: %s", req.URL.RawQuery)
		}
		if req.Header.Get("Authorization") != "Bearer test-token" {
			t.Fatalf("missing bearer token")
		}
		rw.Header().Set("Content-Type", "application/json")
		_, _ = rw.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	client, err := NewClient(server.URL, "test-token")
	if err != nil {
		t.Fatal(err)
	}

	if err := client.HostAllowed(context.Background(), "WS-1.workspace.example.com."); err != nil {
		t.Fatal(err)
	}
}

func TestClientHostAllowedRejectsInactiveHost(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, req *http.Request) {
		rw.WriteHeader(http.StatusNotFound)
		_, _ = rw.Write([]byte(`{"ok":false}`))
	}))
	defer server.Close()

	client, err := NewClient(server.URL, "")
	if err != nil {
		t.Fatal(err)
	}

	if err := client.HostAllowed(context.Background(), "missing.workspace.example.com"); err == nil {
		t.Fatal("expected inactive host to be rejected")
	}
}
