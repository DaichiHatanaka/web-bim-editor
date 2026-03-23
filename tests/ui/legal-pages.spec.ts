import { expect, test } from '@playwright/test'

test('navigates between the legal pages', async ({ page }) => {
  await page.goto('/terms')

  await expect(page.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeVisible()

  await page.getByRole('link', { name: 'Privacy Policy' }).click()

  await expect(page).toHaveURL(/\/privacy$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible()
})
