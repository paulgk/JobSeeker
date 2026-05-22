import { NextRequest } from 'next/server'
import { extractPdfText } from '@/lib/pdf'

export const runtime = 'nodejs'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return Response.json(
        { error: 'No file provided', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    if (file.type !== 'application/pdf') {
      return Response.json(
        { error: 'Only PDF files are supported. Please upload a .pdf file.', code: 'INVALID_INPUT' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return Response.json(
        { error: 'File is too large (max 5 MB). Try compressing your PDF or paste your resume text.', code: 'INVALID_INPUT' },
        { status: 413 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const text = await extractPdfText(new Uint8Array(arrayBuffer))
    const trimmed = text.trim()

    if (trimmed.length < 200) {
      return Response.json(
        {
          error: 'Could not extract readable text from this PDF. The file may be scanned, encrypted, or have a complex layout. Please paste your resume text instead.',
          code: 'PARSE_FAILED',
        },
        { status: 422 }
      )
    }

    return Response.json({ text: trimmed })
  } catch (err) {
    console.error('[parse-resume] PDF extraction error:', err)
    return Response.json(
      {
        error: 'Failed to read this PDF. Please paste your resume text instead.',
        code: 'PARSE_FAILED',
      },
      { status: 422 }
    )
  }
}
