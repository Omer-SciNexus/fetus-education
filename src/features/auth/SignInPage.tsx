import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { supabase, config, isConfigured } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { consumeNext, peekInviteToken, rememberNext, safeRedirect } from '@/lib/navigation'
import { Button, Card, Field, Notice, PageHeader, TextInput } from '@/components/ui'

import { Artwork } from '@/components/Artwork'
import { Icon } from '@/components/Icon'

function GoogleMark() {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  )
}

export default function SignInPage() {
  const { session, restoring } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const nextParam = params.get('next')
  useEffect(() => {
    if (nextParam) rememberNext(safeRedirect(nextParam))
  }, [nextParam])

  // Re-authentication (e.g. before account deletion) passes ?reauth=1 so a current
  // session does not short-circuit the sign-in.
  const reauth = params.get('reauth') === '1'
  if (!restoring && session && !reauth) {
    const next = consumeNext() ?? (peekInviteToken() ? '/join' : '/today')
    return <Navigate to={next} replace />
  }

  const google = async () => {
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Basic identity only (section 13.1).
        scopes: 'openid email profile',
        queryParams: reauth ? { prompt: 'login' } : undefined,
      },
    })
    if (err) {
      setBusy(false)
      setError('Google sign-in could not start. Please try again.')
    }
  }

  const devSignIn = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    let { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err && /invalid login credentials/i.test(err.message)) {
      const res = await supabase.auth.signUp({ email, password })
      err = res.error
    }
    setBusy(false)
    if (err) setError(err.message)
    else if (reauth) navigate(consumeNext() ?? '/today', { replace: true })
  }

  return (
    <div className="auth-layout">
      <div className="auth-art">
        <Artwork name="family-reading" eager />
        <div className="auth-art-caption">
          <h2>
            A little space.
            <br />A lot of connection.
          </h2>
          <p>Stories, shared moments, and the memories that make this time yours.</p>
        </div>
      </div>
      <div className="auth-form space-y-5">
        <p className="eyebrow">
          <Icon name="leaf" size={18} />
          WELCOME TO LITTLE BLOOM
        </p>
        <PageHeader
          title={reauth ? 'Confirm it’s you' : 'Sign in'}
          subtitle={
            reauth ? 'Sign in again to continue.' : 'Save progress, keep memories and invite a partner.'
          }
        />
        {params.get('deleted') === '1' && (
          <Notice tone="info">Your account deletion is being processed. You have been signed out.</Notice>
        )}
        {!isConfigured && (
          <Notice tone="error" title="App not configured">
            Sign-in is temporarily unavailable. You can still explore the sample activities.
          </Notice>
        )}
        {peekInviteToken() && <Notice tone="info">Sign in to accept your partner invitation.</Notice>}
        <Card className="space-y-4">
          <Button full variant="secondary" onClick={google} loading={busy} className="border-ink/20">
            <GoogleMark /> Continue with Google
          </Button>
          <p className="text-sm text-ink-soft">
            We ask Google only for your name and email address. By continuing you agree to the{' '}
            <a className="underline" href="/terms">
              pilot terms
            </a>{' '}
            and acknowledge the{' '}
            <a className="underline" href="/privacy">
              privacy notice
            </a>
            .
          </p>
          {error && <Notice tone="error">{error}</Notice>}
        </Card>

        {config.devLogin && (
          <Card className="dev-login">
            <form onSubmit={devSignIn} className="space-y-3">
              <p className="text-sm font-semibold text-warn-700">
                Local development sign-in (disabled in production)
              </p>
              <Field label="Email">
                {(p) => (
                  <TextInput
                    {...p}
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                )}
              </Field>
              <Field label="Password" hint="Creates the account if it does not exist.">
                {(p) => (
                  <TextInput
                    {...p}
                    type="password"
                    autoComplete="current-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                )}
              </Field>
              <Button type="submit" loading={busy} full>
                Sign in (dev)
              </Button>
            </form>
          </Card>
        )}

        <p className="text-sm text-ink-soft">
          No Google account? You can still{' '}
          <a className="underline" href="/sample">
            try the sample activities
          </a>
          .
        </p>
      </div>
    </div>
  )
}
