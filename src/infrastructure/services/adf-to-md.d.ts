declare module 'adf-to-md' {
  export interface AdfNode {
    type: string
    version?: number
    content?: AdfNode[]
    attrs?: Record<string, unknown>
    text?: string
  }

  interface AdfToMdResult {
    result: string
    warnings: Set<string>
  }

  const adfToMd: {
    convert(adf: AdfNode): AdfToMdResult
    validate(adf: AdfNode): void
  }

  export default adfToMd
}
