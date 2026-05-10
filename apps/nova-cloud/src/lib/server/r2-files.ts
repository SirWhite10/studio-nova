import {
  STUDIO_CONTENT_INCLUDED_BYTES,
  type StudioContentAllocationSummary,
} from "$lib/studios/types";
import { getStudioForUser } from "$lib/server/surreal-studios";

export type R2FileEntry = {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  isFolder: boolean;
};

export const FOLDER_MARKER_FILE = ".nova-folder";
const INTERNAL_UPLOAD_PREFIX = ".uploads/";

function getStorageBinding(event: any) {
  const platform = event?.platform?.env;
  return platform?.STORAGE ?? null;
}

function normalizeStoragePath(path = "") {
  return path.replace(/^\/+|\/+$/g, "");
}

function formatStorageBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export async function getStudioPrefix(userId: string, studioId: string): Promise<string | null> {
  const studio = await getStudioForUser(userId, studioId);
  return studio?.prefix ?? null;
}

export async function listFiles(
  event: any,
  userId: string,
  studioId: string,
  path?: string,
): Promise<R2FileEntry[]> {
  const storage = getStorageBinding(event);
  if (!storage) throw new Error("object storage not available");

  const prefix = await getStudioPrefix(userId, studioId);
  if (!prefix) throw new Error("Studio prefix not found");

  const listPrefix = path ? `${prefix}${path}` : prefix;

  const listed = await storage.list({ prefix: listPrefix, delimiter: "/" });

  const files: R2FileEntry[] = [];
  const objects = Array.isArray(listed.objects) ? listed.objects : [];
  const folderPrefixes = Array.isArray(
    (listed as { delimitedPrefixes?: unknown[] }).delimitedPrefixes,
  )
    ? ((listed as { delimitedPrefixes: string[] }).delimitedPrefixes ?? [])
    : Array.isArray((listed as { delimiters?: unknown[] }).delimiters)
      ? ((listed as { delimiters: string[] }).delimiters ?? [])
      : [];

  for (const obj of objects) {
    const relativeKey = obj.key.slice(prefix.length);
    if (!relativeKey || relativeKey.endsWith("/")) continue;
    if (relativeKey.startsWith(INTERNAL_UPLOAD_PREFIX)) continue;
    if (relativeKey.split("/").pop() === FOLDER_MARKER_FILE) continue;
    files.push({
      key: relativeKey,
      name: relativeKey.split("/").pop() ?? relativeKey,
      size: obj.size,
      lastModified: obj.uploaded.toISOString(),
      isFolder: false,
    });
  }

  for (const delim of folderPrefixes) {
    const folderPath = delim.slice(prefix.length);
    if (!folderPath) continue;
    if (folderPath.startsWith(INTERNAL_UPLOAD_PREFIX)) continue;
    files.push({
      key: folderPath,
      name: folderPath.replace(/\/$/, "").split("/").pop() ?? folderPath,
      size: 0,
      lastModified: "",
      isFolder: true,
    });
  }

  return files;
}

