import { test, expect } from '@playwright/test'

/**
 * FR-011 - Playwright UI test suite for dynamic content types AI generator and visual diff engine.
 */
test.describe('Dynamic Content Types Creator and Visual Diff Engine', () => {
  let authToken = ''
  let tenantId: any = null
  
  test.beforeEach(async ({ page }) => {
    // Authenticate browser context via REST API login
    try {
      const loginResponse = await page.request.post('/api/users/login', {
        data: { email: 'admin@hermes-ai.com', password: 'password123' },
      })
      console.log('E2E API Login Status:', loginResponse.status())
      if (loginResponse.ok()) {
        const body = await loginResponse.json()
        authToken = body.token
        tenantId = body.user.tenants?.[0]?.tenant?.id || body.user.tenants?.[0]?.tenant
        await page.context().addCookies([{
          name: 'payload-token',
          value: body.token,
          domain: 'localhost',
          path: '/',
          httpOnly: false,
          secure: false,
          sameSite: 'Lax',
        }])
        console.log('E2E API Login Success, token cookie added. Tenant:', tenantId)
      } else {
        console.warn('E2E API Login Failed:', await loginResponse.text())
      }
    } catch (err) {
      console.warn('API authentication setup failed with error:', err)
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
          }
        })
      })
    })

    // Mock initial empty list of content types
    await page.route('**/api/content-types?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          docs: [],
          totalDocs: 0,
          limit: 10,
          totalPages: 1,
          page: 1,
        })
      })
    })
  })

  test('should execute AI schema generation with polling terminal logs', async ({ page }) => {
    // 1. Mock the dynamic schema generation endpoint (returns session ID)
    await page.route('**/api/content-types/generate-schema', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: 'session_abc_123',
          status: 'processing',
        })
      })
    })

    // 2. Mock SSE Message stream to simulate the real-time AI generation pipeline and schema deltas
    await page.route('**/api/content-types/sessions/session_abc_123/message', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: [
          'event: STATUS_UPDATE\ndata: generating\n\n',
          'event: TEXT_DELTA\ndata: {"delta": "Generating your Luxury Watch Catalog..."}\n\n',
          'event: STATUS_UPDATE\ndata: validating\n\n',
          'event: STATE_DELTA\ndata: {"name": "Luxury Watch Catalog", "fields": [{"name": "name", "label": "Watch Name", "type": "text", "required": true}, {"name": "price", "label": "Price", "type": "number", "required": false}, {"name": "brand", "label": "Brand", "type": "select", "options": ["Rolex", "Omega"]}]}\n\n',
          'event: STATUS_UPDATE\ndata: completed\n\n',
        ].join(''),
      })
    })

    // 3. Mock the detail fetch of the newly generated content type
    await page.route('**/api/content-types/watch-id-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'watch-id-123',
          name: 'Luxury Watch Catalog',
          slug: 'luxury-watch-catalog',
          status: 'draft',
          schema: {
            name: 'Luxury Watch Catalog',
            fields: [
              { name: 'name', label: 'Watch Name', type: 'text', required: true },
              { name: 'price', label: 'Price', type: 'number', required: false },
              { name: 'brand', label: 'Brand', type: 'select', options: ['Rolex', 'Omega'] }
            ]
          },
          originalSchema: {
            name: 'Luxury Watch Catalog',
            fields: [
              { name: 'name', label: 'Watch Name', type: 'text', required: true },
              { name: 'price', label: 'Price', type: 'number', required: false },
              { name: 'brand', label: 'Brand', type: 'select', options: ['Rolex', 'Omega'] }
            ]
          },
          updatedAt: '2026-05-17T13:00:00.000Z'
        })
      })
    })

    // 4. Mock content items count check (none exist yet)
    await page.route('**/api/content-items?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ docs: [] })
      })
    })

    // 5. Navigate to CMS content-types index view and enter Generator
    await page.goto('/admin/collections/content-types')
    
    // Simulate navigation to the create/generator page
    await page.goto('/admin/collections/content-types/create')

    // 6. Enter Prompt and generate schema
    const promptTextarea = page.locator('textarea[placeholder*="Instruct the AI"]')
    await expect(promptTextarea).toBeVisible()
    await promptTextarea.fill('Create a Luxury Watch Catalog with name, price, brand options.')
    
    const generateBtn = page.locator('button:has-text("arrow_upward")')
    await generateBtn.click()

    // 7. Verify fields were generated dynamically and populated in visual workspace
    await expect(page.locator('.custom-generator-view').getByText('Watch Name', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.custom-generator-view').getByText('Price', { exact: true })).toBeVisible()
    await expect(page.locator('.custom-generator-view').getByText('Brand', { exact: true })).toBeVisible()
  })

  test('should render visual diff badges ("Added", "Modified") and audit deleted fields in visual refiner', async ({ page }) => {
    // 1. Create a real Content Type document in the database
    let createdId = ''
    try {
      const createResponse = await page.request.post('/api/content-types', {
        headers: {
          Authorization: `JWT ${authToken}`,
        },
        data: {
          name: 'Luxury Watch Catalog',
          slug: `luxury-watch-catalog-${Date.now()}`,
          status: 'draft',
          schema: {
            name: 'Luxury Watch Catalog',
            fields: [
              { name: 'name', label: 'Watch Name (Modified)', type: 'text', required: true, localized: true }, // Modified label, added localized
              { name: 'new_serial_number', label: 'Serial Number', type: 'text', required: false } // Added field
            ]
          },
          originalSchema: {
            name: 'Luxury Watch Catalog',
            fields: [
              { name: 'name', label: 'Watch Name', type: 'text', required: true },
              { name: 'price', label: 'Price', type: 'number', required: false }
            ]
          },
          tenant: tenantId
        }
      })
      if (createResponse.ok()) {
        const body = await createResponse.json()
        createdId = String(body.doc.id)
        console.log('E2E created real Content Type with ID:', createdId)
      } else {
        console.warn('Failed to create document:', await createResponse.text())
      }
    } catch (err) {
      console.warn('Failed to create document with error:', err)
    }

    expect(createdId).not.toBe('')

    // 2. Mock content items check
    await page.route('**/api/content-items?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ docs: [] })
      })
    })

    // 3. Navigate to visual refiner canvas directly
    await page.goto(`/admin/collections/content-types/${createdId}`)

    // 4. Verify "Modified" badge is visible on the "name" field
    const modifiedFieldRow = page.locator('.custom-editor-view >> text=Watch Name (Modified)')
    await expect(modifiedFieldRow).toBeVisible()
    
    const modifiedBadge = page.locator('.visual-diff-badge:has-text("Modified")')
    await expect(modifiedBadge).toBeVisible()

    // 5. Verify "Added" badge is visible on the "new_serial_number" field
    const addedFieldRow = page.locator('.custom-editor-view >> text=Serial Number')
    await expect(addedFieldRow).toBeVisible()
    
    const addedBadge = page.locator('.visual-diff-badge:has-text("Added")')
    await expect(addedBadge).toBeVisible()

    // 6. Verify "Loc" badge is visible since localized is true
    const localizedBadge = page.locator('.custom-editor-view').getByText('Loc', { exact: true })
    await expect(localizedBadge).toBeVisible()

    // 7. Verify "Removed AI Suggestions" audit logger panel renders the deleted "price" field
    const removedPanel = page.locator('.removed-ai-fields-panel')
    await expect(removedPanel).toBeVisible()
    await expect(removedPanel).toContainText('Removed AI Suggestions')
    await expect(removedPanel).toContainText('price')
    await expect(removedPanel).toContainText('Price')
    await expect(removedPanel).toContainText('number')
  })
})
