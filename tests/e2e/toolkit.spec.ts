import { expect, test } from '@playwright/test'
import { admit, completeOnboarding, devSignIn, uniqueEmail } from './helpers'

function isoDaysFromToday(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

test('owner: due date from last period, week guide, family plan and keepsake book', async ({ page }) => {
  const email = uniqueEmail('toolkit')
  await admit(email)
  await devSignIn(page, email)
  await completeOnboarding(page, 'Kim')

  // Due date from the first day of the last period: 168 days ago -> about 24 weeks.
  await page.goto('/settings/preferences')
  await page.getByText('Don’t know your due date?').click()
  await page.getByLabel('First day of your last period').fill(isoDaysFromToday(-168))
  await page.getByRole('button', { name: /as my estimated due date/ }).click()
  await page.getByLabel('Bump nickname (optional)').fill('Peanut')
  await page.getByRole('button', { name: 'Save details' }).click()
  await expect(page.getByText('Pregnancy details saved.')).toBeVisible()

  await page.goto('/today')
  await expect(page.getByRole('link', { name: /Around week 24/ })).toBeVisible()
  await expect(page.getByText('Today’s little conversation')).toBeVisible()

  await page.getByRole('link', { name: /Around week 24/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Week by week')
  await expect(page.getByText('This week', { exact: true })).toBeVisible()
  await expect(page.getByText('Placeholder content — not yet clinically reviewed')).toBeVisible()
  await page.getByRole('button', { name: 'Next week' }).click()
  await expect(page).toHaveURL(/w=25/)

  // Family plan: an idea chip, a typed entry, a tick, and a hearted name.
  await page.getByRole('navigation', { name: 'Main' }).first().getByRole('link', { name: 'You' }).click()
  await expect(page.getByRole('heading', { name: 'Your toolkit' })).toBeVisible()
  await page.getByRole('link', { name: /Family plan/ }).click()
  await expect(page.getByRole('navigation', { name: 'Main' }).first().getByRole('link', { name: 'You' })).toHaveClass(/active/)
  await page.getByRole('button', { name: 'Phone and long charger' }).click()
  await expect(page.getByLabel('Phone and long charger: packed')).toBeVisible()
  await page.getByLabel('Add something to pack').fill('Favourite pillow')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByLabel('Favourite pillow: packed').check()
  await expect(page.getByText('1 of 2 packed')).toBeVisible()

  await page.getByRole('button', { name: 'Baby names' }).click()
  await page.getByLabel('Add a name').fill('Robin')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByRole('button', { name: 'Heart Robin' }).click()
  await expect(page.getByRole('button', { name: 'Remove your heart from Robin' })).toHaveAttribute('aria-pressed', 'true')

  // Little conversation -> a written memory -> the keepsake book.
  await page.goto('/talk')
  await page.getByRole('link', { name: 'Write it instead' }).click()
  await expect(page.getByLabel('Title (optional)')).toHaveValue('A little conversation')
  await page.getByLabel('Your memory').fill('Told Peanut about the rain today.')
  await page.getByRole('button', { name: 'Save memory' }).click()
  await expect(page.getByText('Saved.')).toBeVisible()

  await page.goto('/memories/book')
  await expect(page.getByRole('heading', { name: 'For Peanut' })).toBeVisible()
  await expect(page.getByText('Told Peanut about the rain today.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Print or save as PDF' })).toBeVisible()
})

test('pausing pregnancy content hides the week guide', async ({ page }) => {
  const email = uniqueEmail('toolkit-pause')
  await admit(email)
  await devSignIn(page, email)
  await completeOnboarding(page, 'Lee')

  await page.goto('/settings/preferences')
  await page.getByLabel('Estimated due date').fill(isoDaysFromToday(60))
  await page.getByRole('button', { name: 'Save details' }).click()
  await expect(page.getByText('Pregnancy details saved.')).toBeVisible()
  await page.goto('/today')
  await expect(page.getByRole('link', { name: /Around week/ })).toBeVisible()

  await page.goto('/settings')
  await page.getByRole('switch', { name: 'Pause pregnancy content' }).click()
  await expect(page.getByText('Pregnancy content paused.')).toBeVisible()

  await page.goto('/today')
  await expect(page.getByRole('link', { name: /Around week/ })).toHaveCount(0)
  await page.goto('/settings')
  await expect(page.getByRole('link', { name: /Week by week/ })).toHaveCount(0)
  await page.goto('/weeks')
  await expect(page.getByText('The weekly guide is hidden while pregnancy content is paused.')).toBeVisible()
})