export async function getStudioStorageSummary(
  event: any,
  userId: string,
  studioId: string,
): Promise<StudioContentAllocationSummary> {
  const storage = getStorageBinding(event);
  if (!storage) throw new Error("object storage not available");

  const prefix = await getStudioPrefix(userId, studioId);
  if (!prefix) throw new Error("Studio prefix not found");

  let cursor: string | undefined;
  let usedBytes = 0;
  let fileCount = 0;
  let latestUploadAt: string | null = null;
  const folders = new Set<string>();

  do {
    const listed = await storage.list({ prefix, cursor });
    const objects = Array.isArray(listed.objects) ? listed.objects : [];

    for (const object of objects) {
      const relativeKey = object.key.slice(prefix.length);
      if (!relativeKey || relativeKey.startsWith(INTERNAL_UPLOAD_PREFIX)) continue;

      if (relativeKey.split("/").pop() === FOLDER_MARKER_FILE) {
        const folderPath = relativeKey.slice(0, -FOLDER_MARKER_FILE.length).replace(/\/$/, "");
        if (folderPath) folders.add(folderPath);
        continue;
      }

      const parts = relativeKey.split("/").filter(Boolean);
      if (parts.length > 1) {
        let current = "";
        for (const part of parts.slice(0, -1)) {
          current = current ? `${current}/${part}` : part;
          folders.add(current);
        }
      }

      usedBytes += object.size ?? 0;
      fileCount += 1;
      const uploadedAt: string | null =
        object.uploaded instanceof Date ? object.uploaded.toISOString() : latestUploadAt;
      if (uploadedAt && (!latestUploadAt || uploadedAt > latestUploadAt)) {
        latestUploadAt = uploadedAt;
      }
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  const remainingBytes = Math.max(STUDIO_CONTENT_INCLUDED_BYTES - usedBytes, 0);
  const percentUsed = Math.min(
    100,
    Math.round((usedBytes / STUDIO_CONTENT_INCLUDED_BYTES) * 1000) / 10,
  );

  return {
    includedBytes: STUDIO_CONTENT_INCLUDED_BYTES,
    usedBytes,
    remainingBytes,
    displayLabel: `${formatStorageBytes(usedBytes)} of ${formatStorageBytes(STUDIO_CONTENT_INCLUDED_BYTES)} used`,
    usedLabel: formatStorageBytes(usedBytes),
    remainingLabel: formatStorageBytes(remainingBytes),
    percentUsed,
    fileCount,
    folderCount: folders.size,
    latestUploadAt,
  };
}

export async function uploadFile(
  event: any,
  userId: string,
  studioId: string,
  filePath: string,
  data: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const storage = getStorageBinding(event);
  if (!storage) throw new Error("object storage not available");

  const prefix = await getStudioPrefix(userId, studioId);
  if (!prefix) throw new Error("Studio prefix not found");

  const normalizedPath = normalizeStoragePath(filePath);
  const key = `${prefix}${normalizedPath}`.replace(/\/+/g, "/");
  await storage.put(key, data, { httpMetadata: { contentType } });
}

function getChunkStorage(event: any) {
  const storage = getStorageBinding(event);
  if (!storage) throw new Error("object storage not available");
  return storage;
}

function buildChunkPrefix(prefix: string, uploadId: string) {
  return `${prefix}.uploads/${uploadId}/`.replace(/\/+/g, "/");
}

function buildChunkKey(prefix: string, uploadId: string, partNumber: number) {
  return `${buildChunkPrefix(prefix, uploadId)}part-${partNumber}`.replace(/\/+/g, "/");
}

export async function createMultipartUpload(
  event: any,
  userId: string,
  studioId: string,
  filePath: string,
  contentType: string,
  uploadId: string,
): Promise<{ uploadId: string }> {
  const storage = getChunkStorage(event);
  const prefix = await getStudioPrefix(userId, studioId);
  if (!prefix) throw new Error("Studio prefix not found");
  await storage.put(
    `${buildChunkPrefix(prefix, uploadId)}meta.json`,
    JSON.stringify({
      filePath: normalizeStoragePath(filePath),
      contentType: contentType || "application/octet-stream",
      createdAt: Date.now(),
    }),
    { httpMetadata: { contentType: "application/json" } },
  );
  return { uploadId };
}

export async function uploadMultipartPart(
  event: any,
  userId: string,
  studioId: string,
  filePath: string,
  uploadId: string,
  partNumber: number,
  data: ArrayBuffer,
): Promise<{ etag: string }> {
  const storage = getChunkStorage(event);
  const prefix = await getStudioPrefix(userId, studioId);
  if (!prefix) throw new Error("Studio prefix not found");

  const chunkKey = buildChunkKey(prefix, uploadId, partNumber);
  await storage.put(chunkKey, data, {
    httpMetadata: { contentType: "application/octet-stream" },
  });

  return { etag: `${uploadId}:${partNumber}:${data.byteLength}` };
}

export async function listMultipartUploadParts(
  event: any,
  userId: string,
  studioId: string,
  uploadId: string,
): Promise<Array<{ partNumber: number; etag: string; size: number }>> {
  const storage = getChunkStorage(event);
  const prefix = await getStudioPrefix(userId, studioId);
  if (!prefix) throw new Error("Studio prefix not found");

  const listed = await storage.list({ prefix: buildChunkPrefix(prefix, uploadId) });
  const objects = Array.isArray(listed.objects) ? listed.objects : [];

  return objects
    .map((object: { key: string; size: number }) => {
      const match = object.key.match(/part-(\d+)$/);
      if (!match) return null;
      return {
        partNumber: Number.parseInt(match[1]!, 10),
        etag: `${uploadId}:${match[1]}:${object.size}`,
        size: object.size,
      };
    })
    .filter(
      (
        part: { partNumber: number; etag: string; size: number } | null,
      ): part is {
        partNumber: number;
        etag: string;
        size: number;
      } => !!part,
    )
    .sort(
      (
        a: { partNumber: number; etag: string; size: number },
        b: { partNumber: number; etag: string; size: number },
      ) => a.partNumber - b.partNumber,
    );
}

export async function completeMultipartUpload(
  event: any,
  userId: string,
  studioId: string,
  filePath: string,
  uploadId: string,
  parts: Array<{ partNumber: number; etag: string }>,
): Promise<void> {
  const storage = getChunkStorage(event);
  const prefix = await getStudioPrefix(userId, studioId);
  if (!prefix) throw new Error("Studio prefix not found");

  const normalizedPath = normalizeStoragePath(filePath);
  const key = `${prefix}${normalizedPath}`.replace(/\/+/g, "/");
  const orderedParts = [...parts].sort((a, b) => a.partNumber - b.partNumber);
  const buffers: Uint8Array[] = [];
  let totalBytes = 0;

  for (const part of orderedParts) {
    const chunk = await storage.get(buildChunkKey(prefix, uploadId, part.partNumber));
    if (!chunk) {
      throw new Error(`Missing chunk for part ${part.partNumber}`);
    }
    const buffer = new Uint8Array(await chunk.arrayBuffer());
    buffers.push(buffer);
    totalBytes += buffer.byteLength;
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const buffer of buffers) {
    combined.set(buffer, offset);
    offset += buffer.byteLength;
  }

  await storage.put(key, combined, {
    httpMetadata: { contentType: "application/octet-stream" },
  });

  const chunkPrefix = buildChunkPrefix(prefix, uploadId);
  const listed = await storage.list({ prefix: chunkPrefix });
  const objects = Array.isArray(listed.objects) ? listed.objects : [];
  for (const object of objects) {
    await storage.delete(object.key);
  }
}

export async function abortMultipartUpload(
  event: any,
  userId: string,
  studioId: string,
  filePath: string,
  uploadId: string,
): Promise<void> {
  const storage = getChunkStorage(event);
  const prefix = await getStudioPrefix(userId, studioId);
  if (!prefix) throw new Error("Studio prefix not found");

  const chunkPrefix = buildChunkPrefix(prefix, uploadId);
  const listed = await storage.list({ prefix: chunkPrefix });
  const objects = Array.isArray(listed.objects) ? listed.objects : [];
  for (const object of objects) {
    await storage.delete(object.key);
  }
}

export async function createFolder(
  event: any,
  userId: string,
  studioId: string,
  folderPath: string,
): Promise<string> {
  const storage = getStorageBinding(event);
  if (!storage) throw new Error("object storage not available");

  const prefix = await getStudioPrefix(userId, studioId);
  if (!prefix) throw new Error("Studio prefix not found");

  const normalizedFolderPath = normalizeStoragePath(folderPath);
  if (!normalizedFolderPath) throw new Error("Folder path is required");

  const key = `${prefix}${normalizedFolderPath}/${FOLDER_MARKER_FILE}`.replace(/\/+/g, "/");
  await storage.put(key, new ArrayBuffer(0), {
    httpMetadata: { contentType: "application/x-nova-folder" },
  });

  return `${normalizedFolderPath}/`;
}

export async function deleteFile(
  event: any,
  userId: string,
  studioId: string,
  filePath: string,
): Promise<void> {
  const storage = getStorageBinding(event);
  if (!storage) throw new Error("object storage not available");

  const prefix = await getStudioPrefix(userId, studioId);
  if (!prefix) throw new Error("Studio prefix not found");

  const normalizedPath = normalizeStoragePath(filePath);
  const key = `${prefix}${normalizedPath}`.replace(/\/+/g, "/");
  await storage.delete(key);
}

export async function deleteFolderRecursive(
  event: any,
  userId: string,
  studioId: string,
  folderPath: string,
): Promise<{ deletedKeys: string[]; deletedFilePaths: string[] }> {
  const storage = getStorageBinding(event);
  if (!storage) throw new Error("object storage not available");

  const prefix = await getStudioPrefix(userId, studioId);
  if (!prefix) throw new Error("Studio prefix not found");

  const normalizedFolderPath = normalizeStoragePath(folderPath);
  if (!normalizedFolderPath) throw new Error("Folder path is required");

  const folderPrefix = `${prefix}${normalizedFolderPath}/`.replace(/\/+/g, "/");
  const deletedKeys: string[] = [];
  let cursor: string | undefined;

  do {
    const listed = await storage.list({ prefix: folderPrefix, cursor });
    const objects = Array.isArray(listed.objects) ? listed.objects : [];

    for (const obj of objects) {
      deletedKeys.push(obj.key);
    }

    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  if (deletedKeys.length === 0) {
    return { deletedKeys: [], deletedFilePaths: [] };
  }

  for (const key of deletedKeys) {
    await storage.delete(key);
  }

  return {
    deletedKeys,
    deletedFilePaths: deletedKeys
      .map((key) => key.slice(prefix.length))
      .filter((relativeKey) => relativeKey.split("/").pop() !== FOLDER_MARKER_FILE),
  };
}

export async function getFile(
  event: any,
  userId: string,
  studioId: string,
  filePath: string,
): Promise<{ body: ReadableStream; contentType: string; size: number } | null> {
  const storage = getStorageBinding(event);
  if (!storage) throw new Error("object storage not available");

  const prefix = await getStudioPrefix(userId, studioId);
  if (!prefix) throw new Error("Studio prefix not found");

  const normalizedPath = normalizeStoragePath(filePath);
  const key = `${prefix}${normalizedPath}`.replace(/\/+/g, "/");
  const obj = await storage.get(key);
  if (!obj) return null;

  return {
    body: obj.body,
    contentType: obj.httpMetadata?.contentType ?? "application/octet-stream",
    size: obj.size,
  };
}

export async function fileExists(
  event: any,
  userId: string,
  studioId: string,
  filePath: string,
): Promise<boolean> {
  const storage = getStorageBinding(event) as {
    head?: (key: string) => Promise<unknown>;
    get: (key: string) => Promise<unknown>;
  } | null;
  if (!storage) throw new Error("object storage not available");

  const prefix = await getStudioPrefix(userId, studioId);
  if (!prefix) throw new Error("Studio prefix not found");

  const normalizedPath = normalizeStoragePath(filePath);
  const key = `${prefix}${normalizedPath}`.replace(/\/+/g, "/");

  if (typeof storage.head === "function") {
    return !!(await storage.head(key));
  }

  return !!(await storage.get(key));
}
