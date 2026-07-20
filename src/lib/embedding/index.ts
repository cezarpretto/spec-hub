import { pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";

let extractor: FeatureExtractionPipeline | null = null;

export async function initEmbedding(): Promise<void> {
  extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  console.log("Embedding model loaded: Xenova/all-MiniLM-L6-v2");
}

export const embeddingService = {
  async generateEmbedding(text: string): Promise<number[]> {
    if (!extractor) {
      throw new Error(
        "Embedding pipeline not initialized. Call initEmbedding() first.",
      );
    }

    const result = await extractor(text, {
      pooling: "mean",
      normalize: true,
    });
    return Array.from(result.data);
  },
};
