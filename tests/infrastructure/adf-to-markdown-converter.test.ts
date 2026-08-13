import { describe, it, expect } from 'vitest'
import { AdfToMarkdownConverter, type AdfNode } from '../../src/infrastructure/services/adf-to-markdown-converter.js'

const converter = new AdfToMarkdownConverter()

const doc = (content: AdfNode[]): AdfNode => ({ type: 'doc', version: 1, content })

const paragraph = (text: string): AdfNode => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
})

describe('AdfToMarkdownConverter', () => {
  it('converts a paragraph', async () => {
    const md = await converter.convertAdf(doc([paragraph('Hello world')]))
    expect(md).toBe('Hello world')
  })

  it('converts a heading', async () => {
    const md = await converter.convertAdf(
      doc([{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Overview' }] }]),
    )
    expect(md).toBe('## Overview')
  })

  it('converts a bullet list', async () => {
    const md = await converter.convertAdf(
      doc([
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [paragraph('Item one')] },
            { type: 'listItem', content: [paragraph('Item two')] },
          ],
        },
      ]),
    )
    expect(md).toContain('* Item one')
    expect(md).toContain('* Item two')
  })

  it('converts a code block with language', async () => {
    const md = await converter.convertAdf(
      doc([
        {
          type: 'codeBlock',
          attrs: { language: 'typescript' },
          content: [{ type: 'text', text: 'const x: number = 1' }],
        },
      ]),
    )
    expect(md).toContain('typescript')
    expect(md).toContain('const x: number = 1')
    expect(md).toMatch(/^```/)
  })

  it('converts a table', async () => {
    const md = await converter.convertAdf(
      doc([
        {
          type: 'table',
          content: [
            {
              type: 'tableRow',
              content: [
                { type: 'tableHeader', content: [{ type: 'text', text: 'Col A' }] },
                { type: 'tableHeader', content: [{ type: 'text', text: 'Col B' }] },
              ],
            },
            {
              type: 'tableRow',
              content: [
                { type: 'tableCell', content: [{ type: 'text', text: 'A1' }] },
                { type: 'tableCell', content: [{ type: 'text', text: 'B1' }] },
              ],
            },
          ],
        },
      ]),
    )
    expect(md).toContain('|Col A|Col B|')
    expect(md).toContain('|A1|B1|')
  })

  it('converts a status node into a badge', async () => {
    const md = await converter.convertAdf(
      doc([{ type: 'paragraph', content: [{ type: 'status', attrs: { text: 'In Progress', color: 'blue' } }] }]),
    )
    expect(md).toBe('[Status: In Progress]')
  })

  it('converts a mention node into mention text', async () => {
    const md = await converter.convertAdf(
      doc([{ type: 'paragraph', content: [{ type: 'mention', attrs: { id: '123', text: 'John Doe' } }] }]),
    )
    expect(md).toBe('@John Doe')
  })

  it('throws a clear error on invalid JSON', async () => {
    await expect(converter.convertAdf('{ not valid json')).rejects.toThrow(/Invalid ADF JSON/)
  })

  it('throws a clear error when the document is not ADF', async () => {
    await expect(
      converter.convertAdf(JSON.stringify({ type: 'paragraph', content: [] })),
    ).rejects.toThrow(/Invalid ADF/)
  })
})
