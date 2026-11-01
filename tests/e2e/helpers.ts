import { expect, type Page } from '@playwright/test'

const SUPABASE_URL = process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_KEY = process.env.E2E_SERVICE_ROLE_KEY ?? ''

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`
}

/** Admits an owner to the pilot using the LOCAL service key (never a hosted one). */
export async function admit(email: string) {
  if (!SERVICE_KEY) throw new Error('Set E2E_SERVICE_ROLE_KEY to the local service role key (npx supabase status).')
  if (!/127\.0\.0\.1|localhost/.test(SUPABASE_URL)) throw new Error('E2E tests must target local Supabase only.')
  const res = await fetch(`${SUPABASE_URL}/rest/v1/pilot_admissions`, {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, note: 'e2e' }),
  })
  if (!res.ok) throw new Error(`admit failed: ${res.status} ${await res.text()}`)
}

export async function devSignIn(page: Page, email: string, password = 'test-password-123') {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in (dev)' }).click()
}

export async function completeOnboarding(page: Page, name: string) {
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome')
  await page.getByLabel('What should we call you?').fill(name)
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { level: 1 })).not.toContainText('Welcome')
  // Owners get an optional pregnancy-stage step; partners go straight to the agreement.
  const skip = page.getByRole('button', { name: 'Skip for now' })
  if (await skip.count()) await skip.click()
  await page.getByText('I have read the privacy notice and pilot terms').click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/onboarding'))
}
