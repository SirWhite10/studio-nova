import { browser } from "$app/environment";
import { getContext, setContext } from "svelte";
import { toast } from "svelte-sonner";
import { UploadLeaseCoordinator, uploadLeaseTimings } from "./upload-coordination";
import {
  deletePersistedUploadRecord,
  listPersistedUploads,
  persistUploadRecord,
} from "./upload-persistence";

export type FileUploadStatus = "queued" | "uploading" | "completed" | "failed";

export type FileUploadItem = {
  id: string;
  batchId: string;
  studioId: string;
  path: string;
  name: string;
  totalBytes: number;
  uploadedBytes: number;
  status: FileUploadStatus;
  error: string | null;
  uploadId: string | null;
  chunkSize: number | null;
  contentType: string;
  lastModified: number;
};

export type FileUploadBatch = {
  id: string;
  studioId: string;
  path: string;
  items: FileUploadItem[];
};

type StartUploadBatchArgs = {
  studioId: string;
  path?: string;
  files: File[];
};

type UploadSessionResponse = {
  uploadId: string;
  path: string;
  fileName: string;
  size: number;
  chunkSize: number;
  status: string;
  completedBytes: number;
  completedParts: Array<{ partNumber: number; etag: string }>;
};

function normalizePath(path = "") {
  return path.replace(/^\/+|\/+$/g, "");
}

function targetKey(studioId: string, path = "") {
  return `${studioId}:${normalizePath(path)}`;
}

