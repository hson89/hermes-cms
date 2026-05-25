import { test, expect } from '@playwright/test'

test.describe('Page Template Wizard', () => {
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

    // Mock login response
    await page.route('**/api/users/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-token',
          user: {
            id: 'admin-id',
            email: 'admin@hermes-ai.com',
            role: 'super-admin',
            tenants: [{ tenant: { id: 'tenant-123', name: 'Acme Corp' } }]
          }
        })
      })
    })

    // Mock authentication
    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'admin-id',
            email: 'admin@hermes-ai.com',
            role: 'super-admin',
            tenants: [{ tenant: { id: 'tenant-123', name: 'Acme Corp' } }]
          }
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
            { id: 'ct-1', name: 'Article', slug: 'article' },
            { id: 'ct-2', name: 'Product', slug: 'product' },
          ],
        })
      })
    })

    // Mock template creation
    await page.route('**/api/page-templates', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            doc: { id: 'new-template-id' }
          })
        })
      } else {
        await route.continue()
      }
    })
  })

  test('should render the wizard and allow creating a template', async ({ page }) => {
    // Navigate to admin first to establish session
    await page.goto('/admin')
    
    // Check if we are redirected to login
    const h1 = page.locator('h1')
    const h1Text = await h1.innerText()
    if (h1Text.includes('Welcome back')) {
      console.log('Redirected to login, trying to navigate directly...')
    }

    // Navigate to create page
    await page.goto('/admin/collections/page-templates/create')

    // Verify header
    await expect(page.locator('h1')).toContainText('Draft New Template')

    // Fill nomenclature
    await page.fill('#templateName', 'Test Landing Page')
    await page.fill('#templateDesc', 'A test landing page template')

    // Content Type Binding
    const searchInput = page.locator('#contentTypeSearch')
    await searchInput.click()
    
    // Select 'Article' from dropdown
    await page.click('text=Article')
    
    // Verify selection (placeholder changes to name)
    await expect(searchInput).toHaveAttribute('placeholder', 'Article')

    // Select 'Minimal' archetype
    await page.click('text=Archival Minimal')

    // Click Initialize
    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).not.toBeDisabled()
    await submitBtn.click()

    // Verify redirection (check URL)
    await expect(page).toHaveURL(/\/admin\/collections\/page-templates\/new-template-id/)
    
    // Verify Visual Builder placeholder on edit view
    await expect(page.locator('h2')).toContainText('Visual Builder')
  })
})
