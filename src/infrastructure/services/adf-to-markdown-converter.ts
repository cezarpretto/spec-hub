import adfToMd from 'adf-to-md'

type AdfNode = {
  type: string
  version?: number
  content?: AdfNode[]
  attrs?: Record<string, unknown>
  text?: string
}

export type { AdfNode }

function normalizeAdf(node: AdfNode): void {
  if (node.type === 'mention') {
    const label = node.attrs?.text ?? node.attrs?.id ?? 'mention'
    node.type = 'text'
    node.text = `@${String(label)}`
    node.content = undefined
    return
  }
  if (node.type === 'status') {
    const label = node.attrs?.text ?? 'status'
    node.type = 'text'
    node.text = `[Status: ${String(label)}]`
    node.content = undefined
    return
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      normalizeAdf(child)
    }
  }
}

export class AdfToMarkdownConverter {
  async convertAdf(adfJson: string | AdfNode): Promise<string> {
    let doc: AdfNode
    if (typeof adfJson === 'string') {
      try {
        doc = JSON.parse(adfJson) as AdfNode
      } catch (error) {
        throw new Error(`Invalid ADF JSON: ${(error as Error).message}`)
      }
    } else {
      doc = adfJson
    }
    if (!doc || typeof doc !== 'object' || doc.type !== 'doc') {
      throw new Error('Invalid ADF: expected a document with type "doc"')
    }
    if (doc.version !== 1) {
      throw new Error('Invalid ADF: expected version 1')
    }
    normalizeAdf(doc)
    const { result } = adfToMd.convert(doc)
    return result.trim()
  }
}
