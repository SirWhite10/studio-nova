import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";
import { markArtifactStatus, upsertArtifact } from "$lib/server/surreal-artifacts";
import { requireUserId } from "$lib/server/surreal-query";
import { normalizeRouteParam } from "$lib/server/surreal-records";
import {
  FOLDER_MARKER_FILE,
  createFolder,
  deleteFolderRecursive,
  deleteFile,
  getFile,
  listFiles,
  uploadFile,
} from "$lib/server/r2-files";

function normalizePath(path = "") {
  return path.replace(/^\/+|\/+$/g, "");
}

function validateFolderName(folderName: unknown) {
  if (typeof folderName !== "string") {
    throw new Error("Folder name is required");
  }

  const trimmed = folderName.trim();
  if (!trimmed) throw new Error("Folder name is required");
  if (trimmed === "." || trimmed === "..") throw new Error("Invalid folder name");
  if (trimmed.includes("/")) throw new Error("Folder name cannot contain '/'");
  if (trimmed === FOLDER_MARKER_FILE) throw new Error("Folder name is reserved");
  return trimmed;
}

export const GET: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId!);
  const path = event.url.searchParams.get("path") ?? undefined;
  const download = event.url.searchParams.get("download");

  if (download) {
    const file = await getFile(event, userId, studioId, download);
    if (!file) {
      return json({ error: "File not found" }, { status: 404 });
    }
    return new Response(file.body, {
      headers: {
        "Content-Type": file.contentType,
        "Content-Length": String(file.size),
        "Content-Disposition": `attachment; filename="${download.split("/").pop()}"`,
      },
    });
  }

  try {
    const files = await listFiles(event, userId, studioId, path);
    return json({ files });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 500 });
  }
};

export const POST: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId!);

  try {
    const contentType = event.request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = (await event.request.json()) as {
        folderName?: string;
        path?: string;
      };
      const folderName = validateFolderName(payload.folderName);
      const parentPath = normalizePath(payload.path ?? "");
      const existingEntries = await listFiles(event, userId, studioId, parentPath || undefined);
      if (existingEntries.some((entry) => entry.name === folderName)) {
        return json({ error: "A file or folder with that name already exists" }, { status: 409 });
      }
      const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
      const createdPath = await createFolder(event, userId, studioId, folderPath);
      return json({ success: true, path: createdPath, folder: true });
    }

    const formData = await event.request.formData();
    const file = formData.get("file") as File | null;
    const folderPath = normalizePath((formData.get("path") as string) || "");

    if (!file) {
      return json({ error: "No file provided" }, { status: 400 });
    }
    if (file.name === FOLDER_MARKER_FILE) {
      return json({ error: "This file name is reserved" }, { status: 400 });
    }

    const filePath = folderPath ? `${folderPath}/${file.name}` : file.name;
    const buffer = await file.arrayBuffer();
    await uploadFile(event, userId, studioId, filePath, buffer, file.type);
    await upsertArtifact({
      userId,
      studioId,
      kind: "file",
      key: filePath,
      title: file.name,
      path: filePath,
      contentType: file.type || null,
      size: file.size,
      source: "r2-upload",
      metadata: {
        folderPath: folderPath || null,
      },
    });

    return json({ success: true, path: filePath });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async (event) => {
  const userId = requireUserId(event.locals);
  const studioId = normalizeRouteParam(event.params.studioId!);

  try {
    const { path, isFolder }: { path?: string; isFolder?: boolean } = await event.request.json();
    if (!path) {
      return json({ error: "No file path provided" }, { status: 400 });
    }

    if (isFolder) {
      const { deletedFilePaths } = await deleteFolderRecursive(event, userId, studioId, path);

      for (const deletedPath of deletedFilePaths) {
        await markArtifactStatus({
          userId,
          studioId,
          kind: "file",
          key: deletedPath,
          status: "deleted",
          metadata: { deletedAt: Date.now(), deletedFromFolder: normalizePath(path) },
        });
      }

      return json({
        success: true,
        folder: true,
        deletedFiles: deletedFilePaths.length,
      });
    }

    const normalizedPath = normalizePath(path);
    await deleteFile(event, userId, studioId, normalizedPath);
    await markArtifactStatus({
      userId,
      studioId,
      kind: "file",
      key: normalizedPath,
      status: "deleted",
      metadata: { deletedAt: Date.now() },
    });
    return json({ success: true, folder: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, { status: 500 });
  }
};
