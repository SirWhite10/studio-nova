import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("$lib/server/surreal-query", () => ({
  requireUserId: vi.fn().mockReturnValue("user-123"),
}));

vi.mock("$lib/server/app-search", () => ({
  searchAppShell: vi.fn(),
}));

vi.mock("$lib/server/surreal-studio-events", () => ({
  createStudioEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("$lib/server/surreal-studios", () => ({
  updateStudio: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("$lib/server/sidebar-state", () => ({
  normalizeNavigationProfile: vi.fn((profile: any) => ({
    version: profile?.version ?? 1,
    sectionOrder: ["content", "agent", "integrations", "workspace-sandbox"],
    sectionConfigs: {
      agent: { itemOrder: ["memory", "agents", "chats"], collapsed: false },
      "workspace-sandbox": { itemOrder: ["deployments", "sandbox"], collapsed: false },
      integrations: { itemOrder: [], collapsed: false },
      content: { itemOrder: ["media", "files", "collections"], collapsed: false },
    },
  })),
}));

function createGetEvent(search = "") {
  return {
    locals: { userId: "user-123", token: null, session: null },
    url: new URL(`http://localhost/api/test${search}`),
    params: {},
    platform: {},
  } as any;
}

function createPatchEvent(body: unknown, studioId = "studio-123") {
  return {
    locals: { userId: "user-123", token: null, session: null },
    params: { studioId },
    request: new Request("http://localhost/api/test", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    platform: {},
  } as any;
}

describe("GET /api/app/search", () => {
  let GET: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const mod = await import("../src/routes/api/app/search/+server");
    GET = mod.GET;
  });

  it("passes query, studio context, and numeric limit to shell search", async () => {
    const { searchAppShell } = await import("$lib/server/app-search");
    vi.mocked(searchAppShell).mockResolvedValue({
      query: "files",
      results: [
        {
          id: "page:studio-123:files",
          type: "page",
          title: "Files",
          subtitle: "Manage persistent Studio content files",
          href: "/app/studios/studio-123/files",
          section: "Content",
          studioId: "studio-123",
          priority: 17,
        },
      ],
    });

    const response = await GET(createGetEvent("?q=files&studioId=studio-123&limit=7"));
    const body = await response.json();

    expect(searchAppShell).toHaveBeenCalledWith({
      userId: "user-123",
      query: "files",
      selectedStudioId: "studio-123",
      limit: 7,
    });
    expect(body.results).toHaveLength(1);
    expect(body.results[0].section).toBe("Content");
  });

  it("falls back to the default limit when the limit is invalid", async () => {
    const { searchAppShell } = await import("$lib/server/app-search");
    vi.mocked(searchAppShell).mockResolvedValue({
      query: "",
      results: [],
    });

    await GET(createGetEvent("?q=&limit=NaN"));

    expect(searchAppShell).toHaveBeenCalledWith({
      userId: "user-123",
      query: "",
      selectedStudioId: null,
      limit: 12,
    });
  });
});

describe("PATCH /api/studios/[studioId]/navigation", () => {
  let PATCH: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const mod = await import("../src/routes/api/studios/[studioId]/navigation/+server");
    PATCH = mod.PATCH;
  });

  it("normalizes and persists the Studio navigation profile", async () => {
    const { updateStudio } = await import("$lib/server/surreal-studios");
    const { createStudioEvent } = await import("$lib/server/surreal-studio-events");

    const response = await PATCH(
      createPatchEvent({
        version: 2,
        sectionOrder: ["content", "agent", "content", "integrations", "workspace-sandbox"],
        sectionConfigs: {
          content: { itemOrder: ["media", "files", "collections", "files"] },
          agent: { itemOrder: ["memory", "agents", "chats"] },
        },
      }),
    );

    const body = await response.json();

    expect(updateStudio).toHaveBeenCalledWith("user-123", "studio-123", {
      navigationProfile: {
        version: 2,
        sectionOrder: ["content", "agent", "integrations", "workspace-sandbox"],
        sectionConfigs: {
          agent: { itemOrder: ["memory", "agents", "chats"], collapsed: false },
          "workspace-sandbox": { itemOrder: ["deployments", "sandbox"], collapsed: false },
          integrations: { itemOrder: [], collapsed: false },
          content: { itemOrder: ["media", "files", "collections"], collapsed: false },
        },
      },
    });
    expect(createStudioEvent).toHaveBeenCalled();
    expect(body.navigationProfile.sectionConfigs.content.itemOrder).toEqual([
      "media",
      "files",
      "collections",
    ]);
  });
});
