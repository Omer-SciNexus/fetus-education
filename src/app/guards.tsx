// Route guards are PRESENTATION ONLY (section 6). The database and storage policies
// remain the security boundary even if these are bypassed.
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/lib/auth'
import { rememberNext } from '@/lib/navigation'
import { Button, ErrorState, LoadingState, Notice } from '@/components/ui'
import type { AdminRole } from '@/types/db'

function FullPageLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4">
      <LoadingState />
    </div>
  )
}

export function RequireSession() {
  const { session, restoring } = useAuth()
  const location = useLocation()
  if (restoring) return <FullPageLoading />
  if (!session) {
    rememberNext(location.pathname + location.search)
    return <Navigate to="/sign-in" replace />
  }
  return <Outlet />
}

function DeletionPending() {
  const { signOut } = useAuth()
  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
      <Notice tone="warn" title="Account deletion in progress">
        Access to this account is blocked while deletion completes. If this message persists, contact support.
      </Notice>
      <Button variant="secondary" onClick={() => void signOut()}>Sign out</Button>
    </div>
  )
}

export function RequireMember() {
  const { session, restoring, ctx, ctxLoading, ctxError, refresh } = useAuth()
  const location = useLocation()
  if (restoring || ctxLoading) return <FullPageLoading />
  if (!session) {
    rememberNext(location.pathname + location.search)
    return <Navigate to="/sign-in" replace />
  }
  if (ctxError || !ctx) {
    return (
      <div className="mx-auto max-w-3xl px-4">
        <ErrorState error={ctxError} onRetry={() => void refresh()} />
      </div>
    )
  }
  if (ctx.pending_deletion) return <DeletionPending />
  if (!ctx.profile.onboarded_at) return <Navigate to="/onboarding" replace />
  // A partner whose membership ended keeps author-only access to their own
  // memories and data controls (section 7.6), but nothing family-scoped.
  if (!ctx.membership && !/^\/(memories|settings)(\/|$)/.test(location.pathname)) {
    return <Navigate to="/onboarding" replace />
  }
  return <Outlet />
}

export function RequireRole({ roles }: { roles: AdminRole[] }) {
  const { ctx } = useAuth()
  if (!ctx || !roles.some((r) => ctx.roles.includes(r))) return <Navigate to="/today" replace />
  return <Outlet />
}
