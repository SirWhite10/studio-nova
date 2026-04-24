import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("$lib/server/surreal-query", () => ({
  requireUserId: vi.fn().mockReturnValue("user-123"),
}));

vi.mock("$lib/server/surreal-records", () => ({
  normalizeRouteParam: vi.fn((id: string) => id),
}));

vi.mock("$lib/server/surreal-upload-sessions", () => ({
  getUploadSessionForUser: vi.fn(),
  markUploadSessionFailed: vi.fn(),
}));

vi.mock("$lib/server/r2-files", () => ({
  uploadMultipartPart: vi.fn(),
}));

function createEvent(request: Request) {
  return {
    locals: { userId: "user-123" },
    params: {
      studioId: "studio-123",
      uploadId: "upload-123",
      partNumber: "2",
    },
    request,
    platform: {},
  } as any;
}

describe("upload part API", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    const { getUploadSessionForUser } = await import("$lib/server/surreal-upload-sessions");
    const { uploadMultipartPart } = await import("$lib/server/r2-files");

    vi.mocked(getUploadSessionForUser).mockResolvedValue({
      status: "uploading",
      size: 16,
      chunkSize: 4,
      completedBytes: 4,
      path: "files/raw-upload.bin",
      multipartUploadId: "upload-123",
    } as any);
    vi.mocked(uploadMultipartPart).mockResolvedValue({ etag: "upload-123:2:4" });
  });

  it("uploads raw binary chunks", async () => {
    const { POST } =
      await import("../src/routes/api/studios/[studioId]/files/uploads/[uploadId]/parts/[partNumber]/+server");
    const { uploadMultipartPart } = await import("$lib/server/r2-files");
    const bytes = new Uint8Array([1, 2, 3, 4]);

    const response = await POST(
      createEvent(
        new Request("http://localhost/api/upload-part", {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: bytes,
        }),
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      uploadId: "upload-123",
      partNumber: 2,
      completedBytes: 8,
      status: "uploading",
    });

    expect(uploadMultipartPart).toHaveBeenCalledTimes(1);
    const uploadedData = vi.mocked(uploadMultipartPart).mock.calls[0]?.[6];
    expect(Array.from(new Uint8Array(uploadedData as ArrayBuffer))).toEqual([1, 2, 3, 4]);
  });

  it("rejects JSON chunk payloads", async () => {
    const { POST } =
      await import("../src/routes/api/studios/[studioId]/files/uploads/[uploadId]/parts/[partNumber]/+server");
    const { uploadMultipartPart } = await import("$lib/server/r2-files");

    const response = await POST(
      createEvent(
        new Request("http://localhost/api/upload-part", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chunkBase64: "AQIDBA==" }),
        }),
      ),
    );

    expect(response.status).toBe(415);
    expect(uploadMultipartPart).not.toHaveBeenCalled();
  });
});
