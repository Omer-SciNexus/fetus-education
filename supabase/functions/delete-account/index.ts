// Account deletion (sections 7.6, 13.3).
// 1. Verify the caller's session and require a recent sign-in.
// 2. prepare_account_deletion: blocks access, closes/detaches the family, lists objects.
// 3. Remove the user's recording objects from Storage.
// 4. Delete the auth user (cascades remove profile, memberships, memories, progress).
// 5. Mark the deletion ledger complete. Every step is safe to retry.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const RECENT_SIGN_IN_MS = 15 * 60 * 1000

function cors(origin: string | null) {
  const allowed = (Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
  const allow = origin && allowed.includes(origin) ? origin : allowed[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get('Origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, headers)

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'not_authenticated' }, 401, headers)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

  // Identity comes only from the verified token.
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
  if (userErr || !userData.user) return json({ error: 'not_authenticated' }, 401, headers)
  const user = userData.user

  const lastSignIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : 0
  if (!lastSignIn || Date.now() - lastSignIn > RECENT_SIGN_IN_MS) {
    return json({ error: 'reauth_required' }, 409, headers)
  }

  const { data: keys, error: prepErr } = await admin.rpc('prepare_account_deletion', { p_user: user.id })
  if (prepErr) {
    console.error('prepare_account_deletion failed', prepErr.message)
    return json({ error: 'deletion_failed' }, 500, headers)
  }

  const objectKeys = (keys as string[] | null) ?? []
  for (let i = 0; i < objectKeys.length; i += 100) {
    const { error } = await admin.storage.from('recordings').remove(objectKeys.slice(i, i + 100))
    if (error) {
      await admin.rpc('finish_account_deletion', { p_user: user.id, p_error: `storage: ${error.message}` })
      // Access is already blocked; the user can retry and an operator can finish it.
      return json({ error: 'deletion_incomplete' }, 500, headers)
    }
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr && !/not found/i.test(delErr.message)) {
    await admin.rpc('finish_account_deletion', { p_user: user.id, p_error: `auth: ${delErr.message}` })
    return json({ error: 'deletion_incomplete' }, 500, headers)
  }

  await admin.rpc('finish_account_deletion', { p_user: user.id, p_error: null })
  return json({ status: 'deleted' }, 200, headers)
})
