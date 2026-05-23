import { test, expect } from '@playwright/test'

test.describe('Drafting Workspace Recovery', () => {
  test('should show recovery dialog when an expired session exists', async ({ page }) => {
    // Mocking an expired session response
    await page.route('/api/ai-drafting/sessions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          activeSession: {
            id: 'expired-1',
            status: 'expired',
            draftData: { title: 'Recovered Title' }
          }
        })
      })
    })

    await page.goto('/admin/draft/blog-posts')
    
    // Check if recovery modal is visible
    const modal = page.locator('.recovery-dialog')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('Recover your previous draft?')
  })
})
