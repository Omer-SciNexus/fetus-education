#!/usr/bin/env node
// Reconciles failed uploads and orphan objects (section 12.1, step 9) and runs retention.
// Never deletes active memories. Usage: npm run ops:cleanup-uploads -- [--delete-orphans]
// Env (or .env.operator): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { loadEnv, requireEnv, rest } from './lib.mjs'

loadEnv()
const env = requireEnv('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY')
const deleteOrphans = process.argv.includes('--delete-orphans')
const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = env
const auth = { apikey: key, Authorization: `Bearer ${key}` }

async function removeObjects(keys) {
  if (!keys.length) return
  const res = await fetch(`${url}/storage/v1/object/recordings`, {
    method: 'DELETE',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: keys }),
  })
  if (!res.ok) throw new Error(`Storage delete failed: ${res.status} ${await res.text()}`)
}

async function listAll(prefix = '') {
  const res = await fetch(`${url}/storage/v1/object/list/recordings`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0 }),
  })
  if (!res.ok) throw new Error(`Storage list failed: ${res.status}`)
  const entries = await res.json()
  const out = []
  for (const e of entries) {
    const path = prefix ? `${prefix}/${e.name}` : e.name
    if (e.id === null) out.push(...(await listAll(path)))
    else out.push(path)
  }
  return out
}

// 1. Expired reservations: remove any partial object, then release the quota.
const cutoff = new Date(Date.now() - 5 * 60_000).toISOString()
const stale = await (await rest(url, key, `/rest/v1/recordings?select=id,object_key&state=eq.reserved&expires_at=lt.${cutoff}`)).json()
await removeObjects(stale.map((r) => r.object_key))
for (const r of stale) {
  await rest(url, key, `/rest/v1/recordings?id=eq.${r.id}`, { method: 'PATCH', body: JSON.stringify({ state: 'failed' }) })
}
console.log(`Released ${stale.length} expired reservation(s).`)

// 2. Interrupted memory deletions: finish removing object and metadata.
const deleting = await (await rest(url, key, '/rest/v1/recordings?select=id,object_key,memory_id&state=eq.deleting')).json()
await removeObjects(deleting.map((r) => r.object_key))
for (const r of deleting) {
  await rest(url, key, `/rest/v1/recordings?id=eq.${r.id}`, { method: 'DELETE' })
  if (r.memory_id) await rest(url, key, `/rest/v1/memories?id=eq.${r.memory_id}&state=eq.deleting`, { method: 'DELETE' })
}
const textDeleting = await (await rest(url, key, '/rest/v1/memories?select=id&state=eq.deleting&kind=eq.text')).json()
for (const m of textDeleting) await rest(url, key, `/rest/v1/memories?id=eq.${m.id}`, { method: 'DELETE' })
console.log(`Completed ${deleting.length + textDeleting.length} interrupted deletion(s).`)

// 3. Orphans: objects with no recordings row.
const known = new Set((await (await rest(url, key, '/rest/v1/recordings?select=object_key')).json()).map((r) => r.object_key))
const objects = await listAll()
const orphans = objects.filter((o) => !known.has(o))
if (orphans.length) {
  console.log(`Found ${orphans.length} orphan object(s).`)
  if (deleteOrphans) {
    await removeObjects(orphans)
    console.log('Orphans deleted.')
  } else {
    console.log('Re-run with --delete-orphans after checking them.')
  }
} else {
  console.log('No orphan objects.')
}

// 4. Retention (raw events 90 days, spent invitation tokens).
const ret = await (await rest(url, key, '/rest/v1/rpc/admin_run_retention', { method: 'POST', body: '{}' })).json()
console.log('Retention:', ret)
