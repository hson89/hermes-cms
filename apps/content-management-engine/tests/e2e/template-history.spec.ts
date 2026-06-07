import { test, expect } from '@playwright/test'

test.describe('Template Deployment History UI', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate via REST API
    const loginResponse = await page.request.post('/api/users/login', {
      data: { email: 'admin@hermes-ai.com', password: 'password123' },
    })
    
    if (loginResponse.ok()) {
      const body = await loginResponse.json()
      await page.context().addCookies([{
        name: 'payload-token',
        value: body.token,
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      }])
    }

    // Navigate to Deployment History
    await page.goto('/admin/templates/history')
  })

  test('should render the deployment history page with Alexandria header', async ({ page }) => {
    // Check for RegistryHeader title
    const headerTitle = page.locator('h1')
    await expect(headerTitle).toContainText('Deployment History')
    
    // Check for breadcrumbs
    const breadcrumbs = page.locator('nav[aria-label="Breadcrumb"]')
    await expect(breadcrumbs).toBeVisible()
    await expect(breadcrumbs).toContainText('Hermes CMS')
    await expect(breadcrumbs).toContainText('Deployment History')
  })

  test('should display the registry table', async ({ page }) => {
    // Check for RegistryTable
    const table = page.locator('table')
    await expect(table).toBeVisible()
    
    // Check for column headers (Template, Site, Status, Date)
    const headers = table.locator('thead th')
    await expect(headers.nth(0)).toContainText('Template')
    await expect(headers.nth(1)).toContainText('Hosted Site')
    await expect(headers.nth(2)).toContainText('Status')
    await expect(headers.nth(3)).toContainText('Deployment Date')
  })
})
