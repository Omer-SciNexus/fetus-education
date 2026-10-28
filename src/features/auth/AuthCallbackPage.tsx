import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { consumeNext, peekInviteToken } from '@/lib/navigation'
import { ButtonLink, LoadingState, Notice } from '@/components/ui'

/**
 * Google returns here. supabase-js exchanges the PKCE code automatically
 * (detectSessionInUrl). The destination comes only from our own session storage,
 * never from query parameters, which prevents open-redirect injection.
 */
export default function AuthCallbackPage() {
  const { session } = useAuth()
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const desc = params.get('error_description') || params.get('error')
    if (desc) {
      setFailed(desc)
      return
    }
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) setFailed('The sign-in did not complete.')
    }, 8000)
    return () => clearTimeout(t)
  }, [])

  if (session) {
    const next = consumeNext() ?? (peekInviteToken() ? '/join' : '/today')
    return <Navigate to={next} replace />
  }

  if (failed) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10">
        <Notice tone="error" title="Sign-in was not completed">
          <p>Please try again. If this keeps happening, contact support.</p>
          <p className="mt-1 text-xs opacity-80">{failed.slice(0, 200)}</p>
        </Notice>
        <ButtonLink to="/sign-in">Try again</ButtonLink>
      </div>
    )
  }
  return <LoadingState label="Signing you in…" />
}
