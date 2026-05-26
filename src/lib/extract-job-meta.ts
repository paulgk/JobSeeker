import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic() // reads ANTHROPIC_API_KEY from env

const EXTRACT_SYSTEM = `You are a parser. Given a job description, return ONLY valid JSON with two keys:
- "jobTitle": the exact job title as written in the job description (e.g. "Senior Software Engineer")
- "company": the company name as written in the job description (e.g. "Acme Corp")
If you cannot determine a value, use "Unknown". Return nothing else — no markdown, no explanation.`

export async function extractJobMeta(
  jdText: string
): Promise<{ jobTitle: string; company: string }> {
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 64,
      system: EXTRACT_SYSTEM,
      messages: [{ role: 'user', content: jdText.slice(0, 2000) }],
    })
    const text = msg.content[0]?.type === 'text' ? msg.content[0].text.trim() : ''
    const parsed = JSON.parse(text) as Record<string, unknown>
    return {
      jobTitle: typeof parsed.jobTitle === 'string' && parsed.jobTitle ? parsed.jobTitle : 'Unknown Role',
      company: typeof parsed.company === 'string' && parsed.company ? parsed.company : 'Unknown Company',
    }
  } catch {
    return { jobTitle: 'Unknown Role', company: 'Unknown Company' }
  }
}
