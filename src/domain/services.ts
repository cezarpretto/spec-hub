export interface IEmbeddingService {
  generateEmbedding(text: string): Promise<number[]>
}
