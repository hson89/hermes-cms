import { test, expect } from '@playwright/test'

/**
 * FR-011 - Playwright UI test suite for dynamic content types AI generator and visual diff engine.
 */
test.describe('Dynamic Content Types Creator and Visual Diff Engine', () => {
  
  test.beforeEach(async ({ page }) => {
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

    // 2. Mock polling session status (first returns processing, then success)
    let pollCount = 0
    await page.route('**/api/content-types/session/session_abc_123', async (route) => {
      pollCount++
      if (pollCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'processing',
            logs: ['[INFO] AI Agent initialized.', '[INFO] Analyzing entity associations.'],
          })
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'success',
            logs: ['[INFO] AI Agent initialized.', '[INFO] Analyzing entity associations.', '[SUCCESS] Watch catalog schema successfully generated.'],
            contentTypeId: 'watch-id-123',
          })
        })
      }
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
    const promptTextarea = page.locator('textarea[placeholder*="Describe the content type"]')
    await expect(promptTextarea).toBeVisible()
    await promptTextarea.fill('Create a Luxury Watch Catalog with name, price, brand options.')
    
    const generateBtn = page.locator('button:has-text("Generate Schema")')
    await generateBtn.click()

    // 7. Verify Terminal observability output
    const terminal = page.locator('.terminal-console-output, pre')
    await expect(terminal).toContainText('AI Agent initialized')
    await expect(terminal).toContainText('Watch catalog schema successfully generated')
  })

  test('should render visual diff badges ("Added", "Modified") and audit deleted fields in visual refiner', async ({ page }) => {
    // 1. Mock content type detail route with custom fields and originalSchema
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
              { name: 'name', label: 'Watch Name (Modified)', type: 'text', required: true, localized: true }, // Modified label, added localized
              { name: 'new_serial_number', label: 'Serial Number', type: 'text', required: false } // Added field
              // Removed field "price" (originally present)
            ]
          },
          originalSchema: {
            name: 'Luxury Watch Catalog',
            fields: [
              { name: 'name', label: 'Watch Name', type: 'text', required: true },
              { name: 'price', label: 'Price', type: 'number', required: false }
            ]
          },
          updatedAt: '2026-05-17T13:00:00.000Z'
        })
      })
    })

    // 2. Mock content items check
    await page.route('**/api/content-items?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ docs: [] })
      })
    })

    // 3. Navigate to visual refiner canvas directly
    await page.goto('/admin/collections/content-types/watch-id-123/edit')

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
    const localizedBadge = page.locator('.custom-editor-view >> text=Loc')
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
