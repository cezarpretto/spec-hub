import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers'
import type { IEmbeddingService } from '../../domain/index.js'

export class XenovaEmbeddingService implements IEmbeddingService {
  private extractor: FeatureExtractionPipeline | null = null

  async initialize(): Promise<void> {
    this.extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2')
    console.log('Embedding model loaded: Xenova/paraphrase-multilingual-MiniLM-L12-v2')
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.extractor) {
      throw new Error(
        'Embedding pipeline not initialized. Call initialize() first.',
      )
    }

    const result = await this.extractor(text, {
      pooling: 'mean',
      normalize: true,
    })
    return Array.from(result.data)
  }
}
