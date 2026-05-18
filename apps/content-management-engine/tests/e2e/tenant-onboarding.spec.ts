import { test, expect } from '@playwright/test'

/**
 * T032 - End-to-end test for tenant onboarding
 */
test.describe('Tenant Onboarding Flow', () => {
  test('should allow super-admin to create and configure a tenant', async ({ page }) => {
    // 1. Login as Super Admin
    await page.goto('/admin/login')
    await page.fill('input[name="email"]', 'admin@hermes-ai.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // 2. Navigate to Tenants
    await page.goto('/admin/collections/tenants')
    await page.click('a:has-text("Create New")')

    // 3. Fill Tenant Details
    await page.fill('input[name="name"]', 'E2E Tenant')
    await page.fill('input[name="slug"]', 'e2e-tenant')
    
    // Select Tier
    await page.click('.field-type-select[name="tier"] .react-select__control')
    await page.click('.react-select__option:has-text("Premium")')

    // Add Domain
    await page.click('.field-type-array[name="domains"] button:has-text("Add")')
    await page.fill('input[name="domains.0.hostname"]', 'e2e.test.com')

    // 4. Save
    await page.click('button#action-save')

    // 5. Verify Success
    await expect(page.locator('.toast--success')).toBeVisible()
    await expect(page).toHaveURL(/\/admin\/collections\/tenants\/.+/)
  })
})
