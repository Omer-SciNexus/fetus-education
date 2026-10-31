#!/usr/bin/env node
// Decrypts a backup folder for a restoration drill (section 17).
// Usage: npm run ops:decrypt -- <backup-folder> <output-folder>
// Env: BACKUP_PASSPHRASE
import { mkdirSync, readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { loadEnv, requireEnv, deriveKey, decrypt, sha256 } from './lib.mjs'

loadEnv()
const { BACKUP_PASSPHRASE } = requireEnv('BACKUP_PASSPHRASE')
const [src, out] = process.argv.slice(2)
if (!src || !out) {
  console.error('Usage: npm run ops:decrypt -- <backup-folder> <output-folder>')
  process.exit(1)
}
const info = JSON.parse(readFileSync(join(src, 'backup-info.json'), 'utf8'))
const key = deriveKey(BACKUP_PASSPHRASE, Buffer.from(info.salt, 'hex'))

function walk(d) {
  return readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))
}

for (const file of walk(src).filter((f) => f.endsWith('.enc'))) {
  const rel = relative(src, file).replace(/\.enc$/, '')
  const target = join(out, rel)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, decrypt(key, readFileSync(file)))
}

const manifest = JSON.parse(readFileSync(join(out, 'manifest.json'), 'utf8'))
let bad = 0
for (const m of manifest.recordings.filter((r) => !r.missing)) {
  if (sha256(readFileSync(join(out, m.file))) !== m.sha256) {
    bad++
    console.error(`Checksum mismatch: ${m.key}`)
  }
}
console.log(`Decrypted to ${out}. Recordings verified: ${manifest.recordings.length - bad}, mismatches: ${bad}.`)
console.log('Next: restore into a RESTRICTED environment and follow docs/operations/runbook.md → Restoration drill.')
process.exit(bad ? 1 : 0)
