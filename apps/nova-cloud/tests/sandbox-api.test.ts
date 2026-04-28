import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

vi.mock("$lib/server/surreal-query", () => ({
  requireUserId: vi.fn().mockReturnValue("user-123"),
}));

vi.mock("$lib/server/surreal-records", () => ({
  normalizeRouteParam: vi.fn((id: string) => id),
}));

vi.mock("$lib/server/surreal-sandbox", () => ({
  getSandboxForStudio: vi.fn(),
}));

vi.mock("$lib/server/surreal-runtime-processes", () => ({
  getPrimaryForStudio: vi.fn(),
  upsertPrimaryForStudio: vi.fn(),
  markPrimaryStopped: vi.fn(),
}));

vi.mock("$lib/server/surreal-artifacts", () => ({
  listArtifactsForStudio: vi.fn().mockResolvedValue([]),
}));

vi.mock("$lib/studios/runtime-state", () => ({
  resolveRuntimeState: vi.fn(({ sandbox }: { sandbox?: { status?: string } | null }) => ({
    hasSandbox: Boolean(sandbox),
    status: sandbox?.status ?? "idle",
  })),
}));

vi.mock("$lib/server/runtime-limits", () => ({
  RuntimeLimitError: class RuntimeLimitError extends Error {
    code = "runtime_limit";
    status = 429;
  },
}));

vi.mock("$lib/server/sandbox", () => ({
  getConnectedSandbox: vi.fn(),
  ensureSandboxForRuntime: vi.fn(),
  disconnectSandbox: vi.fn(),
}));

vi.mock("$env/static/private", () => ({
  E2B_API_KEY: "test-key",
}));

function mockEvent(body: Record<string, unknown>, query: Record<string, string> = {}) {
  return {
    locals: { userId: "user-123", token: null, session: null },
    url: { searchParams: new URLSearchParams(query) },
    request: new Request("http://localhost/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    params: {},
    platform: {},
  } as any;
}

function parseResponse(response: Response) {
  return response.json();
}

describe("GET /api/sandbox", () => {
  let GET: any;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../src/routes/api/sandbox/+server");
    GET = mod.GET;
  });

  it("returns idle when no studioId provided", async () => {
    const event = mockEvent({}, {});
    const res = await GET(event);
    const body = await parseResponse(res);
    expect(body.hasSandbox).toBe(false);
    expect(body.status).toBe("idle");
  });

  it("returns idle when no sandbox record exists", async () => {
    const { getSandboxForStudio } = await import("$lib/server/surreal-sandbox");
    const { getPrimaryForStudio } = await import("$lib/server/surreal-runtime-processes");
    (getSandboxForStudio as any).mockResolvedValue(null);
    (getPrimaryForStudio as any).mockResolvedValue(null);

    const event = mockEvent({}, { studioId: "studio-abc" });
    const res = await GET(event);
    const body = await parseResponse(res);
    expect(body.hasSandbox).toBe(false);
    expect(body.status).toBe("idle");
  });

  it("returns active sandbox details", async () => {
    const { getSandboxForStudio } = await import("$lib/server/surreal-sandbox");
    const { getPrimaryForStudio } = await import("$lib/server/surreal-runtime-processes");
    (getSandboxForStudio as any).mockResolvedValue({
      status: "active",
      sandboxId: "sb-001",
      expiresAt: 9999999999999,
      lastUsedAt: 1000,
    });
    (getPrimaryForStudio as any).mockResolvedValue(null);

    const event = mockEvent({}, { studioId: "studio-abc" });
    const res = await GET(event);
    const body = await parseResponse(res);
    expect(body.hasSandbox).toBe(true);
    expect(body.status).toBe("active");
    expect(body.sandboxId).toBe("sb-001");
  });
});

describe("POST /api/sandbox", () => {
  let POST: any;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../src/routes/api/sandbox/+server");
    POST = mod.POST;
  });

  it("returns 400 when studioId is missing", async () => {
    const event = mockEvent({ action: "start" });
    const res = await POST(event);
    expect(res.status).toBe(400);
    const body = await parseResponse(res);
    expect(body.error).toContain("Missing studioId");
  });

  it("returns 400 for unknown action", async () => {
    const event = mockEvent({ action: "explode", studioId: "studio-abc" });
    const res = await POST(event);
    expect(res.status).toBe(400);
    const body = await parseResponse(res);
    expect(body.error).toContain("Unknown action");
  });

  it("handles start action", async () => {
    const { ensureSandboxForRuntime } = await import("$lib/server/sandbox");
    (ensureSandboxForRuntime as any).mockResolvedValue({ sandboxId: "sb-new" });

    const event = mockEvent({ action: "start", studioId: "studio-abc" });
    const res = await POST(event);
    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.success).toBe(true);
    expect(body.action).toBe("start");
    expect(ensureSandboxForRuntime).toHaveBeenCalled();
  });

  it("handles stop action", async () => {
    const { disconnectSandbox } = await import("$lib/server/sandbox");
    (disconnectSandbox as any).mockResolvedValue(undefined);

    const event = mockEvent({ action: "stop", studioId: "studio-abc" });
    const res = await POST(event);
    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.success).toBe(true);
    expect(body.action).toBe("stop");
    expect(disconnectSandbox).toHaveBeenCalledWith("user-123", undefined, "studio-abc");
  });

  it("handles refresh action with no active sandbox", async () => {
    const { getConnectedSandbox } = await import("$lib/server/sandbox");
    (getConnectedSandbox as any).mockResolvedValue(null);

    const event = mockEvent({ action: "refresh", studioId: "studio-abc" });
    const res = await POST(event);
    expect(res.status).toBe(404);
    const body = await parseResponse(res);
    expect(body.error).toContain("No active sandbox");
  });

  it("handles refresh action with active sandbox", async () => {
    const { getConnectedSandbox } = await import("$lib/server/sandbox");
    (getConnectedSandbox as any).mockResolvedValue({ sandboxId: "sb-001" });

    const event = mockEvent({ action: "refresh", studioId: "studio-abc" });
    const res = await POST(event);
    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.success).toBe(true);
  });
});

