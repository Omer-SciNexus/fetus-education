// Shared helpers for operator scripts. Run locally by a named operator only (section 16).
import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'

/** Loads KEY=VALUE pairs from an env file without overriding existing variables. */
export function loadEnv(file = '.env.operator') {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
}

export function requireEnv(...names) {
  const missing = names.filter((n) => !process.env[n])
  if (missing.length) {
    console.error(`Missing environment variables: ${missing.join(', ')}\nSee docs/operations/runbook.md.`)
    process.exit(1)
  }
  return Object.fromEntries(names.map((n) => [n, process.env[n]]))
}

const MAGIC = Buffer.from('LBK1')

export function deriveKey(passphrase, salt) {
  return scryptSync(passphrase, salt, 32, { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
}

/** AES-256-GCM: MAGIC | iv(12) | tag(16) | ciphertext */
export function encrypt(key, plaintext) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), ct])
}

export function decrypt(key, blob) {
  if (!blob.subarray(0, 4).equals(MAGIC)) throw new Error('Not a Little Bloom backup file')
  const iv = blob.subarray(4, 16)
  const tag = blob.subarray(16, 32)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(blob.subarray(32)), decipher.final()])
}

export function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex')
}

export async function rest(url, serviceKey, path, init = {}) {
  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${await res.text()}`)
  return res
}
