// Safe post-login redirects and invitation-token handling (sections 6, 12.3).

const NEXT_KEY = 'lb.next'
const INVITE_KEY = 'lb.invite'

/** Only same-origin absolute paths are allowed; anything else falls back. */
export function safeRedirect(value: string | null | undefined, fallback = '/today'): string {
  if (!value || typeof value !== 'string') return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback
  if (/[\u0000-\u001f]/.test(value)) return fallback
  if (/^\/[^/]*:/.test(value)) return fallback
  return value
}

function store(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function rememberNext(path: string) {
  try {
    store()?.setItem(NEXT_KEY, safeRedirect(path))
  } catch {
    /* storage unavailable: fall back to default destination */
  }
}

export function consumeNext(): string | null {
  try {
    const s = store()
    const v = s?.getItem(NEXT_KEY) ?? null
    s?.removeItem(NEXT_KEY)
    return v ? safeRedirect(v) : null
  } catch {
    return null
  }
}

const TOKEN_RE = /^[0-9a-f]{64}$/

/** Reads `#token=<64 hex>` from a URL fragment. */
export function parseInviteToken(hash: string): string | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const token = params.get('token')?.trim().toLowerCase() ?? ''
  return TOKEN_RE.test(token) ? token : null
}

/** The token must survive the Google redirect, which drops URL fragments. */
export function stashInviteToken(token: string) {
  try {
    if (TOKEN_RE.test(token)) store()?.setItem(INVITE_KEY, token)
  } catch {
    /* ignore */
  }
}

export function peekInviteToken(): string | null {
  try {
    const t = store()?.getItem(INVITE_KEY) ?? null
    return t && TOKEN_RE.test(t) ? t : null
  } catch {
    return null
  }
}

export function clearInviteToken() {
  try {
    store()?.removeItem(INVITE_KEY)
  } catch {
    /* ignore */
  }
}

export function inviteLink(origin: string, token: string): string {
  return `${origin}/join#token=${token}`
}
