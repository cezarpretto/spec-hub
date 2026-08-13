import { describe, it, expect } from 'vitest'
import { HtmlToMarkdownConverter } from '../../src/infrastructure/services/html-to-markdown-converter.js'

const converter = new HtmlToMarkdownConverter()

describe('HtmlToMarkdownConverter', () => {
  it('converts a plain heading to ATX markdown', async () => {
    const md = await converter.convertHtml('<h2>Overview</h2>')
    expect(md).toContain('## Overview')
  })

  it('converts an info callout macro into a blockquote', async () => {
    const html =
      '<ac:structured-macro ac:name="info">' +
      '<ac:rich-text-body><p>Use the standard retry policy</p></ac:rich-text-body>' +
      '</ac:structured-macro>'
    const md = await converter.convertHtml(html)
    expect(md).toContain('> [!INFO]')
    expect(md).toContain('Use the standard retry policy')
  })

  it('converts a code macro into a fenced code block with language', async () => {
    const html =
      '<ac:structured-macro ac:name="code">' +
      '<ac:parameter ac:name="language">javascript</ac:parameter>' +
      '<ac:plain-text-body><![CDATA[const x = 1;\nconsole.log(x);]]></ac:plain-text-body>' +
      '</ac:structured-macro>'
    const md = await converter.convertHtml(html)
    expect(md).toContain('```javascript')
    expect(md).toContain('const x = 1;')
    expect(md).toContain('console.log(x);')
  })

  it('converts an expand macro into a titled blockquote', async () => {
    const html =
      '<ac:structured-macro ac:name="expand">' +
      '<ac:parameter ac:name="title">Details</ac:parameter>' +
      '<ac:rich-text-body><p>Hidden implementation notes</p></ac:rich-text-body>' +
      '</ac:structured-macro>'
    const md = await converter.convertHtml(html)
    expect(md).toContain('> **Details:**')
    expect(md).toContain('Hidden implementation notes')
  })

  it('converts a table to GitHub-flavored markdown', async () => {
    const html =
      '<table><tbody>' +
      '<tr><th>Col A</th><th>Col B</th></tr>' +
      '<tr><td>A1</td><td>B1</td></tr>' +
      '</tbody></table>'
    const md = await converter.convertHtml(html)
    expect(md).toContain('| Col A | Col B |')
    expect(md).toContain('| A1 | B1 |')
  })

  it('converts a status macro into an inline badge', async () => {
    const html =
      '<ac:structured-macro ac:name="status">' +
      '<ac:parameter ac:name="title">In Progress</ac:parameter>' +
      '<ac:parameter ac:name="colour">Blue</ac:parameter>' +
      '</ac:structured-macro>'
    const md = await converter.convertHtml(html)
    expect(md).toContain('[Status: In Progress]')
  })

  it('renders unknown macros as a marker instead of dropping them', async () => {
    const html =
      '<ac:structured-macro ac:name="toc">' +
      '<ac:rich-text-body><p>Table of contents</p></ac:rich-text-body>' +
      '</ac:structured-macro>'
    const md = await converter.convertHtml(html)
    expect(md).toContain('[macro: toc]')
  })

  it('does not throw on malformed or empty input', async () => {
    await expect(converter.convertHtml('<p>unclosed')).resolves.toBeDefined()
    await expect(converter.convertHtml('')).resolves.toBe('')
  })
})
