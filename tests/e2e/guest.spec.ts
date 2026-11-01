import { expect, test } from '@playwright/test'

test('guest completes a sample without an account or microphone prompt', async ({ page, context }) => {
  // Any permission request would fail the test: none should be made for guests.
  await context.grantPermissions([])
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('link', { name: 'Try an activity' }).first().click()

  await expect(page.getByText('You are trying Little Bloom as a guest')).toBeVisible()
  const cards = page.getByRole('listitem')
  await expect(cards).toHaveCount(3)

  await page.getByRole('link', { name: 'Read a first story' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Read a first story' })).toBeVisible()
  await expect(page.getByText(/At the edge of a quiet village/)).toBeVisible()
  await page.getByRole('button', { name: 'Mark as done' }).click()
  await expect(page.getByText('Nicely done.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sign in to save' })).toBeVisible()
})

test('home page loads no film, 3D renderer or garden', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('.development-journey')).toHaveCount(0)
  await expect(page.locator('.hero-garden')).toHaveCount(0)
  await page.mouse.wheel(0, 10_000)
  await page.waitForLoadState('networkidle')
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map((r) => r.name))
  expect(resources.some((src) => /three|\.mp4/i.test(src))).toBe(false)
})

test('member routes redirect guests to sign-in', async ({ page }) => {
  await page.goto('/memories')
  await expect(page).toHaveURL(/\/sign-in$/)
})

test('pages have no horizontal overflow on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  for (const path of ['/', '/sample', '/privacy', '/help']) {
    await page.goto(path)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow, path).toBe(false)
  }
})
