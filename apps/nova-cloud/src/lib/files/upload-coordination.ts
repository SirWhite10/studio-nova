import { browser } from "$app/environment";

const LOCK_PREFIX = "nova-upload-lock:";
const CHANNEL_NAME = "nova-upload-locks";
const LEASE_DURATION_MS = 15_000;
const HEARTBEAT_INTERVAL_MS = 5_000;

type UploadLease = {
  ownerId: string;
  expiresAt: number;
};

function makeId() {
  return (
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

function readLease(key: string): UploadLease | null {
  const raw = localStorage.getItem(`${LOCK_PREFIX}${key}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as UploadLease;
    if (!parsed?.ownerId || typeof parsed.expiresAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeLease(key: string, lease: UploadLease) {
  localStorage.setItem(`${LOCK_PREFIX}${key}`, JSON.stringify(lease));
}

function removeLease(key: string) {
  localStorage.removeItem(`${LOCK_PREFIX}${key}`);
}

export class UploadLeaseCoordinator {
  readonly ownerId = makeId();
  #heartbeats = new Map<string, number>();
  #channel: BroadcastChannel | null = null;
  #onPotentialAvailability: () => void;
  #storageListener: ((event: StorageEvent) => void) | null = null;

  constructor(onPotentialAvailability: () => void) {
    this.#onPotentialAvailability = onPotentialAvailability;

    if (!browser) return;

    if (typeof BroadcastChannel !== "undefined") {
      this.#channel = new BroadcastChannel(CHANNEL_NAME);
      this.#channel.onmessage = () => {
        this.#onPotentialAvailability();
      };
    }

    this.#storageListener = (event: StorageEvent) => {
      if (!event.key?.startsWith(LOCK_PREFIX)) return;
      this.#onPotentialAvailability();
    };
    window.addEventListener("storage", this.#storageListener);
    window.addEventListener("beforeunload", this.releaseAll);
    window.addEventListener("pagehide", this.releaseAll);
  }

  tryAcquire = (key: string) => {
    if (!browser) return true;

    const now = Date.now();
    const current = readLease(key);
    if (current && current.ownerId !== this.ownerId && current.expiresAt > now) {
      return false;
    }

    const lease: UploadLease = {
      ownerId: this.ownerId,
      expiresAt: now + LEASE_DURATION_MS,
    };
    writeLease(key, lease);

    const confirmed = readLease(key);
    if (!confirmed || confirmed.ownerId !== this.ownerId) {
      return false;
    }

    this.#startHeartbeat(key);
    this.#channel?.postMessage({ type: "lease-acquired", key, ownerId: this.ownerId });
    return true;
  };

  release = (key: string) => {
    if (!browser) return;

    const heartbeat = this.#heartbeats.get(key);
    if (heartbeat) {
      window.clearInterval(heartbeat);
      this.#heartbeats.delete(key);
    }

    const current = readLease(key);
    if (current?.ownerId === this.ownerId) {
      removeLease(key);
    }

    this.#channel?.postMessage({ type: "lease-released", key, ownerId: this.ownerId });
  };

  releaseAll = () => {
    for (const key of this.#heartbeats.keys()) {
      this.release(key);
    }
  };

  destroy = () => {
    if (!browser) return;

    this.releaseAll();
    if (this.#storageListener) {
      window.removeEventListener("storage", this.#storageListener);
      this.#storageListener = null;
    }
    window.removeEventListener("beforeunload", this.releaseAll);
    window.removeEventListener("pagehide", this.releaseAll);
    this.#channel?.close();
    this.#channel = null;
  };

  #startHeartbeat(key: string) {
    if (this.#heartbeats.has(key)) return;

    const intervalId = window.setInterval(() => {
      const current = readLease(key);
      if (current?.ownerId !== this.ownerId) {
        this.release(key);
        return;
      }

      writeLease(key, {
        ownerId: this.ownerId,
        expiresAt: Date.now() + LEASE_DURATION_MS,
      });
    }, HEARTBEAT_INTERVAL_MS);

    this.#heartbeats.set(key, intervalId);
  }
}

export const uploadLeaseTimings = {
  leaseDurationMs: LEASE_DURATION_MS,
  heartbeatIntervalMs: HEARTBEAT_INTERVAL_MS,
};
