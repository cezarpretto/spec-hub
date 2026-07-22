import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers'
import { SpecModel } from '../src/infrastructure/database/models/index.js'

async function main() {
  console.log('Loading embedding model...')
  const extractor: FeatureExtractionPipeline = await pipeline(
    'feature-extraction',
    'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
  )
  console.log('Model loaded.')

  const specs = await SpecModel.findAll({ raw: true }) as unknown as {
    id: string
    source_type: string
    source_key: string
    title: string
    content: string
  }[]

  console.log(`Found ${specs.length} specs to re-embed.`)

  for (const spec of specs) {
    const result = await extractor(spec.content, { pooling: 'mean', normalize: true })
    const embedding = Array.from(result.data)
    const embeddingStr = `[${embedding.join(',')}]`

    await SpecModel.update({ embedding: embeddingStr }, { where: { id: spec.id } })
    console.log(`  Re-embedded: ${spec.source_type}:${spec.source_key} (${spec.title.slice(0, 50)})`)
  }

  console.log('Done.')
}

main().catch(console.error)
