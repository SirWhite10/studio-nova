export interface MemoryEntry {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    type: "conversation" | "tool_use" | "fact";
    chatId?: string;
    timestamp: number;
    sender?: "user" | "assistant";
    tool?: string;
  };
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
}

export interface MemoryConfig {
  dimensions: number;
  maxEntries?: number;
  similarityThreshold?: number;
}
