import { test, expect } from '@playwright/test'

test.describe('Page Template Actions (Archive/Delete)', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate via mock token
    await page.context().addCookies([{
      name: 'payload-token',
      value: 'mock-token',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }])

    // Mock authentication
    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'admin-id',
            name: 'Admin User',
            email: 'admin@hermes-ai.com',
            role: 'super-admin',
            tenants: [{ tenant: { id: 'tenant-123', name: 'Acme Corp' } }]
          }
        })
      })
    })

    // Mock template data fetch
    await page.route('**/api/page-templates/temp-123*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'temp-123',
          name: 'Editorial Longform V2',
          description: 'Test description',
          status: 'draft',
          archetype: 'longform',
          contentType: { id: 'ct-1', name: 'In-Depth Article', slug: 'article_longform' },
          createdAt: '2026-05-20T10:00:00.000Z',
          updatedAt: '2026-05-23T15:30:00.000Z',
          createdBy: { id: 'admin-id', name: 'Admin User' }
        })
      })
    })

    // Mock content types fetch
    await page.route('**/api/content-types?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          docs: [
            { id: 'ct-1', name: 'In-Depth Article', slug: 'article_longform' },
          ],
        })
      })
    })
  })

  test('should display real metadata and allow archiving', async ({ page }) => {
    await page.goto('/admin/collections/page-templates/temp-123')

    // Verify metadata
    await expect(page.locator('text=Created by Admin User')).toBeVisible()
    await expect(page.locator('text=Last modified')).toContainText('2026')

    // Verify TopNavBar visibility (should show breadcrumbs)
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible()
    await expect(page.locator('text=Edit Template')).toBeVisible()

    // Mock Archive request
    await page.route('**/api/page-templates/temp-123', async (route) => {
      if (route.request().method() === 'PATCH') {
        const body = JSON.parse(route.request().postData() || '{}')
        if (body.status === 'archived') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ id: 'temp-123', status: 'archived' })
          })
          return
        }
      }
      await route.continue()
    })

    // Click Archive
    const archiveBtn = page.locator('button:has-text("Archive Template")')
    await archiveBtn.click()

    // Verify Success Toast
    await expect(page.locator('text=Template archived successfully')).toBeVisible()
    
    // Verify Status Pill in TopNavBar updated
    await expect(page.locator('button:has-text("Archived")')).toBeVisible()
  })

  test('should allow deleting with confirmation', async ({ page }) => {
    await page.goto('/admin/collections/page-templates/temp-123')

    // Mock Delete request
    await page.route('**/api/page-templates/temp-123', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204 })
        return
      }
      await route.continue()
    })

    // Handle dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('delete this template')
      await dialog.accept()
    })

    // Click Delete
    const deleteBtn = page.locator('button:has-text("Delete Template")')
    await deleteBtn.click()

    // Verify redirection to library
    await expect(page).toHaveURL(/\/admin\/collections\/page-templates/)
  })
})