describe("POST /api/internal/runtime-tools", () => {
  let POST: any;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../src/routes/api/internal/runtime-tools/+server");
    POST = mod.POST;
  });

  it("returns 400 when studioId or toolName is missing", async () => {
    const event = mockEvent({ studioId: "studio-abc" });
    const res = await POST(event);
    expect(res.status).toBe(400);
    const body = await parseResponse(res);
    expect(body.error).toContain("Missing");
  });

  it("returns 404 when no active sandbox", async () => {
    const { getConnectedSandbox } = await import("$lib/server/sandbox");
    (getConnectedSandbox as any).mockResolvedValue(null);

    const event = mockEvent({
      studioId: "studio-abc",
      toolName: "runtime_dev_logs",
      input: { pid: 1 },
    });
    const res = await POST(event);
    expect(res.status).toBe(404);
    const body = await parseResponse(res);
    expect(body.error).toContain("No active sandbox");
  });

  it("returns 400 for unknown tool name", async () => {
    const { getConnectedSandbox } = await import("$lib/server/sandbox");
    (getConnectedSandbox as any).mockResolvedValue({ sandboxId: "sb-001" });

    const event = mockEvent({
      studioId: "studio-abc",
      toolName: "runtime_nonexistent",
      input: { pid: 1 },
    });
    const res = await POST(event);
    expect(res.status).toBe(400);
    const body = await parseResponse(res);
    expect(body.error).toContain("Unknown tool");
  });

  it("handles runtime_dev_logs", async () => {
    const { getConnectedSandbox } = await import("$lib/server/sandbox");
    const { getPrimaryForStudio, upsertPrimaryForStudio } =
      await import("$lib/server/surreal-runtime-processes");

    const mockHandle = {
      wait: vi.fn().mockResolvedValue(undefined),
    };
    (getConnectedSandbox as any).mockResolvedValue({
      sandboxId: "sb-001",
      commands: {
        connect: vi.fn().mockResolvedValue(mockHandle),
      },
    });
    (getPrimaryForStudio as any).mockResolvedValue({
      label: "Dev Server",
      command: "bun run dev",
      cwd: ".",
      pid: 42,
      port: 3000,
      previewUrl: "https://example.com",
      status: "running",
    });
    (upsertPrimaryForStudio as any).mockResolvedValue({});

    const event = mockEvent({
      studioId: "studio-abc",
      toolName: "runtime_dev_logs",
      input: { pid: 42 },
    });
    const res = await POST(event);
    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.success).toBe(true);
    expect(body.result.pid).toBe(42);
    expect(upsertPrimaryForStudio).toHaveBeenCalled();
  });

  it("handles runtime_dev_stop", async () => {
    const { getConnectedSandbox } = await import("$lib/server/sandbox");
    const { getPrimaryForStudio, markPrimaryStopped } =
      await import("$lib/server/surreal-runtime-processes");

    (getConnectedSandbox as any).mockResolvedValue({
      sandboxId: "sb-001",
      commands: {
        kill: vi.fn().mockResolvedValue(undefined),
      },
    });
    (getPrimaryForStudio as any).mockResolvedValue({
      pid: 42,
      label: "Dev Server",
    });
    (markPrimaryStopped as any).mockResolvedValue(undefined);

    const event = mockEvent({
      studioId: "studio-abc",
      toolName: "runtime_dev_stop",
      input: { pid: 42 },
    });
    const res = await POST(event);
    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.success).toBe(true);
    expect(body.result.stopped).toBe(true);
    expect(markPrimaryStopped).toHaveBeenCalledWith("user-123", "studio-abc");
  });

  it("returns 404 when no primary process for dev_stop", async () => {
    const { getConnectedSandbox } = await import("$lib/server/sandbox");
    const { getPrimaryForStudio } = await import("$lib/server/surreal-runtime-processes");

    (getConnectedSandbox as any).mockResolvedValue({
      sandboxId: "sb-001",
      commands: {
        kill: vi.fn().mockResolvedValue(undefined),
      },
    });
    (getPrimaryForStudio as any).mockResolvedValue(null);

    const event = mockEvent({
      studioId: "studio-abc",
      toolName: "runtime_dev_stop",
      input: { pid: 99 },
    });
    const res = await POST(event);
    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.success).toBe(true);
    expect(body.result.pid).toBe(99);
  });
});
