import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && anonKey)

// Only the public URL and publishable key ever reach the browser (section 15).
export const supabase = createClient(url ?? 'http://127.0.0.1:54321', anonKey ?? 'missing-key', {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const RECORDINGS_BUCKET = 'recordings'

export const config = {
  devLogin: import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true',
  supportEmail: (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) ?? 'support@example.com',
  policyVersion: (import.meta.env.VITE_POLICY_VERSION as string | undefined) ?? '2026-10-31',
}
