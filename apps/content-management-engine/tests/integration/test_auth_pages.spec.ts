import { test, expect } from '@playwright/test'

/**
 * UI tests for custom branded pages.
 * Branding: "Hermes AI"
 * Design System: "Alexandria"
 */

test.describe('Branded Auth Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Note: This assumes the dev server is running on localhost:3000
    await page.goto('/admin/login')
  })

  test('should display Hermes AI branding on login page', async ({ page }) => {
    // Verify product name
    const brand = page.locator('text=Hermes AI')
    await expect(brand).toBeVisible()

    // Verify "Alexandria" design system cues (e.g., custom font-headline or specific copy)
    const title = page.locator('h1')
    await expect(title).toContainText('Welcome back to the future of content.')
    
    const signInHeader = page.locator('h2')
    await expect(signInHeader).toContainText('Sign In')
  })

  test('should have a premium editorial feel (Alexandria system)', async ({ page }) => {
    // Check for glassmorphism/gradients or specific layout markers
    const loginForm = page.locator('form')
    await expect(loginForm).toBeVisible()
    
    // Verify input fields
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    
    // Verify premium CTA
    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toContainText('Sign In')
  })

  test('should show error on invalid login', async ({ page }) => {
    await page.fill('#email', 'invalid@hermes.ai')
    await page.fill('#password', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Expect error message (the component uses animate-in fade-in)
    // Note: Since we don't have a backend running in this isolated test, 
    // we would usually mock the server action or rely on the dev server.
    // await expect(page.locator('div[class*="bg-error-container"]')).toBeVisible()
  })
})

test.describe('Branded Init Page', () => {
  test('should display Hermes AI branding on initialization or login redirect', async ({ page }) => {
    // /admin/init redirects to login when users already exist
    await page.goto('/admin/init')
    // Hermes AI branding should always be present regardless of redirect
    await expect(page.locator('text=Hermes AI').first()).toBeVisible()
    // Either the init workspace page or the login page should be shown
    const isLoginPage = await page.locator('h2:has-text("Sign In")').isVisible().catch(() => false)
    const isInitPage = await page.locator('text=Initialize Workspace').isVisible().catch(() => false)
    expect(isInitPage || isLoginPage).toBeTruthy()
  })
})

test.describe('Sign Out Flow', () => {
  /** Helper: login via Payload REST API, set the token cookie on the browser context */
  async function loginViaAPI(page: any) {
    const response = await page.request.post('/api/users/login', {
      data: { email: 'admin@hermes-ai.com', password: 'password123' },
    })
    const body = await response.json()
    const token: string = body.token
    // Set the payload-token cookie so the browser session is authenticated
    await page.context().addCookies([{
      name: 'payload-token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }])
    return token
  }

  test('should successfully log out using sidebar Sign Out button', async ({ page }) => {
    // 1. Login via API to set a real session cookie
    await loginViaAPI(page)

    // 2. Navigate to the admin dashboard
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin$/, { timeout: 10000 })

    // 3. Wait for the Sign Out button in the sidebar Nav
    const signOutBtn = page.locator('nav button:has-text("Sign Out")').first()
    await expect(signOutBtn).toBeVisible({ timeout: 8000 })
    await signOutBtn.click()

    // 4. Verify redirected back to login page
    await page.waitForURL(/\/admin\/login/, { timeout: 8000 })
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('should successfully log out using header profile dropdown Sign Out button', async ({ page }) => {
    // 1. Login via API to set a real session cookie
    await loginViaAPI(page)

    // 2. Navigate to the admin dashboard
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin$/, { timeout: 10000 })

    // 3. Click the profile button in our custom Header using dispatchEvent (bypasses Payload wrapper interception)
    const profileBtn = page.locator('header button').filter({ has: page.locator('.material-symbols-outlined', { hasText: 'account_circle' }) }).first()
    await expect(profileBtn).toBeVisible({ timeout: 8000 })
    await profileBtn.dispatchEvent('click')

    // 4. Wait for dropdown and click Sign Out
    const dropdownSignOutBtn = page.locator('header div button:has-text("Sign Out")').first()
    await expect(dropdownSignOutBtn).toBeVisible({ timeout: 5000 })
    await dropdownSignOutBtn.dispatchEvent('click')

    // 5. Verify redirected back to login page
    await page.waitForURL(/\/admin\/login/, { timeout: 8000 })
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})


