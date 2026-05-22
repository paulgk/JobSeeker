import * as cheerio from 'cheerio'

const BLOCKED_DOMAINS = [
  'linkedin.com',
  'indeed.com',
  'glassdoor.com',
  'ziprecruiter.com',
  'workday.com',
  'myworkdayjobs.com',
  'taleo.net',
  'icims.com',
]

const FETCH_TIMEOUT_MS = 10_000

export async function fetchJdFromUrl(url: string): Promise<string> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid URL. Please enter a full URL starting with https://')
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are supported.')
  }

  const blockedDomain = BLOCKED_DOMAINS.find(d => parsed.hostname.includes(d))
  if (blockedDomain) {
    throw new Error(
      `${parsed.hostname} cannot be fetched automatically — it requires a browser or login. Please open the job posting and paste the description text.`
    )
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let html: string
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobSeeker/1.0; +https://jobseeker.app)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(
        `Could not load this page (HTTP ${response.status}). The page may be private, blocked, or require login. Try pasting the job description instead.`
      )
    }

    html = await response.text()
  } catch (err: unknown) {
    clearTimeout(timeoutId)

    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        'The page took too long to respond (10s timeout). Try pasting the job description instead.'
      )
    }

    if (err instanceof Error && err.message.startsWith('Could not load')) {
      throw err
    }

    throw new Error(
      'Failed to fetch this URL. The site may be blocking automated requests. Try pasting the job description instead.'
    )
  }

  const $ = cheerio.load(html)
  $('script, style, nav, header, footer, aside, [aria-hidden="true"], noscript').remove()

  const text = $('body').text().replace(/\s+/g, ' ').trim()

  if (text.length < 100) {
    throw new Error(
      'Could not extract readable text from this page. It may be JavaScript-rendered or blocked. Try pasting the job description instead.'
    )
  }

  return text
}
