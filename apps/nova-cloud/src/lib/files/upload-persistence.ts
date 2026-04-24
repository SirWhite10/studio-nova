import { browser } from "$app/environment";

const DB_NAME = "nova-file-uploads";
const DB_VERSION = 1;
const STORE_NAME = "uploads";

export type PersistedUploadRecord = {
  id: string;
  batchId: string;
  studioId: string;
  path: string;
  name: string;
  totalBytes: number;
  uploadedBytes: number;
  status: string;
  error: string | null;
  uploadId: string | null;
  chunkSize: number | null;
  fileBlob: Blob;
  contentType: string;
  lastModified: number;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function ensureBrowser() {
  if (!browser || typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this environment");
  }
}

function openDatabase() {
  ensureBrowser();
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Failed to open upload database"));
    };
  });

  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void,
) {
  if (!browser) return undefined as T | undefined;

  const db = await openDatabase();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = run(store);

    tx.oncomplete = () => {
      resolve(request?.result);
    };

    tx.onerror = () => {
      reject(tx.error ?? new Error("IndexedDB transaction failed"));
    };

    tx.onabort = () => {
      reject(tx.error ?? new Error("IndexedDB transaction aborted"));
    };
  });
}

export async function listPersistedUploads() {
  const records =
    (await withStore<PersistedUploadRecord[]>("readonly", (store) => store.getAll())) ?? [];
  return records;
}

export async function persistUploadRecord(record: PersistedUploadRecord) {
  await withStore("readwrite", (store) => store.put(record));
}

export async function deletePersistedUploadRecord(id: string) {
  await withStore("readwrite", (store) => store.delete(id));
}
