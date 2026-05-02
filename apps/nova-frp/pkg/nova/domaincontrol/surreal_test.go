package domaincontrol

import (
	"testing"

	"github.com/surrealdb/surrealdb.go/pkg/models"
)

func TestSurrealEndpointURL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "https sql endpoint", input: "https://surrealdb.example.com/sql", want: "https://surrealdb.example.com"},
		{name: "https root endpoint", input: "https://surrealdb.example.com", want: "https://surrealdb.example.com"},
		{name: "wss rpc endpoint", input: "wss://surrealdb.example.com/rpc", want: "wss://surrealdb.example.com"},
		{name: "ws root endpoint", input: "ws://surrealdb.example.com", want: "ws://surrealdb.example.com"},
		{name: "unsupported scheme", input: "tcp://surrealdb.example.com", wantErr: true},
		{name: "empty", input: "", wantErr: true},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got, err := surrealEndpointURL(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("expected error for %q", tt.input)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Fatalf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestParseRecordID(t *testing.T) {
	t.Parallel()

	recordID, err := parseRecordID("workspace_proxy:nova-smoke-workspace")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if recordID.Table != "workspace_proxy" {
		t.Fatalf("got table %q", recordID.Table)
	}
	if got, ok := recordID.ID.(string); !ok || got != "nova-smoke-workspace" {
		t.Fatalf("got id %#v", recordID.ID)
	}

	if _, err := parseRecordID("workspace_proxy:nova-smoke workspace"); err == nil {
		t.Fatal("expected invalid record id error")
	}
}

func TestRecordIDValue(t *testing.T) {
	t.Parallel()

	got := recordIDValue(models.NewRecordID("workspace_proxy", "nova-smoke-workspace"))
	want := "workspace_proxy:nova-smoke-workspace"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestSafeRecordPart(t *testing.T) {
	t.Parallel()

	tests := []struct {
		input string
		want  string
	}{
		{input: "Test.Workspace.DLXStudios.com", want: "test_workspace_dlxstudios_com"},
		{input: " nova-smoke-workspace ", want: "nova-smoke-workspace"},
		{input: "___", want: "nova_smoke"},
	}

	for _, tt := range tests {
		if got := safeRecordPart(tt.input); got != tt.want {
			t.Fatalf("safeRecordPart(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}
