#!/usr/bin/env node
// Release check (section 16): fail if the built bundle contains privileged credentials.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = process.argv[2] ?? 'dist'
const patterns = [
  [/sb_secret_[A-Za-z0-9_-]{10,}/, 'Supabase secret key'],
  [/GOCSPX-[A-Za-z0-9_-]{10,}/, 'Google OAuth client secret'],
  [/SUPABASE_SERVICE_ROLE_KEY/, 'service role variable name'],
  [/postgres(ql)?:\/\/[^\s'"]+:[^\s'"]+@/, 'database connection string'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
]

function walk(d) {
  return readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))
}

let failures = 0
for (const file of walk(root)) {
  if (!/\.(js|html|css|json|map|txt|webmanifest)$/.test(file)) continue
  const text = readFileSync(file, 'utf8')
  for (const [re, label] of patterns) {
    if (re.test(text)) {
      console.error(`✗ ${label} found in ${file}`)
      failures++
    }
  }
  // Legacy JWT keys: flag any embedded token whose payload claims the service role.
  for (const m of text.matchAll(/eyJ[A-Za-z0-9_-]+\.(eyJ[A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try {
      const payload = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8'))
      if (payload.role === 'service_role') {
        console.error(`✗ service_role JWT found in ${file}`)
        failures++
      }
    } catch {
      /* not a JWT */
    }
  }
}
if (failures) {
  console.error(`\n${failures} secret(s) found. Do not deploy.`)
  process.exit(1)
}
console.log(`✓ No privileged credentials found in ${root}/`)
