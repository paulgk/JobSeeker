'use client'

import { useReducer, useCallback } from 'react'
import type { AnalysisResult } from '@/lib/schemas'

// ── Types ────────────────────────────────────────────────────────────────────

export type RewriteSection = AnalysisResult['rewrites'][number]

export type RewriteState = {
  status: 'pending' | 'accepted' | 'rejected'
  section: RewriteSection
}

export type AnalysisState =
  | { phase: 'idle' }
  | { phase: 'streaming'; progress: string }
  | { phase: 'done'; result: AnalysisResult; rewrites: RewriteState[]; applicationId?: string }
  | { phase: 'error'; message: string }

// ── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'STREAM_START' }
  | { type: 'CHUNK'; content: string }
  | { type: 'RESULT'; data: AnalysisResult; applicationId?: string }
  | { type: 'ERROR'; message: string }
  | { type: 'ACCEPT_REWRITE'; index: number }
  | { type: 'REJECT_REWRITE'; index: number }

function reducer(state: AnalysisState, action: Action): AnalysisState {
  switch (action.type) {
    case 'STREAM_START':
      return { phase: 'streaming', progress: '' }

    case 'CHUNK':
      if (state.phase !== 'streaming') return state
      return { phase: 'streaming', progress: state.progress + action.content }

    case 'RESULT':
      return {
        phase: 'done',
        result: action.data,
        rewrites: action.data.rewrites.map((section) => ({ status: 'pending', section })),
        applicationId: action.applicationId,
      }

    case 'ERROR':
      return { phase: 'error', message: action.message }

    case 'ACCEPT_REWRITE':
      if (state.phase !== 'done') return state
      return {
        ...state,
        rewrites: state.rewrites.map((rw, i) =>
          i === action.index ? { ...rw, status: 'accepted' } : rw
        ),
      }

    case 'REJECT_REWRITE':
      if (state.phase !== 'done') return state
      return {
        ...state,
        rewrites: state.rewrites.map((rw, i) =>
          i === action.index ? { ...rw, status: 'rejected' } : rw
        ),
      }

    default:
      return state
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAnalysis() {
  const [state, dispatch] = useReducer(reducer, { phase: 'idle' })

  const start = useCallback(async (resumeText: string, jdText: string) => {
    dispatch({ type: 'STREAM_START' })

    let res: Response
    try {
      res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jdText }),
      })
    } catch {
      dispatch({ type: 'ERROR', message: 'Network error — could not connect' })
      return
    }

    if (!res.ok || !res.body) {
      dispatch({ type: 'ERROR', message: 'Failed to connect' })
      return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        let event: { type: string; content?: string; data?: AnalysisResult; message?: string; applicationId?: string }
        try {
          event = JSON.parse(line.slice(6))
        } catch {
          continue
        }
        if (event.type === 'chunk' && event.content !== undefined) {
          dispatch({ type: 'CHUNK', content: event.content })
        }
        if (event.type === 'result' && event.data !== undefined) {
          dispatch({ type: 'RESULT', data: event.data, applicationId: event.applicationId })
        }
        if (event.type === 'error' && event.message !== undefined) {
          dispatch({ type: 'ERROR', message: event.message })
        }
        if (event.type === 'save_error' && event.message !== undefined) {
          // save_error is non-fatal — analysis result is still in done state
          // Future: dispatch a SAVE_ERROR action to show a banner. For Phase 6, log only.
          console.warn('Analysis save failed:', event.message)
        }
      }
    }
  }, [])

  const acceptRewrite = useCallback(
    (index: number) => {
      if (state.phase !== 'done') return
      dispatch({ type: 'ACCEPT_REWRITE', index })
    },
    [state.phase]
  )

  const rejectRewrite = useCallback(
    (index: number) => {
      if (state.phase !== 'done') return
      dispatch({ type: 'REJECT_REWRITE', index })
    },
    [state.phase]
  )

  return { state, start, acceptRewrite, rejectRewrite }
}
