'use client'

import { useReducer, useCallback } from 'react'
import type { InterviewPrepResult } from '@/lib/schemas'

// ── Types ────────────────────────────────────────────────────────────────────

export type QuestionState = {
  expanded: boolean
  draftAnswer: string
  critiquePhase: 'idle' | 'streaming' | 'done' | 'error'
  critiqueText: string
  critiqueError: string
}

export type PrepState =
  | { phase: 'idle' }
  | { phase: 'streaming'; progress: string }
  | { phase: 'done'; result: InterviewPrepResult; questions: QuestionState[] }
  | { phase: 'error'; message: string }

// ── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'STREAM_START' }
  | { type: 'CHUNK'; content: string }
  | { type: 'QUESTIONS_RESULT'; data: InterviewPrepResult }
  | { type: 'ERROR'; message: string }
  | { type: 'TOGGLE_EXPAND'; index: number }
  | { type: 'SET_DRAFT'; index: number; text: string }
  | { type: 'CRITIQUE_START'; index: number }
  | { type: 'CRITIQUE_CHUNK'; index: number; content: string }
  | { type: 'CRITIQUE_DONE'; index: number }
  | { type: 'CRITIQUE_ERROR'; index: number; message: string }

function defaultQuestionState(): QuestionState {
  return { expanded: false, draftAnswer: '', critiquePhase: 'idle', critiqueText: '', critiqueError: '' }
}

function reducer(state: PrepState, action: Action): PrepState {
  switch (action.type) {
    case 'STREAM_START':
      return { phase: 'streaming', progress: '' }

    case 'CHUNK':
      if (state.phase !== 'streaming') return state
      return { phase: 'streaming', progress: state.progress + action.content }

    case 'QUESTIONS_RESULT':
      return {
        phase: 'done',
        result: action.data,
        questions: action.data.questions.map(() => defaultQuestionState()),
      }

    case 'ERROR':
      return { phase: 'error', message: action.message }

    case 'TOGGLE_EXPAND':
      if (state.phase !== 'done') return state
      return {
        ...state,
        questions: state.questions.map((q, i) =>
          i === action.index ? { ...q, expanded: !q.expanded } : q
        ),
      }

    case 'SET_DRAFT':
      if (state.phase !== 'done') return state
      return {
        ...state,
        questions: state.questions.map((q, i) =>
          i === action.index ? { ...q, draftAnswer: action.text } : q
        ),
      }

    case 'CRITIQUE_START':
      if (state.phase !== 'done') return state
      return {
        ...state,
        questions: state.questions.map((q, i) =>
          i === action.index
            ? { ...q, critiquePhase: 'streaming', critiqueText: '', critiqueError: '' }
            : q
        ),
      }

    case 'CRITIQUE_CHUNK':
      if (state.phase !== 'done') return state
      return {
        ...state,
        questions: state.questions.map((q, i) =>
          i === action.index ? { ...q, critiqueText: q.critiqueText + action.content } : q
        ),
      }

    case 'CRITIQUE_DONE':
      if (state.phase !== 'done') return state
      return {
        ...state,
        questions: state.questions.map((q, i) =>
          i === action.index ? { ...q, critiquePhase: 'done' } : q
        ),
      }

    case 'CRITIQUE_ERROR':
      if (state.phase !== 'done') return state
      return {
        ...state,
        questions: state.questions.map((q, i) =>
          i === action.index
            ? { ...q, critiquePhase: 'error', critiqueError: action.message }
            : q
        ),
      }

    default:
      return state
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useInterviewPrep() {
  const [state, dispatch] = useReducer(reducer, { phase: 'idle' })

  const startPrep = useCallback(async (resumeText: string, jdText: string, applicationId?: string) => {
    dispatch({ type: 'STREAM_START' })

    let res: Response
    try {
      res = await fetch('/api/interview-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jdText, ...(applicationId ? { applicationId } : {}) }),
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
        let event: { type: string; content?: string; data?: InterviewPrepResult; message?: string }
        try {
          event = JSON.parse(line.slice(6))
        } catch {
          continue
        }
        if (event.type === 'chunk' && event.content !== undefined) {
          dispatch({ type: 'CHUNK', content: event.content })
        }
        if (event.type === 'result' && event.data !== undefined) {
          dispatch({ type: 'QUESTIONS_RESULT', data: event.data })
        }
        if (event.type === 'error' && event.message !== undefined) {
          dispatch({ type: 'ERROR', message: event.message })
        }
      }
    }
  }, [])

  // draftAnswer passed in from component to avoid stale closure (Pitfall 3)
  const submitCritique = useCallback(async (
    index: number,
    question: string,
    modelAnswer: string,
    draftAnswer: string
  ) => {
    dispatch({ type: 'CRITIQUE_START', index })

    let res: Response
    try {
      res = await fetch('/api/interview-critique', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, modelAnswer, draftAnswer }),
      })
    } catch {
      dispatch({ type: 'CRITIQUE_ERROR', index, message: 'Network error — could not connect' })
      return
    }

    if (!res.ok || !res.body) {
      dispatch({ type: 'CRITIQUE_ERROR', index, message: 'Failed to connect' })
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
        let event: { type: string; content?: string; message?: string }
        try {
          event = JSON.parse(line.slice(6))
        } catch {
          continue
        }
        if (event.type === 'chunk' && event.content !== undefined) {
          dispatch({ type: 'CRITIQUE_CHUNK', index, content: event.content })
        }
        if (event.type === 'done') {
          dispatch({ type: 'CRITIQUE_DONE', index })
        }
        if (event.type === 'error' && event.message !== undefined) {
          dispatch({ type: 'CRITIQUE_ERROR', index, message: event.message })
        }
      }
    }
  }, [])

  const toggleExpand = useCallback((index: number) => {
    dispatch({ type: 'TOGGLE_EXPAND', index })
  }, [])

  const setDraft = useCallback((index: number, text: string) => {
    dispatch({ type: 'SET_DRAFT', index, text })
  }, [])

  return { state, startPrep, submitCritique, toggleExpand, setDraft }
}
