import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("$lib/server/surreal-studios", () => ({
  getStudioForUser: vi.fn(),
}));

function createEvent(storage: { list: ReturnType<typeof vi.fn>; get?: ReturnType<typeof vi.fn> }) {
  return {
    platform: {
      env: {
        STORAGE: storage,
      },
    },
  } as any;
}

describe("r2-files", () => {
  beforeEach(async () => {
    vi.resetModules();
    const { getStudioForUser } = await import("$lib/server/surreal-studios");
    vi.mocked(getStudioForUser).mockResolvedValue({
      prefix: "studio-prefix/",
    } as any);
  });

  it("lists visible files and folders while hiding markers and internal upload staging", async () => {
    const uploadedAt = new Date("2026-04-20T12:00:00.000Z");
    const storage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          {
            key: "studio-prefix/readme.txt",
            size: 128,
            uploaded: uploadedAt,
          },
          {
            key: "studio-prefix/docs/.nova-folder",
            size: 0,
            uploaded: uploadedAt,
          },
          {
            key: "studio-prefix/.uploads/upload-123/part-1",
            size: 1024,
            uploaded: uploadedAt,
          },
        ],
        delimitedPrefixes: ["studio-prefix/docs/", "studio-prefix/.uploads/upload-123/"],
      }),
    };

    const { listFiles } = await import("../src/lib/server/r2-files");
    const files = await listFiles(createEvent(storage), "user-123", "studio-123");

    expect(storage.list).toHaveBeenCalledWith({
      prefix: "studio-prefix/",
      delimiter: "/",
    });
    expect(files).toEqual([
      {
        key: "readme.txt",
        name: "readme.txt",
        size: 128,
        lastModified: uploadedAt.toISOString(),
        isFolder: false,
      },
      {
        key: "docs/",
        name: "docs",
        size: 0,
        lastModified: "",
        isFolder: true,
      },
    ]);
  });

  it("lists staged multipart parts in numeric order and ignores non-part objects", async () => {
    const storage = {
      list: vi.fn().mockResolvedValue({
        objects: [
          { key: "studio-prefix/.uploads/upload-123/meta.json", size: 64 },
          { key: "studio-prefix/.uploads/upload-123/part-2", size: 8 },
          { key: "studio-prefix/.uploads/upload-123/part-1", size: 8 },
        ],
      }),
    };

    const { listMultipartUploadParts } = await import("../src/lib/server/r2-files");
    const parts = await listMultipartUploadParts(
      createEvent(storage),
      "user-123",
      "studio-123",
      "upload-123",
    );

    expect(storage.list).toHaveBeenCalledWith({
      prefix: "studio-prefix/.uploads/upload-123/",
    });
    expect(parts).toEqual([
      {
        partNumber: 1,
        etag: "upload-123:1:8",
        size: 8,
      },
      {
        partNumber: 2,
        etag: "upload-123:2:8",
        size: 8,
      },
    ]);
  });
});
