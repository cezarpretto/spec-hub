import { describe, it, expect, vi } from 'vitest'
import { ContentConverter } from '../../src/infrastructure/services/content-converter.js'

function buildConverter() {
  const htmlConverter = { convertHtml: vi.fn() }
  const adfConverter = { convertAdf: vi.fn() }
  const converter = new ContentConverter({
    htmlToMarkdownConverter: htmlConverter as never,
    adfToMarkdownConverter: adfConverter as never,
  })
  return { converter, htmlConverter, adfConverter }
}

describe('ContentConverter', () => {
  it('routes html format to the HTML converter', async () => {
    const { converter, htmlConverter, adfConverter } = buildConverter()
    htmlConverter.convertHtml.mockResolvedValue('# converted')
    const result = await converter.convert('<h1>Hi</h1>', 'html')
    expect(htmlConverter.convertHtml).toHaveBeenCalledWith('<h1>Hi</h1>')
    expect(adfConverter.convertAdf).not.toHaveBeenCalled()
    expect(result).toBe('# converted')
  })

  it('routes adf format to the ADF converter', async () => {
    const { converter, htmlConverter, adfConverter } = buildConverter()
    adfConverter.convertAdf.mockResolvedValue('## Converted')
    const adf = JSON.stringify({ type: 'doc', version: 1, content: [] })
    const result = await converter.convert(adf, 'adf')
    expect(adfConverter.convertAdf).toHaveBeenCalledWith(adf)
    expect(htmlConverter.convertHtml).not.toHaveBeenCalled()
    expect(result).toBe('## Converted')
  })

  it('passes markdown through with trailing whitespace trimmed', async () => {
    const { converter, htmlConverter, adfConverter } = buildConverter()
    const result = await converter.convert('# Heading\n\n', 'markdown')
    expect(result).toBe('# Heading')
    expect(htmlConverter.convertHtml).not.toHaveBeenCalled()
    expect(adfConverter.convertAdf).not.toHaveBeenCalled()
  })
})
