import TurndownService from 'turndown'
import sanitizeHtml from 'sanitize-html'

const allowedTags = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  'span', 'div', 'sub', 'sup', 'mark',
  'ac:structured-macro', 'ac:parameter', 'ac:rich-text-body', 'ac:plain-text-body',
  'ac:link', 'ac:link-body', 'ac:plain-text-link-body', 'ac:image',
  'ri:attachment', 'ri:user', 'ri:page', 'ri:emoji', 'ri:date',
]

const allowedAttributes = {
  'ac:structured-macro': ['ac:name', 'ac:macro-id', 'ac:macro-parameter-id'],
  'ac:parameter': ['ac:name'],
  'ac:link': ['ac:card-appearance'],
  'ri:attachment': ['ri:filename'],
  'ri:user': ['ri:userkey', 'ri:username'],
  'ri:page': ['ri:content-title', 'ri:space-key', 'ri:version-at-save'],
  'ri:emoji': ['ri:emoji-short-name'],
  a: ['href', 'title'],
  img: ['src', 'alt', 'title'],
  '*': ['class'],
}

const calloutMacros = ['info', 'note', 'warning', 'tip']

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function normalizeCodeMacros(html: string): string {
  return html.replace(
    /<ac:plain-text-body\b[^>]*>([\s\S]*?)<\/ac:plain-text-body>/gi,
    (_match, body: string) => {
      const cdata = body.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/)
      const text = cdata ? cdata[1] : body
      return `<pre>${escapeHtml(text)}</pre>`
    },
  )
}

function findParameterText(node: Element, name: string): string | null {
  for (const child of Array.from(node.childNodes)) {
    if (
      child.nodeType === 1 &&
      (child as Element).nodeName.toLowerCase() === 'ac:parameter' &&
      (child as Element).getAttribute('ac:name') === name
    ) {
      return (child as Element).textContent?.trim() ?? null
    }
  }
  return null
}

function findChild(node: Element, tagName: string): Element | null {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 1 && (child as Element).nodeName.toLowerCase() === tagName) {
      return child as Element
    }
  }
  return null
}

function quoteBlock(prefix: string, body: string): string {
  const lines = body.split('\n').map((line) => (line.trim() ? `> ${line}` : '>'))
  return `\n\n${prefix}\n${lines.join('\n')}\n\n`
}

export class HtmlToMarkdownConverter {
  private readonly turndown: TurndownService

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
      emDelimiter: '_',
    })
    this.registerConfluenceRules()
  }

  async convertHtml(html: string): Promise<string> {
    if (typeof html !== 'string') {
      throw new TypeError('convertHtml expects an HTML string')
    }
    const normalized = normalizeCodeMacros(html)
    const sanitized = sanitizeHtml(normalized, { allowedTags, allowedAttributes })
    try {
      return this.turndown.turndown(sanitized)
    } catch {
      return this.turndown.turndown(html)
    }
  }

  private registerConfluenceRules(): void {
    this.turndown.addRule('confluenceUnknownMacro', {
      filter: (node) => node.nodeName === 'AC:STRUCTURED-MACRO',
      replacement: (_content, node) =>
        `\n\n[macro: ${node.getAttribute('ac:name') ?? 'unknown'}]\n\n`,
    })

    this.turndown.addRule('confluenceParameter', {
      filter: (node) => node.nodeName === 'AC:PARAMETER',
      replacement: () => '',
    })

    this.turndown.addRule('confluenceStatus', {
      filter: (node) =>
        node.nodeName === 'AC:STRUCTURED-MACRO' && node.getAttribute('ac:name') === 'status',
      replacement: (_content, node) => {
        const label = findParameterText(node, 'title') ?? 'status'
        return `[Status: ${label}]`
      },
    })

    this.turndown.addRule('confluencePanel', {
      filter: (node) =>
        node.nodeName === 'AC:STRUCTURED-MACRO' && node.getAttribute('ac:name') === 'panel',
      replacement: (content, node) => {
        const title = findParameterText(node, 'title') ?? 'Panel'
        return quoteBlock(`> **${title}:**`, content.trim())
      },
    })

    this.turndown.addRule('confluenceExpand', {
      filter: (node) =>
        node.nodeName === 'AC:STRUCTURED-MACRO' && node.getAttribute('ac:name') === 'expand',
      replacement: (content, node) => {
        const title = findParameterText(node, 'title') ?? 'Expand'
        return quoteBlock(`> **${title}:**`, content.trim())
      },
    })

    this.turndown.addRule('confluenceCallout', {
      filter: (node) =>
        node.nodeName === 'AC:STRUCTURED-MACRO' &&
        calloutMacros.includes(node.getAttribute('ac:name') ?? ''),
      replacement: (content, node) => {
        const type = (node.getAttribute('ac:name') ?? 'note').toUpperCase()
        return quoteBlock(`> [!${type}]`, content.trim())
      },
    })

    this.turndown.addRule('confluenceCode', {
      filter: (node) =>
        node.nodeName === 'AC:STRUCTURED-MACRO' && node.getAttribute('ac:name') === 'code',
      replacement: (_content, node) => {
        const language = findParameterText(node, 'language') ?? ''
        const code = findChild(node, 'pre')?.textContent ?? ''
        return `\n\n\`\`\`${language}\n${code.replace(/\n$/, '')}\n\`\`\`\n\n`
      },
    })

    this.turndown.addRule('confluenceTable', {
      filter: 'table',
      replacement: (_content, node) => {
        const el = node as Element
        const rows = Array.from(el.querySelectorAll('tr')).map((tr) =>
          Array.from(tr.children).map((cell) =>
            (cell.textContent ?? '').trim().replace(/\|/g, '\\|'),
          ),
        )
        if (rows.length === 0) return ''
        const header = rows[0]
        const headerRow = `| ${header.join(' | ')} |`
        const separatorRow = `| ${header.map(() => '---').join(' | ')} |`
        const bodyRows = rows.slice(1).map((row) => `| ${row.join(' | ')} |`)
        return `\n\n${[headerRow, separatorRow, ...bodyRows].join('\n')}\n\n`
      },
    })
  }
}
