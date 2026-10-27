// Pure recorder/upload state machine (section 7.4). "saved" is reachable ONLY via a
// confirmed SAVED event — failed or interrupted uploads can never display success.

export type MicProblem = 'denied' | 'no_device' | 'unsupported' | 'busy'
export type SavePhase = 'reserving' | 'uploading' | 'finalizing'

export interface Take {
  blob: Blob
  mime: string
  durationSeconds: number
  /** Idempotency key for this take's save attempt; reused on retry. */
  attemptKey: string
}

export type RecorderState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'mic_problem'; problem: MicProblem }
  | { status: 'recording'; startedAt: number }
  | { status: 'recorded'; take: Take }
  | { status: 'too_large'; durationSeconds: number }
  | { status: 'saving'; take: Take; phase: SavePhase; progress: number }
  | { status: 'failed'; take: Take; message: string; retryable: boolean }
  | { status: 'saved'; memoryId: string }

export type RecorderEvent =
  | { type: 'REQUEST' }
  | { type: 'GRANTED'; at: number }
  | { type: 'MIC_PROBLEM'; problem: MicProblem }
  | { type: 'STOPPED'; take: Take; maxBytes: number }
  | { type: 'DISCARD' }
  | { type: 'SAVE' }
  | { type: 'PHASE'; phase: SavePhase }
  | { type: 'PROGRESS'; progress: number }
  | { type: 'SAVED'; memoryId: string }
  | { type: 'FAILED'; message: string; retryable: boolean; newAttemptKey?: string }
  | { type: 'RESET' }

export const initialRecorderState: RecorderState = { status: 'idle' }

export function recorderReducer(state: RecorderState, event: RecorderEvent): RecorderState {
  switch (event.type) {
    case 'REQUEST':
      return state.status === 'idle' || state.status === 'mic_problem' || state.status === 'too_large'
        ? { status: 'requesting' }
        : state
    case 'GRANTED':
      return state.status === 'requesting' ? { status: 'recording', startedAt: event.at } : state
    case 'MIC_PROBLEM':
      return state.status === 'requesting' || state.status === 'recording'
        ? { status: 'mic_problem', problem: event.problem }
        : state
    case 'STOPPED':
      if (state.status !== 'recording') return state
      if (event.take.blob.size === 0) return { status: 'idle' }
      if (event.take.blob.size > event.maxBytes) {
        return { status: 'too_large', durationSeconds: event.take.durationSeconds }
      }
      return { status: 'recorded', take: event.take }
    case 'DISCARD':
      return state.status === 'recorded' || state.status === 'failed' || state.status === 'too_large'
        ? { status: 'idle' }
        : state
    case 'SAVE':
      if (state.status === 'recorded' || (state.status === 'failed' && state.retryable)) {
        return { status: 'saving', take: state.take, phase: 'reserving', progress: 0 }
      }
      return state
    case 'PHASE':
      return state.status === 'saving' ? { ...state, phase: event.phase } : state
    case 'PROGRESS':
      return state.status === 'saving'
        ? { ...state, progress: Math.max(0, Math.min(1, event.progress)) }
        : state
    case 'SAVED':
      return state.status === 'saving' ? { status: 'saved', memoryId: event.memoryId } : state
    case 'FAILED':
      if (state.status !== 'saving') return state
      return {
        status: 'failed',
        take: event.newAttemptKey ? { ...state.take, attemptKey: event.newAttemptKey } : state.take,
        message: event.message,
        retryable: event.retryable,
      }
    case 'RESET':
      return state.status === 'saving' ? state : { status: 'idle' }
  }
}

/** Whether leaving now would lose an unsaved take (used for the beforeunload warning). */
export function hasUnsavedTake(state: RecorderState): boolean {
  return state.status === 'recording' || state.status === 'recorded' || state.status === 'saving' || state.status === 'failed'
}
