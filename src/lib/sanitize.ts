/**
 * Wraps user-supplied content in XML tags for prompt injection defense.
 * Strips any attempt to close or reopen the wrapping tag from the content
 * before wrapping, preventing tag injection attacks.
 *
 * Usage in Phase 2:
 *   const safeResume = wrapUserContent(resumeText, 'resume')
 *   const safeJd = wrapUserContent(jdText, 'job_description')
 *   // Then embed <resume>...</resume> and <job_description>...</job_description>
 *   // in the user turn of the Claude API call.
 */
export function wrapUserContent(content: string, tag: string): string {
  // Remove any occurrence of the opening or closing tag from user content
  const sanitized = content.replace(new RegExp(`</?${tag}[\\s>][^>]*>|</?${tag}>`, 'gi'), '')
  return `<${tag}>\n${sanitized}\n</${tag}>`
}
