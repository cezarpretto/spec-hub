export interface IEmbeddingService {
  generateEmbedding(text: string): Promise<number[]>
}

export type ContentFormat = 'html' | 'adf' | 'markdown'

export interface IContentConverter {
  convert(content: string, format: ContentFormat): Promise<string>
}
