import type { ContentFormat, IContentConverter } from '../../domain/index.js'
import { HtmlToMarkdownConverter } from './html-to-markdown-converter.js'
import { AdfToMarkdownConverter } from './adf-to-markdown-converter.js'

interface Dependencies {
  htmlToMarkdownConverter: HtmlToMarkdownConverter
  adfToMarkdownConverter: AdfToMarkdownConverter
}

export class ContentConverter implements IContentConverter {
  private readonly htmlToMarkdownConverter: HtmlToMarkdownConverter
  private readonly adfToMarkdownConverter: AdfToMarkdownConverter

  constructor(deps: Dependencies) {
    this.htmlToMarkdownConverter = deps.htmlToMarkdownConverter
    this.adfToMarkdownConverter = deps.adfToMarkdownConverter
  }

  async convert(content: string, format: ContentFormat): Promise<string> {
    switch (format) {
      case 'html':
        return this.htmlToMarkdownConverter.convertHtml(content)
      case 'adf':
        return this.adfToMarkdownConverter.convertAdf(content)
      case 'markdown':
        return content.trimEnd()
    }
  }
}
