import { existsSync } from "fs";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import type { MemoryEntry, MemorySearchResult, MemoryConfig } from "./types";
import { embeddingsGenerator } from "./embeddings";

const DEFAULT_CONFIG: MemoryConfig = {
  dimensions: 384,
  maxEntries: 10000,
  similarityThreshold: 0.3,
};

export class MemoryStore {
  private entries: MemoryEntry[] = [];
  private config: MemoryConfig;
  private dataPath: string;

  constructor(dataDir: string = "./data", config: Partial<MemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dataPath = join(dataDir, "memory.json");
  }

  async initialize(): Promise<void> {
    await this.load();

    await embeddingsGenerator.initialize();
  }

  async loadEntries(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    try {
      if (existsSync(this.dataPath)) {
        const data = await readFile(this.dataPath, "utf-8");
        this.entries = JSON.parse(data);
        console.log(`Loaded ${this.entries.length} memory entries`);
      } else {
        this.entries = [];
      }
    } catch (error) {
      console.error("Failed to load memory:", error);
      this.entries = [];
    }
  }

  private async save(): Promise<void> {
    try {
      const dir = join(this.dataPath, "..");
      await mkdir(dir, { recursive: true });
      await writeFile(this.dataPath, JSON.stringify(this.entries, null, 2));
    } catch (error) {
      console.error("Failed to save memory:", error);
    }
  }

  async add(
    content: string,
    metadata: Omit<MemoryEntry["metadata"], "timestamp"> & { timestamp?: number },
  ): Promise<string> {
    const embedding = await embeddingsGenerator.generate(content);

    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      content,
      embedding,
      metadata: {
        ...metadata,
        timestamp: metadata.timestamp ?? Date.now(),
      },
    };

    this.entries.push(entry);

    // Enforce max entries limit (remove oldest if exceeded)
    if (this.entries.length > (this.config.maxEntries ?? 10000)) {
      this.entries.sort((a, b) => a.metadata.timestamp - b.metadata.timestamp);
      this.entries = this.entries.slice(-(this.config.maxEntries ?? 10000));
    }

    await this.save();

    return entry.id;
  }

  async search(
    query: string,
    limit: number = 5,
    threshold?: number,
  ): Promise<MemorySearchResult[]> {
    if (this.entries.length === 0) {
      return [];
    }

    const queryEmbedding = await embeddingsGenerator.generate(query);
    const results: MemorySearchResult[] = [];

    for (const entry of this.entries) {
      const score = embeddingsGenerator.cosineSimilarity(queryEmbedding, entry.embedding);
      if (score >= (threshold ?? this.config.similarityThreshold ?? 0.3)) {
        results.push({ entry, score });
      }
    }

    // Sort by similarity score (highest first)
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  async getByChatId(chatId: string): Promise<MemoryEntry[]> {
    return this.entries.filter((entry) => entry.metadata.chatId === chatId);
  }

  getByChatIdSync(chatId: string): MemoryEntry[] {
    return this.entries.filter((entry) => entry.metadata.chatId === chatId);
  }

  async delete(id: string): Promise<boolean> {
    const index = this.entries.findIndex((entry) => entry.id === id);
    if (index === -1) return false;

    this.entries.splice(index, 1);
    await this.save();
    return true;
  }

  async clear(): Promise<void> {
    this.entries = [];
    await this.save();
  }

  getCount(): number {
    return this.entries.length;
  }
}

let globalMemoryStore: MemoryStore | null = null;

export function getMemoryStore(dataDir?: string): MemoryStore {
  if (!globalMemoryStore) {
    globalMemoryStore = new MemoryStore(dataDir);
  }

  return globalMemoryStore;
}
