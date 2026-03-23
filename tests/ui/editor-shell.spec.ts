import { expect, test } from '@playwright/test'

test('loads the editor shell and opens the settings panel', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('editor-shell')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Site' })).toBeVisible()

  await page.getByRole('button', { name: 'Settings' }).click()

  await expect(page.getByText('Save & Load')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Audio Settings' })).toBeVisible()
})
