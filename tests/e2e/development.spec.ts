import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

// An isolated signed-in fixture exercises the real Explore route, guards and layout.
// No production accounts or database writes are used.
async function memberFixture(page: Page, contentPaused = false) {
  let url = process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54321'
  try { url = readFileSync('.env.local', 'utf8').match(/^VITE_SUPABASE_URL\s*=\s*["']?([^\s"']+)/m)?.[1] ?? url } catch { /* default local URL */ }
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'scene-fixture@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' }
  const ctx = { user_id: user.id, profile: { user_id: user.id, display_name: 'Robin', timezone: 'Europe/Istanbul', preferences: {}, content_paused: contentPaused, onboarded_at: '2026-01-01T00:00:00Z' }, membership: { family_id: '22222222-2222-4222-8222-222222222222', role: 'owner', joined_at: '2026-01-01T00:00:00Z' }, pregnancy: null, admitted: true, roles: [], pending_deletion: false }
  await page.route('**/rest/v1/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(route.request().url().includes('/rpc/get_my_context') ? ctx : []) }))
  await page.route('**/auth/v1/**', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ user }) }))
  await page.addInitScript(({ key, user }) => {
    localStorage.setItem(key, JSON.stringify({ access_token: 'isolated-scene-fixture', refresh_token: 'isolated-fixture', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: 'bearer', user }))
  }, { key: `sb-${new URL(url).hostname.split('.')[0]}-auth-token`, user })
}

test('Explore plays the bonding video, selects stages, pauses, seeks and replays', async ({ page }, info) => {
  await memberFixture(page)
  await page.goto('/explore')
  const journey = page.locator('.development-journey')
  await expect(page.getByRole('heading', { name: 'Find your next little moment' })).toBeVisible()
  await expect(journey.locator('video')).toBeVisible({ timeout: 30000 })
  const seek = journey.getByLabel('Journey position')
  const stages = ['Beginning', 'Growing', 'Voice', 'Stories', 'Music', 'Sunrise']
  for (let i = 0; i < stages.length; i++) {
    await journey.getByRole('button', { name: stages[i] }).click()
    await expect(journey.getByRole('button', { name: stages[i] })).toHaveAttribute('aria-pressed', 'true')
  }
  await expect(journey.locator('video')).toHaveAttribute('src', '/videos/a-little-sun-bonding-43s.mp4')
  expect(await journey.locator('video').evaluate((v: HTMLVideoElement) => v.duration)).toBeCloseTo(43, 0)
  expect(await page.locator('canvas').count()).toBe(0)
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name))
  expect(resources.some(url => /three|createDevelopmentScene/i.test(url))).toBe(false)
  await expect(journey.getByText(/Like the sun, you bring a new day/)).toBeVisible()
  await journey.getByRole('button', { name: 'Play journey', exact: true }).click()
  await expect.poll(async () => Number(await seek.inputValue())).toBeGreaterThan(40.6)
  await journey.getByRole('button', { name: 'Sound off', exact: true }).click()
  await expect.poll(() => journey.locator('video').evaluate((a: HTMLVideoElement) => !a.paused && !a.muted)).toBe(true)
  await journey.getByRole('button', { name: 'Pause', exact: true }).click()
  const paused = Number(await seek.inputValue())
  await page.waitForTimeout(300)
  expect(Number(await seek.inputValue())).toBeCloseTo(paused, 1)
  await expect.poll(() => journey.locator('video').evaluate((a: HTMLVideoElement) => a.paused)).toBe(true)
  await seek.fill('43')
  await journey.getByRole('button', { name: 'Replay journey' }).click()
  await expect.poll(async () => Number(await seek.inputValue())).toBeLessThan(3)
  await journey.getByRole('button', { name: 'Pause', exact: true }).click()
  await page.getByRole('group', { name: 'Journey chapter' }).getByRole('button', { name: 'Stories', exact: true }).click()
  await expect.poll(() => journey.locator('video').evaluate((v: HTMLVideoElement) =>
    !v.seeking && v.readyState >= 2 && Math.abs(v.currentTime - 27) < .1,
  )).toBe(true)
  await page.screenshot({ path: `test-results/development-${info.project.name}.png`, fullPage: true })
  // Resize the actual member page, including its CSS and navigation.
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `overflow at ${width}`).toBe(false)
    await expect(journey.getByRole('button', { name: 'Stories', exact: true })).toBeVisible()
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(journey.locator('video')).toBeHidden()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(journey.locator('video')).toBeVisible()
  await expect(journey.getByRole('button', { name: 'Play journey', exact: true })).toBeEnabled()

})

test('reduced motion uses decoded stills without requesting the video', async ({ page }) => {
  await memberFixture(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/explore')
  const journey = page.locator('.development-journey')
  await expect(journey.getByRole('button', { name: 'Still view' })).toBeDisabled()
  await expect(journey.locator('video')).toBeHidden()
  await page.getByRole('button', { name: 'Music', exact: true }).click()
  await expect(journey.getByText('Little moments, gathered into light.')).toBeVisible()
  expect(await journey.locator('img').evaluate(async (img: HTMLImageElement) => { await img.decode(); return img.naturalWidth > 0 })).toBe(true)
  const requests = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name))
  expect(requests.some(url => /three|createDevelopmentScene|bonding-43s\.mp4/i.test(url))).toBe(false)
})

test('video failure falls back to the stage illustrations', async ({ page }) => {
  await memberFixture(page)
  await page.route('**/a-little-sun-bonding-43s.mp4', route => route.abort())
  await page.goto('/explore')
  await expect(page.getByText('The video is unavailable. Explore the stages as still illustrations.')).toBeVisible()
  await page.getByRole('group', { name: 'Journey chapter' }).getByRole('button', { name: 'Stories', exact: true }).click()
  await expect(page.getByText('A few quiet words. A world to share.')).toBeVisible()
})

test('paused pregnancy content excludes the journey from Explore', async ({ page }) => {
  await memberFixture(page, true)
  await page.goto('/explore')
  await expect(page.getByRole('heading', { name: 'Find your next little moment' })).toBeVisible()
  await expect(page.locator('.development-journey')).toHaveCount(0)
  await expect(page.getByRole('group', { name: 'Filter', exact: true })).toBeVisible()
})
