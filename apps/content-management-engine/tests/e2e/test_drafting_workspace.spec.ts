import { test, expect } from '@playwright/test'

test.describe('Drafting Workspace', () => {
  let authToken = ''

  test.beforeEach(async ({ page }) => {
    // Authenticate browser context via REST API login
    try {
      const loginResponse = await page.request.post('/api/users/login', {
        data: { email: 'admin@hermes-ai.com', password: 'password123' },
      })
      console.log(`[E2E Auth] Login response status: ${loginResponse.status()}`)
      if (loginResponse.ok()) {
        const body = await loginResponse.json()
        authToken = body.token
        await page.context().addCookies([{
          name: 'payload-token',
          value: body.token,
          domain: 'localhost',
          path: '/',
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        }])
      } else {
        const text = await loginResponse.text()
        throw new Error(`Login failed with status ${loginResponse.status()}: ${text}`)
      }
    } catch (err) {
      console.error('API authentication setup failed:', err)
      throw err
    }

    // Mock user auth session
    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'admin-id',
            email: 'admin@hermes-ai.com',
            role: 'super-admin',
            tenants: [
              {
                tenant: {
                  id: 'tenant-123',
                  name: 'Test Tenant'
                }
              }
            ]
          }
        })
      })
    })

    // Mock tenants response with an active tenant
    await page.route('**/api/tenants*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          docs: [
            { id: 'tenant-123', name: 'Test Tenant' }
          ]
        })
      })
    })

    // Mock style modifiers response
    await page.route('**/api/style-modifiers*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ docs: [] })
      })
    })

    // Consolidated content-types mocking
    await page.route('**/api/content-types*', async (route) => {
      const url = route.request().url()
      if (url.includes('/api/content-types/1') || url.includes('/api/content-types/blog-posts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '1',
            name: 'Blog Post',
            slug: 'blog-posts',
            fields: []
          })
        })
      } else if (url.includes('/api/content-types/2') || url.includes('/api/content-types/pages')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '2',
            name: 'Page',
            slug: 'pages',
            fields: []
          })
        })
      } else {
        // Assume list query (e.g. /api/content-types?limit=100&depth=0)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            docs: [
              { id: '1', name: 'Blog Post', slug: 'blog-posts' },
              { id: '2', name: 'Page', slug: 'pages' }
            ]
          })
        })
      }
    })

    page.on('console', msg => {
      console.log(`[Browser Console] [${msg.type()}] ${msg.text()}`)
    })
  })

  test('should show recovery dialog when an expired session exists', async ({ page }) => {
    // Mocking an expired session response
    await page.route('**/api/ai-drafting/sessions*', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
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
      } else {
        await route.continue()
      }
    })

    await page.goto('/admin/draft/1')
    
    // Check if recovery modal is visible using the correct component text
    const heading = page.getByRole('heading', { name: 'Unfinished Draft Found' })
    await expect(heading).toBeVisible()
    const description = page.getByText('We found a draft from your previous session')
    await expect(description).toBeVisible()
  })

  test('should display active schema banner with Change Schema button, and allow selecting alternative', async ({ page }) => {
    // Mock sessions GET (activeSession: null), POST (create active session), and PATCH (update session on select)
    await page.route('**/api/ai-drafting/sessions*', async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ activeSession: null })
        })
      } else if (method === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'session-123',
            contentType: '1',
            status: 'active',
            draftData: {}
          })
        })
      } else if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'session-123',
            contentType: '2',
            status: 'active',
            draftData: {}
          })
        })
      } else {
        await route.continue()
      }
    })

    // Navigate to drafting page
    await page.goto('/admin/draft/1')

    // Verify schema banner is rendered and has the correct content
    // Specifically target the schema banner container to avoid parent matching issues
    const banner = page.locator('.mx-4.mt-3.mb-1').filter({ hasText: 'Active Schema' })
    await expect(banner).toBeVisible()
    await expect(banner).toContainText('Active Schema')
    await expect(banner).toContainText('Blog Post')

    // Verify Change Schema button is visible
    const changeSchemaBtn = page.locator('button:has-text("Change Schema")')
    await expect(changeSchemaBtn).toBeVisible()

    // Click Change Schema
    await changeSchemaBtn.click()

    // Verify alternative list shows Page, scoping to the schema banner to avoid sidebar links conflict
    const pageAltBtn = banner.locator('button:has-text("Page")')
    await expect(pageAltBtn).toBeVisible()

    // Click on the Page alternative
    await pageAltBtn.click()

    // Verify page title / content type switches to Page
    // Since we redirect to `/admin/draft/2`, verify page URL updates
    await expect(page).toHaveURL(/\/admin\/draft\/2/)
  })

  test('should show schema banner and Change Schema button after AI proposes a schema when starting with a new draft', async ({ page }) => {
    let sessionCreated = false
    // Mock sessions GET (activeSession: null initially, then return session-new-123), POST, and PATCH
    await page.route('**/api/ai-drafting/sessions*', async (route) => {
      const method = route.request().method()
      const url = route.request().url()
      if (method === 'GET') {
        if (sessionCreated || url.includes('contentType=1')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              activeSession: {
                id: 'session-new-123',
                contentType: '1',
                status: 'active',
                draftData: {}
              }
            })
          })
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ activeSession: null })
          })
        }
      } else if (method === 'POST') {
        sessionCreated = true
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'session-new-123',
            contentType: null,
            status: 'active',
            draftData: {}
          })
        })
      } else if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'session-new-123',
            contentType: '1',
            status: 'active',
            draftData: {}
          })
        })
      } else {
        await route.continue()
      }
    })

    // Mock AI drafting SSE stream to return a SCHEMA_UPDATED event
    await page.route('**/api/ai/draft', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: 'event: SCHEMA_UPDATED\ndata: {"contentType":{"id":"1","name":"Blog Post","slug":"blog-posts","fields":[]},"alternatives":[{"id":"2","name":"Page","slug":"pages"}]}\n\n'
      })
    })

    // Navigate to drafting page in bootstrap mode
    await page.goto('/admin/draft/new')

    // Verify that the schema banner is NOT visible initially
    const banner = page.locator('.mx-4.mt-3.mb-1').filter({ hasText: 'Active Schema' })
    await expect(banner).not.toBeVisible()

    // Type a prompt in the chat panel input and submit it
    const textarea = page.locator('textarea[placeholder*="Instruct the AI"]')
    await textarea.fill('create a blog post about cars')
    
    const sendButton = page.locator('button:has(svg path)').first()
    await sendButton.click()

    // Verify schema banner becomes visible and has correct content
    await expect(banner).toBeVisible({ timeout: 10000 })
    await expect(banner).toContainText('Active Schema')
    await expect(banner).toContainText('Blog Post')

    // Verify Change Schema button is visible
    const changeSchemaBtn = page.locator('button:has-text("Change Schema")')
    await expect(changeSchemaBtn).toBeVisible()

    // Click Change Schema
    await changeSchemaBtn.click()

    // Verify alternative list shows Page
    const pageAltBtn = banner.locator('button:has-text("Page")')
    await expect(pageAltBtn).toBeVisible()

    // Click on the Page alternative
    await pageAltBtn.click()

    // Verify page URL updates
    await expect(page).toHaveURL(/\/admin\/draft\/2/)
  })
})
