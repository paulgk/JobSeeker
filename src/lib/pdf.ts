import { extractText, getDocumentProxy } from 'unpdf'

export async function extractPdfText(buffer: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(buffer)
  const { text } = await extractText(pdf, { mergePages: true })
  return text
}