function pluralize(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function makeId() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export class FileUploadManager {
  batches = $state<FileUploadBatch[]>([]);
  refreshSignals = $state<Record<string, number>>({});

  #files = new Map<string, File>();
  #activeRequests = new Map<string, XMLHttpRequest>();
  #activeBatchRuns = new Set<string>();
  #cancelledBatchIds = new Set<string>();
  #hydratePromise: Promise<void> | null = null;
  #retryTimers = new Map<string, number>();
  #leaseCoordinator: UploadLeaseCoordinator | null = null;

  get items() {
    return this.batches.flatMap((batch) => batch.items);
  }

  get isActive() {
    return this.items.length > 0;
  }

  get totalCount() {
    return this.items.length;
  }

  get completedCount() {
    return this.items.filter((item) => item.status === "completed").length;
  }

  get totalBytes() {
    return this.items.reduce((sum, item) => sum + item.totalBytes, 0);
  }

  get uploadedBytes() {
    return this.items.reduce((sum, item) => sum + item.uploadedBytes, 0);
  }

  get progressPercent() {
    if (!this.totalBytes) return 0;
    return Math.min(100, Math.round((this.uploadedBytes / this.totalBytes) * 100));
  }

  getRefreshToken(studioId: string, path = "") {
    return this.refreshSignals[targetKey(studioId, path)] ?? 0;
  }

  constructor() {
    if (browser) {
      this.#leaseCoordinator = new UploadLeaseCoordinator(() => {
        this.#schedulePendingBatchRetries(0);
      });
      void this.hydrate();
    }
  }

  hydrate() {
    if (!browser) return Promise.resolve();
    if (this.#hydratePromise) return this.#hydratePromise;

    this.#hydratePromise = (async () => {
      const records = await listPersistedUploads();
      if (records.length === 0) return;

      const hydratedItems = records.map((record) => {
        const file = new File([record.fileBlob], record.name, {
          type: record.contentType || record.fileBlob.type || "application/octet-stream",
          lastModified: record.lastModified,
        });
        this.#files.set(record.id, file);
        return {
          id: record.id,
          batchId: record.batchId,
          studioId: record.studioId,
          path: record.path,
          name: record.name,
          totalBytes: record.totalBytes,
          uploadedBytes: record.uploadedBytes,
          status:
            record.status === "completed"
              ? "completed"
              : record.status === "failed"
                ? "failed"
                : "queued",
          error: record.error,
          uploadId: record.uploadId,
          chunkSize: record.chunkSize,
          contentType: record.contentType,
          lastModified: record.lastModified,
        } satisfies FileUploadItem;
      });

      const existingIds = new Set(this.items.map((item) => item.id));
      const itemsToAdd = hydratedItems.filter((item) => !existingIds.has(item.id));
      if (itemsToAdd.length === 0) return;

      const grouped = new Map<string, FileUploadBatch>();
      for (const item of itemsToAdd) {
        const batch = grouped.get(item.batchId);
        if (batch) {
          batch.items.push(item);
          continue;
        }

        grouped.set(item.batchId, {
          id: item.batchId,
          studioId: item.studioId,
          path: item.path,
          items: [item],
        });
      }

      this.batches = [...this.batches, ...grouped.values()];
      for (const batch of grouped.values()) {
        if (batch.items.some((item) => item.status === "queued" || item.status === "uploading")) {
          void this.#runBatch(batch.id);
        }
      }
    })();

    return this.#hydratePromise.finally(() => {
      this.#hydratePromise = null;
    });
  }

  startUploadBatch({ studioId, path = "", files }: StartUploadBatchArgs) {
    if (files.length === 0) return;

    const normalizedPath = normalizePath(path);
    const batchId = makeId();
    const batch: FileUploadBatch = {
      id: batchId,
      studioId,
      path: normalizedPath,
      items: files.map((file) => {
        const itemId = makeId();
        this.#files.set(itemId, file);
        return {
          id: itemId,
          batchId,
          studioId,
          path: normalizedPath,
          name: file.name,
          totalBytes: file.size,
          uploadedBytes: 0,
          status: "queued",
          error: null,
          uploadId: null,
          chunkSize: null,
          contentType: file.type || "application/octet-stream",
          lastModified: file.lastModified,
        };
      }),
    };

    this.batches = [...this.batches, batch];
    for (const item of batch.items) {
      const file = this.#files.get(item.id);
      if (!file) continue;
      void this.#persistItem(item, file);
    }
    void this.#runBatch(batchId);
  }

  async cancelBatch(batchId: string) {
    const batch = this.#findBatch(batchId);
    if (!batch) return;

    this.#clearRetry(batchId);
    this.#cancelledBatchIds.add(batchId);
    this.batches = this.batches.filter((currentBatch) => currentBatch.id !== batchId);

    const cleanupTasks: Promise<unknown>[] = [];
    for (const item of batch.items) {
      const xhr = this.#activeRequests.get(item.id);
      if (xhr) {
        xhr.abort();
      }

      if (item.uploadId) {
        cleanupTasks.push(this.#abortUploadSession(item));
      }

      cleanupTasks.push(deletePersistedUploadRecord(item.id));
      this.#files.delete(item.id);
      this.#activeRequests.delete(item.id);
      this.#leaseCoordinator?.release(item.id);
    }

    await Promise.allSettled(cleanupTasks);
    if (!this.#activeBatchRuns.has(batchId)) {
      this.#cancelledBatchIds.delete(batchId);
    }
  }

  async retryBatch(batchId: string) {
    const batch = this.#findBatch(batchId);
    if (!batch) return;

    this.#clearRetry(batchId);

    const failedItems = batch.items.filter((item) => item.status === "failed");
    if (failedItems.length === 0) return;

    for (const item of failedItems) {
      const file = this.#files.get(item.id);
      if (!file) continue;

      item.error = null;
      item.status = "queued";

      if (item.uploadId) {
        try {
          const session = await this.#getUploadSessionStatus(item, item.uploadId);
          if (session.status === "aborted") {
            item.uploadId = null;
            item.chunkSize = null;
            item.uploadedBytes = 0;
          } else if (session.status === "completed") {
            item.status = "completed";
            item.uploadedBytes = item.totalBytes;
            await deletePersistedUploadRecord(item.id);
            continue;
          } else {
            item.uploadedBytes = Math.min(item.uploadedBytes, item.totalBytes);
          }
        } catch {
          item.uploadId = null;
          item.chunkSize = null;
          item.uploadedBytes = 0;
        }
      }

      await this.#persistItem(item, file);
    }

    void this.#runBatch(batchId);
  }

  async #runBatch(batchId: string) {
    if (this.#activeBatchRuns.has(batchId)) return;
    const batch = this.#findBatch(batchId);
    if (!batch) return;
    this.#activeBatchRuns.add(batchId);
    this.#clearRetry(batchId);

    let hasDeferredItems = false;

    try {
      if (this.#cancelledBatchIds.has(batchId)) {
        return;
      }

      for (const item of batch.items) {
        if (this.#cancelledBatchIds.has(batchId)) {
          return;
        }

        if (item.status === "completed") {
          continue;
        }

        const leaseKey = item.id;
        if (this.#leaseCoordinator && !this.#leaseCoordinator.tryAcquire(leaseKey)) {
          item.status = "queued";
          hasDeferredItems = true;
          continue;
        }

        try {
          await this.#uploadItem(item);
          if (this.#cancelledBatchIds.has(batchId)) {
            return;
          }
          item.status = "completed";
          item.uploadedBytes = item.totalBytes;
          item.error = null;
          await deletePersistedUploadRecord(item.id);
        } catch (error) {
          if (this.#cancelledBatchIds.has(batchId)) {
            return;
          }
          item.status = "failed";
          item.error = error instanceof Error ? error.message : "Upload failed";
          const file = this.#files.get(item.id);
          if (file) {
            await this.#persistItem(item, file);
          }
        } finally {
          this.#leaseCoordinator?.release(leaseKey);
          this.#activeRequests.delete(item.id);
          if (this.#cancelledBatchIds.has(batchId) || item.status === "completed") {
            this.#files.delete(item.id);
          }
        }
      }

      const remainingItems = batch.items.filter(
        (item) => item.status !== "completed" && item.status !== "failed",
      );
      if (remainingItems.length > 0 || hasDeferredItems) {
        this.#scheduleBatchRetry(batchId);
        return;
      }

      const completed = batch.items.filter((item) => item.status === "completed").length;
      const failed = batch.items.filter((item) => item.status === "failed").length;

      if (this.#cancelledBatchIds.has(batchId)) {
        return;
      }

      if (completed > 0) {
        const key = targetKey(batch.studioId, batch.path);
        this.refreshSignals[key] = (this.refreshSignals[key] ?? 0) + 1;
      }

      if (failed === 0) {
        toast.success(`Uploaded ${pluralize(completed, "file")}`);
        this.batches = this.batches.filter((currentBatch) => currentBatch.id !== batchId);
      } else if (completed > 0) {
        toast.error(`Uploaded ${completed}/${batch.items.length} files. ${failed} failed.`);
      } else {
        toast.error(`Failed to upload ${pluralize(failed, "file")}`);
      }
    } finally {
      this.#activeBatchRuns.delete(batchId);
      this.#cancelledBatchIds.delete(batchId);
    }
  }

  async #uploadItem(item: FileUploadItem) {
    const file = this.#files.get(item.id);
    if (!file) {
      throw new Error("Upload file is no longer available");
    }

    item.status = "uploading";
    await this.#persistItem(item, file);

    const session = await this.#resolveUploadSession(item, file);
    item.uploadId = session.uploadId;
    item.chunkSize = session.chunkSize;
    item.uploadedBytes = session.completedBytes;
    await this.#persistItem(item, file);

    const completedPartNumbers = new Set(session.completedParts.map((part) => part.partNumber));
    const totalParts = Math.ceil(file.size / session.chunkSize);
    for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
      if (completedPartNumbers.has(partNumber)) continue;
      const start = (partNumber - 1) * session.chunkSize;
      const end = Math.min(start + session.chunkSize, file.size);
      const chunk = file.slice(start, end);
      await this.#uploadPart(item, session.uploadId, partNumber, chunk, start);
      await this.#persistItem(item, file);
    }

    await this.#completeUploadSession(item, session.uploadId);
    item.uploadedBytes = item.totalBytes;
  }

  async #createUploadSession(item: FileUploadItem, file: File) {
    const res = await fetch(`/api/studios/${item.studioId}/files/uploads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        size: file.size,
        contentType: file.type || "application/octet-stream",
        path: item.path,
      }),
    });

    if (!res.ok) {
      throw new Error(await this.#extractFetchError(res, item.name));
    }

    return (await res.json()) as UploadSessionResponse;
  }

  async #getUploadSessionStatus(item: FileUploadItem, uploadId: string) {
    const res = await fetch(`/api/studios/${item.studioId}/files/uploads/${uploadId}`);
    if (!res.ok) {
      throw new Error(await this.#extractFetchError(res, item.name));
    }
    return (await res.json()) as UploadSessionResponse;
  }

  async #resolveUploadSession(item: FileUploadItem, file: File) {
    if (!item.uploadId) {
      return this.#createUploadSession(item, file);
    }

    const session = await this.#getUploadSessionStatus(item, item.uploadId);
    if (session.status === "completed") {
      return {
        ...session,
        completedBytes: item.totalBytes,
      };
    }
    if (session.status === "aborted") {
      throw new Error(`Upload session was aborted for ${item.name}`);
    }
    return session;
  }

  #uploadPart(
    item: FileUploadItem,
    uploadId: string,
    partNumber: number,
    chunk: Blob,
    completedBytesBeforePart: number,
  ) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      this.#activeRequests.set(item.id, xhr);

      xhr.open(
        "POST",
        `/api/studios/${item.studioId}/files/uploads/${uploadId}/parts/${partNumber}`,
      );
      xhr.responseType = "text";
      xhr.setRequestHeader("Content-Type", "application/octet-stream");

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        item.uploadedBytes = Math.min(completedBytesBeforePart + event.loaded, item.totalBytes);
      };

      xhr.onerror = () => {
        reject(new Error(`Failed to upload ${item.name}`));
      };

      xhr.onabort = () => {
        reject(new Error(`Upload cancelled for ${item.name}`));
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const payload = JSON.parse(xhr.responseText) as { completedBytes?: number };
            item.uploadedBytes = Math.min(
              payload.completedBytes ?? item.uploadedBytes,
              item.totalBytes,
            );
          } catch {
            item.uploadedBytes = Math.min(completedBytesBeforePart + chunk.size, item.totalBytes);
          }
          resolve();
          return;
        }

        reject(new Error(this.#extractXhrError(xhr, item.name)));
      };

      xhr.send(chunk);
    });
  }

  async #completeUploadSession(item: FileUploadItem, uploadId: string) {
    const res = await fetch(`/api/studios/${item.studioId}/files/uploads/${uploadId}/complete`, {
      method: "POST",
    });

    if (!res.ok) {
      throw new Error(await this.#extractFetchError(res, item.name));
    }
  }

  async #abortUploadSession(item: FileUploadItem) {
    if (!item.uploadId) return;

    try {
      await fetch(`/api/studios/${item.studioId}/files/uploads/${item.uploadId}/abort`, {
        method: "POST",
      });
    } catch {
      // Best-effort cleanup. Cancellation should still succeed locally.
    }
  }

  async #extractFetchError(res: Response, fileName: string) {
    const fallback = `Failed to upload ${fileName}`;
    const text = await res.text().catch(() => "");
    if (!text) return fallback;

    try {
      const payload = JSON.parse(text) as { error?: string };
      return payload.error || fallback;
    } catch {
      return fallback;
    }
  }

  async #persistItem(item: FileUploadItem, file: File) {
    if (!browser) return;

    await persistUploadRecord({
      id: item.id,
      batchId: item.batchId,
      studioId: item.studioId,
      path: item.path,
      name: item.name,
      totalBytes: item.totalBytes,
      uploadedBytes: item.uploadedBytes,
      status: item.status,
      error: item.error,
      uploadId: item.uploadId,
      chunkSize: item.chunkSize,
      fileBlob: file,
      contentType: item.contentType,
      lastModified: item.lastModified,
    });
  }

  #scheduleBatchRetry(batchId: string, delay = uploadLeaseTimings.heartbeatIntervalMs) {
    if (!browser || this.#retryTimers.has(batchId)) return;

    const timerId = window.setTimeout(() => {
      this.#retryTimers.delete(batchId);
      const batch = this.#findBatch(batchId);
      if (!batch) return;
      void this.#runBatch(batchId);
    }, delay);

    this.#retryTimers.set(batchId, timerId);
  }

  #schedulePendingBatchRetries(delay = uploadLeaseTimings.heartbeatIntervalMs) {
    for (const batch of this.batches) {
      const hasPendingItems = batch.items.some(
        (item) => item.status !== "completed" && item.status !== "failed",
      );
      if (!hasPendingItems) continue;
      this.#scheduleBatchRetry(batch.id, delay);
    }
  }

  #clearRetry(batchId: string) {
    const timerId = this.#retryTimers.get(batchId);
    if (!timerId) return;
    window.clearTimeout(timerId);
    this.#retryTimers.delete(batchId);
  }

  #extractXhrError(xhr: XMLHttpRequest, fileName: string) {
    if (!xhr.responseText) return `Failed to upload ${fileName}`;

    try {
      const payload = JSON.parse(xhr.responseText) as { error?: string };
      return payload.error || `Failed to upload ${fileName}`;
    } catch {
      return `Failed to upload ${fileName}`;
    }
  }

  #findBatch(batchId: string) {
    return this.batches.find((batch) => batch.id === batchId);
  }
}

const FILE_UPLOAD_MANAGER_KEY = Symbol("file-upload-manager");

export function setFileUploadManager() {
  return setContext(FILE_UPLOAD_MANAGER_KEY, new FileUploadManager());
}

export function useFileUploadManager(): FileUploadManager {
  const manager = getContext<FileUploadManager>(FILE_UPLOAD_MANAGER_KEY);
  if (!manager) {
    throw new Error("File upload manager is not available in this layout context");
  }
  return manager;
}
