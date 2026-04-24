class EmbeddingsGenerator {
  private pipeline: any = null;
  private model = "Xenova/all-MiniLM-L6-v2";

  async initialize(): Promise<void> {
    if (this.pipeline) return;

    try {
      // Dynamically import to avoid sharp initialization errors breaking the server
      const { pipeline, env } = await import("@xenova/transformers");
      env.allowLocalModels = false; // Use remote models to avoid binary dependency issues

      this.pipeline = await pipeline("feature-extraction", this.model, {
        quantized: true,
      });
    } catch (error) {
      console.error("Failed to initialize embeddings generator:", error);
      // Fallback mock pipeline if transformers fails
      this.pipeline = async () => Array(384).fill(0);
    }
  }

  async generate(text: string): Promise<number[]> {
    if (!this.pipeline) {
      await this.initialize();
    }

    const output = await this.pipeline!(text, {
      pooling: "mean",
      normalize: true,
    });

    return Array.from(output);
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    if (!this.pipeline) {
      await this.initialize();
    }

    const outputs = await Promise.all(texts.map((text) => this.generate(text)));

    return outputs;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const embeddingsGenerator = new EmbeddingsGenerator();
