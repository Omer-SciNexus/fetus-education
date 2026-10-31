import { test } from '@playwright/test'
import { admit, completeOnboarding, devSignIn, uniqueEmail } from './helpers'

// Visual review aid, not an assertion suite. Run with: SCREENSHOTS=1 npx playwright test screenshots
test.skip(!process.env.SCREENSHOTS, 'set SCREENSHOTS=1 to capture review screenshots')

test('capture key screens', async ({ page }, info) => {
  const dir = process.env.SCREENSHOT_DIR ?? 'test-results/screens'
  const shot = async (name: string) => {
    await page.getByRole('heading', { level: 1 }).first().waitFor()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `${dir}/${info.project.name}-${name}.png`, fullPage: true })
  }
  await page.goto('/')
  await shot('home')
  const email = uniqueEmail('shots')
  await admit(email)
  await devSignIn(page, email)
  await completeOnboarding(page, 'Robin')
  await shot('today')
  await page.goto('/activities/first-story')
  await shot('activity')
  await page.goto('/memories/new?kind=voice')
  await shot('new-memory')
  await page.goto('/family')
  await shot('family')
})
