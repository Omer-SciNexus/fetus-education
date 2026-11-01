import { expect, test } from '@playwright/test'
import { admit, completeOnboarding, devSignIn, uniqueEmail } from './helpers'

// Optional visual review with image-loading and overflow checks.
// Run with: SCREENSHOTS=1 npx playwright test screenshots
test.skip(!process.env.SCREENSHOTS, 'set SCREENSHOTS=1 to capture review screenshots')

test('capture key screens', async ({ page }, info) => {
  const dir = process.env.SCREENSHOT_DIR ?? 'test-results/screens'
  const shot = async (name: string) => {
    await page.getByRole('heading', { level: 1 }).first().waitFor()
    await page.waitForLoadState('networkidle')
    await page.locator('img').evaluateAll(async (images) => {
      // Lazy images below the fold never start loading on their own, so decode() would wait forever.
      for (const image of images) (image as HTMLImageElement).loading = 'eager'
      await Promise.all(images.map((image) => (image as HTMLImageElement).decode()))
    })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      `${name}: horizontal overflow`,
    ).toBe(false)
    await page.screenshot({ path: `${dir}/${info.project.name}-${name}.png`, fullPage: true })
  }
  test.setTimeout(120_000)
  await page.goto('/sign-in')
  await shot('sign-in')
  await page.goto('/')
  await shot('home')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await shot('home-reduced-motion')
  await page.emulateMedia({ reducedMotion: null })
  const email = uniqueEmail('shots')
  await admit(email)
  await devSignIn(page, email)
  await completeOnboarding(page, 'Robin')
  await shot('today')
  await page.goto('/explore')
  await shot('explore')
  await page.goto('/explore?f=program')
  await shot('program')
  await page.goto('/memories')
  await shot('memories')
  await page.goto('/activities/first-story')
  await shot('activity')
  await page.goto('/memories/new?kind=voice')
  await shot('new-memory')
  await page.goto('/family')
  await shot('family')
  await page.goto('/settings')
  await shot('settings')
  await page.goto('/settings/preferences')
  await shot('preferences')
  // A due date about 24 weeks along, so Today and the toolkit show the week guide.
  const due = new Date()
  due.setDate(due.getDate() + 112)
  await page
    .getByLabel('Estimated due date')
    .fill(`${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`)
  await page.getByLabel('Bump nickname (optional)').fill('Peanut')
  await page.getByRole('button', { name: 'Save details' }).click()
  await page.getByText('Pregnancy details saved.').waitFor()
  await page.goto('/today')
  await shot('today-with-week')
  for (const [route, name] of [
    ['/weeks', 'weeks'],
    ['/talk', 'talk'],
    ['/breathe', 'breathe'],
    ['/plan', 'plan'],
    ['/memories/book', 'keepsake-book'],
  ] as const) {
    await page.goto(route)
    await shot(name)
  }
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of [
      '/today',
      '/explore',
      '/memories',
      '/memories/new?kind=voice',
      '/family',
      '/settings',
      '/settings/preferences',
      '/explore?f=program',
      '/weeks',
      '/talk',
      '/breathe',
      '/plan?list=names',
      '/memories/book',
    ]) {
      await page.goto(route)
      await page.getByRole('heading', { level: 1 }).first().waitFor()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        `${route} at ${width}px`,
      ).toBe(false)
    }
  }
})
