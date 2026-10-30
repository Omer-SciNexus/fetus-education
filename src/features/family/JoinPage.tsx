import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '@/lib/auth'
import { acceptInvitation } from '@/lib/api'
import { errorCode, errorMessage } from '@/lib/errors'
import { clearInviteToken, parseInviteToken, peekInviteToken, rememberNext, stashInviteToken } from '@/lib/navigation'
import { Button, ButtonLink, Card, LoadingState, Notice, PageHeader } from '@/components/ui'

/**
 * Invitation acceptance (section 12.3). The token arrives in the URL fragment
 * (never sent to servers or in referrers), is moved into session storage so it
 * survives the Google redirect, and is removed from the address bar immediately.
 */
export default function JoinPage() {
  const { session, restoring, ctx, ctxLoading, refresh } = useAuth()
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(() => {
    const fromHash = parseInviteToken(window.location.hash)
    if (fromHash) stashInviteToken(fromHash)
    return fromHash ?? peekInviteToken()
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ code: string | null; message: string } | null>(null)

  useEffect(() => {
    if (window.location.hash) history.replaceState(null, '', window.location.pathname)
  }, [])

  if (restoring || (session && ctxLoading)) return <LoadingState />

  if (error && !token) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-8">
        <PageHeader title="This invitation can't be used" />
        <Notice tone="error">{error.message}</Notice>
        <ButtonLink to="/sample" variant="secondary">Try the samples</ButtonLink>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-8">
        <PageHeader title="Invitation link needed" />
        <Notice tone="info">Open the full invitation link you were sent. If it does not work, ask for a new one.</Notice>
        <ButtonLink to="/">Go home</ButtonLink>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md space-y-5 py-8">
        <PageHeader title="You've been invited" subtitle="Join your partner's Little Bloom family space." />
        <Card className="space-y-3">
          <ul className="list-disc space-y-1 pl-5 text-ink-soft">
            <li>You'll have your own sign-in and your own private memories.</li>
            <li>You'll see only what your partner chooses to share.</li>
            <li>You can leave at any time.</li>
          </ul>
          <Button
            full
            onClick={() => {
              rememberNext('/join')
              navigate('/sign-in')
            }}
          >
            Sign in to accept
          </Button>
        </Card>
      </div>
    )
  }

  if (ctx?.membership) {
    clearInviteToken()
    return (
      <div className="mx-auto max-w-md space-y-4 py-8">
        <PageHeader title="You're already in a family" />
        <Notice tone="info">This account already belongs to a Little Bloom family, so this invitation cannot be used with it.</Notice>
        <ButtonLink to="/today">Open Little Bloom</ButtonLink>
      </div>
    )
  }

  const accept = async () => {
    setBusy(true)
    setError(null)
    try {
      await acceptInvitation(token)
      clearInviteToken()
      await refresh()
      navigate('/onboarding', { replace: true })
    } catch (e) {
      const code = errorCode(e)
      setError({ code, message: errorMessage(e) })
      if (code && code.startsWith('invitation_')) {
        clearInviteToken()
        setToken(null)
      }
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-5 py-8">
      <PageHeader title="Accept invitation?" subtitle={`Signed in as ${session.user.email}`} />
      <Card className="space-y-3">
        <p>You'll join as a partner. Your memories stay private unless you choose to share them.</p>
        {error && <Notice tone="error">{error.message}</Notice>}
        <div className="flex flex-wrap gap-3">
          <Button onClick={accept} loading={busy}>Accept</Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              clearInviteToken()
              navigate('/', { replace: true })
            }}
          >
            Decline
          </Button>
        </div>
      </Card>
    </div>
  )
}
