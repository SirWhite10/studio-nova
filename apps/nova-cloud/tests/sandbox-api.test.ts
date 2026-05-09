import { describe, it, expect, vi, beforeEach } from "vite-plus/test";

vi.mock("$lib/server/surreal-query", () => ({
  requireUserId: vi.fn().mockReturnValue("user-123"),
}));

vi.mock("$lib/server/surreal-records", () => ({
  normalizeRouteParam: vi.fn((id: string) => id),
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

vi.mock("$lib/server/nova-runtime-control", () => ({
  callRuntimeControl: vi.fn().mockResolvedValue({ ok: true }),
  runtimeControlConfigured: vi.fn().mockReturnValue(true),
  runtimeControlStudioId: vi.fn(
    (userId: string, studioId: string) => `control-${userId}-${studioId}`,
  ),
  stopRuntimeControlPreview: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("$lib/server/runtime-control-state", () => ({
  getStudioRuntimeSnapshot: vi.fn(),
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
    vi.clearAllMocks();
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

  it("returns idle when no runtime exists", async () => {
    const { getStudioRuntimeSnapshot } = await import("$lib/server/runtime-control-state");
    (getStudioRuntimeSnapshot as any).mockResolvedValue({
      runtime: { hasSandbox: false, status: "idle" },
      sandboxLike: null,
      primaryProcess: null,
      artifacts: [],
      controlStudioId: "control-user-123-studio-abc",
      configured: true,
    });

    const event = mockEvent({}, { studioId: "studio-abc" });
    const res = await GET(event);
    const body = await parseResponse(res);
    expect(body.hasSandbox).toBe(false);
    expect(body.status).toBe("idle");
  });

  it("returns active runtime details", async () => {
    const { getStudioRuntimeSnapshot } = await import("$lib/server/runtime-control-state");
    (getStudioRuntimeSnapshot as any).mockResolvedValue({
      runtime: { hasSandbox: true, status: "active" },
      sandboxLike: {
        status: "active",
        sandboxId: "control-user-123-studio-abc",
        lastUsedAt: 1000,
      },
      primaryProcess: null,
      artifacts: [],
      controlStudioId: "control-user-123-studio-abc",
      configured: true,
    });

    const event = mockEvent({}, { studioId: "studio-abc" });
    const res = await GET(event);
    const body = await parseResponse(res);
    expect(body.hasSandbox).toBe(true);
    expect(body.status).toBe("active");
    expect(body.sandboxId).toBe("control-user-123-studio-abc");
  });
});

describe("POST /api/sandbox", () => {
  let POST: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
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
    const { callRuntimeControl } = await import("$lib/server/nova-runtime-control");

    const event = mockEvent({ action: "start", studioId: "studio-abc" });
    const res = await POST(event);
    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.success).toBe(true);
    expect(body.action).toBe("start");
    expect(callRuntimeControl).toHaveBeenCalledWith("control-user-123-studio-abc", {
      action: "start",
      systemPackages: ["git"],
    });
  });

  it("handles stop action", async () => {
    const { callRuntimeControl } = await import("$lib/server/nova-runtime-control");
    const { markPrimaryStopped } = await import("$lib/server/surreal-runtime-processes");
    (markPrimaryStopped as any).mockResolvedValue(undefined);

    const event = mockEvent({ action: "stop", studioId: "studio-abc" });
    const res = await POST(event);
    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.success).toBe(true);
    expect(body.action).toBe("stop");
    expect(callRuntimeControl).toHaveBeenCalledWith("control-user-123-studio-abc", {
      action: "delete",
    });
    expect(markPrimaryStopped).toHaveBeenCalledWith("user-123", "studio-abc");
  });

  it("handles refresh action", async () => {
    const { callRuntimeControl } = await import("$lib/server/nova-runtime-control");

    const event = mockEvent({ action: "refresh", studioId: "studio-abc" });
    const res = await POST(event);
    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.success).toBe(true);
    expect(callRuntimeControl).toHaveBeenCalledWith("control-user-123-studio-abc", {
      action: "status",
    });
  });
});

describe("POST /api/internal/runtime-tools", () => {
  let POST: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
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

  it("handles runtime_dev_logs without a registered primary process when pid is provided", async () => {
    const { getPrimaryForStudio } = await import("$lib/server/surreal-runtime-processes");
    const { getStudioRuntimeSnapshot } = await import("$lib/server/runtime-control-state");
    (getPrimaryForStudio as any).mockResolvedValue(null);
    (getStudioRuntimeSnapshot as any).mockResolvedValue({
      runtime: { status: "active" },
    });
    const event = mockEvent({
      studioId: "studio-abc",
      toolName: "runtime_dev_logs",
      input: { pid: 1 },
    });
    const res = await POST(event);
    expect(res.status).toBe(200);
    const body = await parseResponse(res);
    expect(body.success).toBe(true);
    expect(body.result.pid).toBe(1);
  });

  it("returns 400 for unknown tool name", async () => {
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
    const { getPrimaryForStudio } = await import("$lib/server/surreal-runtime-processes");
    const { getStudioRuntimeSnapshot } = await import("$lib/server/runtime-control-state");

    (getPrimaryForStudio as any).mockResolvedValue({
      label: "Dev Server",
      command: "bun run dev",
      cwd: ".",
      pid: 42,
      port: 3000,
      previewUrl: "https://example.com",
      status: "running",
      logSummary: "server ready",
    });
    (getStudioRuntimeSnapshot as any).mockResolvedValue({
      runtime: { status: "active" },
    });

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
    expect(body.result.stdout).toBe("server ready");
  });

  it("handles runtime_dev_stop", async () => {
    const { getPrimaryForStudio, markPrimaryStopped } =
      await import("$lib/server/surreal-runtime-processes");
    const { stopRuntimeControlPreview } = await import("$lib/server/nova-runtime-control");

    (getPrimaryForStudio as any).mockResolvedValue({
      pid: 42,
      port: 3000,
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
    expect(stopRuntimeControlPreview).toHaveBeenCalledWith("control-user-123-studio-abc", {
      port: 3000,
    });
    expect(markPrimaryStopped).toHaveBeenCalledWith("user-123", "studio-abc");
  });

  it("returns 404 when no primary process for dev_stop", async () => {
    const { getPrimaryForStudio } = await import("$lib/server/surreal-runtime-processes");

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
