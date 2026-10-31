import { expect, test } from '@playwright/test'
import { admit, completeOnboarding, devSignIn, uniqueEmail } from './helpers'

test('owner: sign in -> onboarding -> activity -> text memory', async ({ page }) => {
  const email = uniqueEmail('owner')
  await admit(email)
  await devSignIn(page, email)
  await completeOnboarding(page, 'Sam')

  await expect(page).toHaveURL(/\/today/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Sam')
  await page.getByRole('link', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Mark as done' }).click()
  await expect(page.getByText(/You completed this on/)).toBeVisible()
  // Completing is idempotent and reversible.
  await page.getByRole('button', { name: 'Mark as not done' }).click()
  await page.getByRole('button', { name: 'Mark as done' }).click()

  await page.getByRole('link', { name: 'Save a memory' }).click()
  await page.getByLabel('Title (optional)').fill('First hello')
  await page.getByLabel('Your memory').fill('Today we said hello for the first time.')
  await page.getByRole('button', { name: 'Save memory' }).click()
  await expect(page.getByText('Saved.')).toBeVisible()
  await expect(page.getByText('Private')).toBeVisible()

  await page.goto('/memories')
  await expect(page.getByRole('link', { name: 'First hello' })).toBeVisible()
})

test('non-admitted users see a clear message', async ({ page }) => {
  await devSignIn(page, uniqueEmail('stranger'))
  await expect(page.getByRole('heading', { name: "You're not on the pilot list yet" })).toBeVisible()
})

test('partner joins, sees only shared memories, and can be revoked', async ({ browser }) => {
  const ownerEmail = uniqueEmail('owner')
  await admit(ownerEmail)
  const ownerCtx = await browser.newContext()
  const owner = await ownerCtx.newPage()
  await devSignIn(owner, ownerEmail)
  await completeOnboarding(owner, 'Alex')

  for (const [title, vis] of [['Private note', 'Only me'], ['Shared note', 'Share with my family partner']] as const) {
    await owner.goto('/memories/new')
    await owner.getByLabel('Title (optional)').fill(title)
    await owner.getByLabel('Your memory').fill(`${title} body`)
    await owner.getByText(vis, { exact: true }).click()
    await owner.getByRole('button', { name: 'Save memory' }).click()
    await expect(owner.getByText('Saved.')).toBeVisible()
  }

  await owner.goto('/family')
  await owner.getByRole('button', { name: 'Create invitation link' }).click()
  const link = await owner.getByLabel('Invitation link').inputValue()
  expect(link).toMatch(/\/join#token=[0-9a-f]{64}$/)

  const partnerCtx = await browser.newContext()
  const partner = await partnerCtx.newPage()
  await partner.goto(link)
  await expect(partner.getByRole('heading', { name: "You've been invited" })).toBeVisible()
  expect(partner.url()).not.toContain('token=') // removed from the address bar
  await partner.getByRole('button', { name: 'Sign in to accept' }).click()
  await partner.getByLabel('Email').fill(uniqueEmail('partner'))
  await partner.getByLabel('Password').fill('test-password-123')
  await partner.getByRole('button', { name: 'Sign in (dev)' }).click()
  await partner.getByRole('button', { name: 'Accept' }).click()
  await completeOnboarding(partner, 'Jo')

  await partner.goto('/memories')
  await expect(partner.getByRole('link', { name: 'Shared note' })).toBeVisible()
  await expect(partner.getByRole('link', { name: 'Private note' })).toHaveCount(0)

  await owner.goto('/family')
  await owner.getByRole('button', { name: 'Remove partner' }).click()
  await owner.getByRole('dialog').getByRole('button', { name: 'Remove partner' }).click()
  await expect(owner.getByRole('button', { name: 'Create invitation link' })).toBeVisible()

  await partner.goto('/memories')
  await expect(partner.getByRole('link', { name: 'Shared note' })).toHaveCount(0)

  await ownerCtx.close()
  await partnerCtx.close()
})
