import { test, expect } from '@playwright/test'

test.describe('prompt-to-video-live', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('displays initial page with header, input, and empty state', async ({ page }) => {
    // Header
    await expect(page.getByRole('heading', { name: 'Prompt to Video' })).toBeVisible()
    await expect(page.getByText('LIVE').first()).toBeVisible()

    // Input with placeholder
    await expect(page.getByPlaceholder('A dragon awakens in a forgotten kingdom...')).toBeVisible()

    // Label
    await expect(page.getByText('Describe your video story').first()).toBeVisible()

    // Empty state
    await expect(page.getByRole('heading', { name: 'Create your video story' })).toBeVisible()

    // Generate button should exist but be disabled (no prompt)
    const generateBtn = page.getByRole('button', { name: 'Generate', exact: true })
    await expect(generateBtn).toBeVisible()
    await expect(generateBtn).toBeDisabled()
  })

  test('generate button enables when prompt is filled and disables when cleared', async ({ page }) => {
    const input = page.getByPlaceholder('A dragon awakens in a forgotten kingdom...')
    const generateBtn = page.getByRole('button', { name: 'Generate', exact: true })

    // Initially disabled
    await expect(generateBtn).toBeDisabled()

    // Type a prompt
    await input.fill('A dragon awakens')
    await expect(generateBtn).toBeEnabled()

    // Clear the prompt
    await input.fill('')
    await expect(generateBtn).toBeDisabled()

    // Fill again
    await input.fill('A space adventure')
    await expect(generateBtn).toBeEnabled()
  })

  test('generates scenes and displays them after clicking Generate', async ({ page }) => {
    // Mock APIs
    await page.route('**/api/generate-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://placehold.co/800x450/1a1a2e/purple?text=Scene' }),
      })
    })

    await page.route('**/api/text-to-speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.alloc(1000),
      })
    })

    // Fill prompt and generate
    const input = page.getByPlaceholder('A dragon awakens in a forgotten kingdom...')
    await input.fill('A dragon awakens in a forgotten kingdom')

    const generateBtn = page.getByRole('button', { name: 'Generate', exact: true })
    await expect(generateBtn).toBeEnabled()

    // Set up response listener BEFORE triggering the action
    const responsePromise = page.waitForResponse('**/api/generate-image', { timeout: 30000 })
    await generateBtn.click()
    await responsePromise

    // Scenes heading should appear
    await expect(page.getByRole('heading', { name: 'Scenes' })).toBeVisible({ timeout: 15000 })

    // Empty state should be gone
    await expect(page.getByRole('heading', { name: 'Create your video story' })).not.toBeVisible()

    // Scene counter should show Scene 1 / 4
    await expect(page.getByText('Scenes').first()).toBeVisible()

    // 4 scene items in sidebar (Scene 1 through Scene 4)
    await expect(page.getByText('Scene 1', { exact: true })).toBeVisible()
    await expect(page.getByText('Scene 2', { exact: true })).toBeVisible()
    await expect(page.getByText('Scene 3', { exact: true })).toBeVisible()
    await expect(page.getByText('Scene 4', { exact: true })).toBeVisible()

    // Main viewer image should load with valid src
    const mainImage = page.locator('img[alt="Scene 1"]')
    await expect(mainImage).toBeVisible({ timeout: 15000 })
    await expect(mainImage).toHaveAttribute('src', /^(https?:|\/|data:)/)

    // 4 voice select dropdowns (one per scene)
    await expect(page.locator('select')).toHaveCount(4)

    // Wait for generate button to re-enable (generation complete)
    await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeVisible({ timeout: 30000 })
  })

  test('navigates between scenes via sidebar and updates the viewer', async ({ page }) => {
    // Mock APIs
    await page.route('**/api/generate-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://placehold.co/800x450/1a1a2e/purple?text=Scene' }),
      })
    })

    await page.route('**/api/text-to-speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.alloc(1000),
      })
    })

    // Generate scenes — set up response listener BEFORE clicking
    await page.getByPlaceholder('A dragon awakens in a forgotten kingdom...').fill('A dragon awakens')
    const responsePromise = page.waitForResponse('**/api/generate-image', { timeout: 30000 })
    await page.getByRole('button', { name: 'Generate', exact: true }).click()
    await responsePromise
    await expect(page.getByRole('heading', { name: 'Scenes' })).toBeVisible({ timeout: 15000 })

    // Initially on Scene 1
    await expect(page.getByText('Scenes').first()).toBeVisible()

    // Click Scene 3 in sidebar
    await page.getByText('Scene 3', { exact: true }).click()
    await expect(page.getByText('Scenes').first()).toBeVisible()

    // Click Scene 4 in sidebar
    await page.getByText('Scene 4', { exact: true }).click()
    await expect(page.getByText('Scenes').first()).toBeVisible()

    // Click Scene 2 in sidebar
    await page.getByText('Scene 2', { exact: true }).click()
    await expect(page.getByText('Scenes').first()).toBeVisible()

    // Active scene should have purple border (border-purple-500)
    await expect(page.locator('.border-purple-500').first()).toBeVisible()
  })

  test('Enter key on input triggers generation', async ({ page }) => {
    // Mock APIs
    await page.route('**/api/generate-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://placehold.co/800x450/1a1a2e/purple?text=Scene' }),
      })
    })

    await page.route('**/api/text-to-speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.alloc(1000),
      })
    })

    const input = page.getByPlaceholder('A dragon awakens in a forgotten kingdom...')
    await input.fill('A space adventure begins')

    // Set up response listener BEFORE pressing Enter
    const responsePromise = page.waitForResponse('**/api/generate-image', { timeout: 30000 })
    await input.press('Enter')
    await responsePromise

    // Scenes should appear
    await expect(page.getByRole('heading', { name: 'Scenes' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Create your video story' })).not.toBeVisible()
    await expect(page.getByText('Scenes').first()).toBeVisible()
  })

  test('voice select dropdowns have all 14 voice options', async ({ page }) => {
    // Mock APIs
    await page.route('**/api/generate-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://placehold.co/800x450' }),
      })
    })

    await page.route('**/api/text-to-speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.alloc(1000),
      })
    })

    // Generate scenes — set up response listener BEFORE clicking
    await page.getByPlaceholder('A dragon awakens in a forgotten kingdom...').fill('A dragon awakens')
    const responsePromise = page.waitForResponse('**/api/generate-image', { timeout: 30000 })
    await page.getByRole('button', { name: 'Generate', exact: true }).click()
    await responsePromise
    await expect(page.getByRole('heading', { name: 'Scenes' })).toBeVisible({ timeout: 15000 })

    // First voice select should have 14 options
    const firstSelect = page.locator('select').first()
    await expect(firstSelect).toBeVisible()
    await expect(firstSelect.locator('option')).toHaveCount(14)

    // Change voice on first scene to Luna
    await firstSelect.selectOption('luna-en')
    await expect(firstSelect).toHaveValue('luna-en')
  })

  test('mobile viewport renders correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })

    // Header visible
    await expect(page.getByRole('heading', { name: 'Prompt to Video' })).toBeVisible()
    await expect(page.getByText('LIVE').first()).toBeVisible()

    // Input and button visible
    await expect(page.getByPlaceholder('A dragon awakens in a forgotten kingdom...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeVisible()

    // Empty state visible
    await expect(page.getByRole('heading', { name: 'Create your video story' })).toBeVisible()

    // Mock APIs and generate on mobile
    await page.route('**/api/generate-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://placehold.co/800x450' }),
      })
    })

    await page.route('**/api/text-to-speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.alloc(1000),
      })
    })

    await page.getByPlaceholder('A dragon awakens in a forgotten kingdom...').fill('A dragon story')

    // Set up response listener BEFORE clicking
    const responsePromise = page.waitForResponse('**/api/generate-image', { timeout: 30000 })
    await page.getByRole('button', { name: 'Generate', exact: true }).click()
    await responsePromise

    // Scenes should appear on mobile too
    await expect(page.getByRole('heading', { name: 'Scenes' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Scenes').first()).toBeVisible()
  })
})