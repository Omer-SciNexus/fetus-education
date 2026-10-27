import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { getMyContext } from './api'
import { guest } from './guest'
import { clearInviteToken } from './navigation'
import type { MyContext } from '@/types/db'

interface AuthValue {
  session: Session | null
  /** True until the stored session has been restored. */
  restoring: boolean
  ctx: MyContext | undefined
  ctxLoading: boolean
  ctxError: unknown
  refresh: () => Promise<unknown>
  signOut: () => Promise<void>
  hasRole: (role: MyContext['roles'][number]) => boolean
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [restoring, setRestoring] = useState(true)
  const qc = useQueryClient()

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setRestoring(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setRestoring(false)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user.id ?? null
  const ctxQuery = useQuery({
    queryKey: ['ctx', userId],
    queryFn: getMyContext,
    enabled: !!userId,
    staleTime: 60_000,
  })

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    // Shared devices: leave no private data in memory or session storage (section 20).
    qc.clear()
    guest.clear()
    clearInviteToken()
  }, [qc])

  const value = useMemo<AuthValue>(
    () => ({
      session,
      restoring,
      ctx: userId ? ctxQuery.data : undefined,
      ctxLoading: !!userId && ctxQuery.isPending,
      ctxError: ctxQuery.error,
      refresh: () => qc.invalidateQueries({ queryKey: ['ctx'] }),
      signOut,
      hasRole: (role) => !!ctxQuery.data?.roles.includes(role),
    }),
    [session, restoring, userId, ctxQuery.data, ctxQuery.isPending, ctxQuery.error, qc, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const v = useContext(AuthContext)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}

/** Convenience for screens that are only rendered for signed-in members. */
export function useMember() {
  const { ctx, session } = useAuth()
  if (!ctx || !session) throw new Error('useMember used outside a member route')
  return { ctx, userId: session.user.id }
}
