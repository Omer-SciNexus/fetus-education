#!/usr/bin/env node
// Weekly encrypted backup (section 17): database dump + recording files + manifest.
// Database backups do NOT include Storage objects, so both are exported here.
//
// Usage: npm run ops:backup -- [--keep 2] [--out backups]
// Env (or .env.operator): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL, BACKUP_PASSPHRASE
import { spawnSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, writeFileSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { tmpdir } from 'node:os'
import { loadEnv, requireEnv, deriveKey, encrypt, sha256, rest } from './lib.mjs'

loadEnv()
const env = requireEnv('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_URL', 'BACKUP_PASSPHRASE')
if (env.BACKUP_PASSPHRASE.length < 16) {
  console.error('BACKUP_PASSPHRASE must be at least 16 characters.')
  process.exit(1)
}
const args = process.argv.slice(2)
const keep = Number(args[args.indexOf('--keep') + 1]) || 2
const outRoot = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'backups'

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const dir = join(outRoot, stamp)
mkdirSync(join(dir, 'recordings'), { recursive: true })
const salt = randomBytes(16)
const key = deriveKey(env.BACKUP_PASSPHRASE, salt)

function writeEncrypted(name, buf) {
  writeFileSync(join(dir, `${name}.enc`), encrypt(key, buf))
}

// ---------------------------------------------------------------- database
const tmp = join(tmpdir(), `lb-dump-${stamp}`)
mkdirSync(tmp, { recursive: true })
const dumps = [
  ['schema.sql', []],
  ['data.sql', ['--data-only', '--use-copy']],
  ['roles.sql', ['--role-only']],
]
for (const [file, extra] of dumps) {
  const path = join(tmp, file)
  console.log(`Dumping ${file}…`)
  const r = spawnSync('npx', ['supabase', 'db', 'dump', '--db-url', env.SUPABASE_DB_URL, '-f', path, ...extra], {
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: process.platform === 'win32',
  })
  if (r.status !== 0) {
    console.error(`Database dump failed (${file}). Nothing was rotated.`)
    rmSync(tmp, { recursive: true, force: true })
    process.exit(1)
  }
  writeEncrypted(file, readFileSync(path))
}
rmSync(tmp, { recursive: true, force: true })

// ---------------------------------------------------------------- recordings
const recRes = await rest(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  '/rest/v1/recordings?select=id,object_key,actual_bytes,state,memory_id&state=in.(active,deleting)',
)
const recordings = await recRes.json()
const manifest = []
for (const [i, r] of recordings.entries()) {
  const path = r.object_key.split('/').map(encodeURIComponent).join('/')
  const res = await fetch(`${env.SUPABASE_URL}/storage/v1/object/recordings/${path}`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  })
  if (!res.ok) {
    manifest.push({ key: r.object_key, recording_id: r.id, state: r.state, missing: true })
    console.warn(`  missing object: ${r.object_key}`)
    continue
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const file = `recordings/${String(i).padStart(5, '0')}`
  writeEncrypted(file, buf)
  manifest.push({ key: r.object_key, recording_id: r.id, state: r.state, file, bytes: buf.length, sha256: sha256(buf) })
}

// Deleted-after-snapshot reconciliation: replay this ledger after any restore.
const ledgerRes = await rest(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, '/rest/v1/deletion_requests?select=user_id,state,requested_at,completed_at')
const ledger = await ledgerRes.json()

const migrations = readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql')).sort()
const info = {
  format: 'little-bloom-backup-v1',
  created_at: new Date().toISOString(),
  schema_migration: migrations.at(-1),
  salt: salt.toString('hex'),
  kdf: 'scrypt N=32768 r=8 p=1',
  cipher: 'aes-256-gcm',
  counts: { recordings: manifest.filter((m) => !m.missing).length, missing: manifest.filter((m) => m.missing).length, deletion_ledger: ledger.length },
  note: 'Restore into a restricted environment first. See docs/operations/runbook.md.',
}
writeEncrypted('manifest.json', Buffer.from(JSON.stringify({ recordings: manifest, deletion_ledger: ledger }, null, 2)))
writeFileSync(join(dir, 'backup-info.json'), JSON.stringify(info, null, 2))

// ---------------------------------------------------------------- rotation
const generations = readdirSync(outRoot)
  .filter((d) => statSync(join(outRoot, d)).isDirectory())
  .sort()
for (const old of generations.slice(0, Math.max(0, generations.length - keep))) {
  rmSync(join(outRoot, old), { recursive: true, force: true })
  console.log(`Rotated out old backup ${old}`)
}

console.log(`\nBackup written to ${dir}`)
console.log(`  recordings: ${info.counts.recordings} (missing: ${info.counts.missing})`)
console.log('Verify the counts against the admin Pilot tab, then copy the folder to the owner-controlled backup location.')
