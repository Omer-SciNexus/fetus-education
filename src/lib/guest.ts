// Guest progress lives only in this browser tab session (section 7.1). Never synced.
import type { Stage } from '@/types/db'

const KEY = 'lb.guest'

interface GuestState {
  completed: string[]
  stage: Stage | null
}

function read(): GuestState {
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (!raw) return { completed: [], stage: null }
    const parsed = JSON.parse(raw) as Partial<GuestState>
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed.filter((s) => typeof s === 'string') : [],
      stage: parsed.stage === 'first' || parsed.stage === 'second' || parsed.stage === 'third' ? parsed.stage : null,
    }
  } catch {
    return { completed: [], stage: null }
  }
}

function write(state: GuestState) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable: guest state simply isn't kept */
  }
}

export const guest = {
  get: read,
  complete(slug: string) {
    const s = read()
    if (!s.completed.includes(slug)) s.completed.push(slug)
    write(s)
  },
  uncomplete(slug: string) {
    const s = read()
    write({ ...s, completed: s.completed.filter((c) => c !== slug) })
  },
  setStage(stage: Stage | null) {
    write({ ...read(), stage })
  },
  clear() {
    try {
      window.sessionStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
  },
}
