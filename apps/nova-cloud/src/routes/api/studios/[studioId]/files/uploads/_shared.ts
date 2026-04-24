import type { RequestEvent } from "@sveltejs/kit";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import { listFiles } from "$lib/server/r2-files";
import { requireUserId } from "$lib/server/surreal-query";

export const DEFAULT_UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024;

export function normalizePath(path = "") {
  return path.replace(/^\/+|\/+$/g, "");
}

export function validateUploadFileName(fileName: unknown) {
  if (typeof fileName !== "string") {
    throw new Error("File name is required");
  }

  const trimmed = fileName.trim();
  if (!trimmed) throw new Error("File name is required");
  if (trimmed.includes("/")) throw new Error("File name cannot contain '/'");
  if (trimmed === "." || trimmed === "..") throw new Error("Invalid file name");
  return trimmed;
}

export function buildUploadPath(parentPath: string, fileName: string) {
  const normalizedParentPath = normalizePath(parentPath);
  return normalizedParentPath ? `${normalizedParentPath}/${fileName}` : fileName;
}

export async function resolveUploadTarget(event: RequestEvent, path?: string) {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId!);
  const normalizedPath = normalizePath(path ?? "");
  return { userId, studioId, normalizedPath };
}

export async function ensureUploadPathAvailable(input: {
  event: RequestEvent;
  userId: string;
  studioId: string;
  folderPath?: string;
  fileName: string;
}) {
  const folderPath = normalizePath(input.folderPath ?? "");
  const entries = await listFiles(
    input.event,
    input.userId,
    input.studioId,
    folderPath || undefined,
  );
  if (entries.some((entry) => entry.name === input.fileName)) {
    throw new Error("A file or folder with that name already exists");
  }
}
