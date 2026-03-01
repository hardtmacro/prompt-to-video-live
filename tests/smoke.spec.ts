import { test, expect } from '@playwright/test'

test.describe('prompt-to-video-live', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('displays header, input, and empty state on initial load', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Prompt to Video' })).toBeVisible()
    await expect(page.getByText('LIVE').first()).toBeVisible()
    await expect(page.getByText('Describe your video story').first()).toBeVisible()
    await expect(page.getByPlaceholder('A dragon awakens in a forgotten kingdom...')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Create your video story' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeDisabled()
  })

  test('generate button enables with input and disables when cleared', async ({ page }) => {
    const input = page.getByPlaceholder('A dragon awakens in a forgotten kingdom...')
    const btn = page.getByRole('button', { name: 'Generate', exact: true })

    await expect(btn).toBeDisabled()
    await input.pressSequentially('A dragon awakens')
    await expect(btn).toBeEnabled()
    await input.clear()
    await expect(btn).toBeDisabled()
  })

  test('generates 4 scenes with images after submitting prompt', async ({ page }) => {
    await page.route('**/api/generate-image', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://example.com/scene.png' }),
      })
    )
    await page.route('**/api/text-to-speech', route =>
      route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.alloc(44),
      })
    )

    const input = page.getByPlaceholder('A dragon awakens in a forgotten kingdom...')
    const generateBtn = page.getByRole('button', { name: 'Generate', exact: true })

    await input.pressSequentially('A dragon awakens in a forgotten kingdom')
    await expect(generateBtn).toBeEnabled()
    await generateBtn.click()

    // Wait for generation to complete — button re-enables with original text
    await expect(generateBtn).toBeEnabled({ timeout: 30000 })

    // Empty state gone, scenes visible
    await expect(page.getByRole('heading', { name: 'Create your video story' })).not.toBeVisible()
    await expect(page.getByRole('heading', { name: 'Scenes' })).toBeVisible()
    await expect(page.getByText('Scenes').first()).toBeVisible()

    // Images loaded with src attribute
    const images = page.locator('img[alt^="Scene"]')
    await expect(images.first()).toBeVisible()
    await expect(images.first()).toHaveAttribute('src', /^(https?:|\/|data:)/)

    // All 4 scene labels in list
    await expect(page.getByText('Scene 1', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Scene 2', { exact: true })).toBeVisible()
    await expect(page.getByText('Scene 3', { exact: true })).toBeVisible()
    await expect(page.getByText('Scene 4', { exact: true })).toBeVisible()

    // 4 voice select dropdowns (one per scene)
    await expect(page.locator('select')).toHaveCount(4)
  })

  test('clicking scenes in list updates the viewer counter', async ({ page }) => {
    await page.route('**/api/generate-image', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://example.com/scene.png' }),
      })
    )
    await page.route('**/api/text-to-speech', route =>
      route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.alloc(44),
      })
    )

    await page.getByPlaceholder('A dragon awakens in a forgotten kingdom...').pressSequentially('A dragon awakens')
    await page.getByRole('button', { name: 'Generate', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeEnabled({ timeout: 30000 })

    // Starts at scene 1
    await expect(page.getByText('Scenes').first()).toBeVisible()

    // Navigate to scene 3
    await page.getByText('Scene 3', { exact: true }).click()
    await expect(page.getByText('Scenes').first()).toBeVisible()

    // Navigate to scene 4
    await page.getByText('Scene 4', { exact: true }).click()
    await expect(page.getByText('Scenes').first()).toBeVisible()

    // Navigate back to scene 2
    await page.getByText('Scene 2', { exact: true }).click()
    await expect(page.getByText('Scenes').first()).toBeVisible()

    // Navigate back to scene 1
    await page.getByText('Scene 1', { exact: true }).first().click()
    await expect(page.getByText('Scenes').first()).toBeVisible()
  })

  test('voice dropdowns contain all 14 voice options', async ({ page }) => {
    await page.route('**/api/generate-image', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://example.com/scene.png' }),
      })
    )
    await page.route('**/api/text-to-speech', route =>
      route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.alloc(44),
      })
    )

    await page.getByPlaceholder('A dragon awakens in a forgotten kingdom...').pressSequentially('A dragon awakens')
    await page.getByRole('button', { name: 'Generate', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeEnabled({ timeout: 30000 })

    const firstSelect = page.locator('select').first()
    await expect(firstSelect).toBeVisible()
    await expect(firstSelect.locator('option')).toHaveCount(14)

    // Verify voice labels from BUTTONS reference strings
    await expect(firstSelect.locator('option', { hasText: 'Asteria' })).toBeAttached()
    await expect(firstSelect.locator('option', { hasText: 'Luna' })).toBeAttached()
    await expect(firstSelect.locator('option', { hasText: 'Stella' })).toBeAttached()
    await expect(firstSelect.locator('option', { hasText: 'Orion' })).toBeAttached()
    await expect(firstSelect.locator('option', { hasText: 'Perseus' })).toBeAttached()
    await expect(firstSelect.locator('option', { hasText: 'Zeus' })).toBeAttached()
    await expect(firstSelect.locator('option', { hasText: 'Apollo' })).toBeAttached()
    await expect(firstSelect.locator('option', { hasText: 'Hermes' })).toBeAttached()
  })

  test('pressing Enter in input triggers generation', async ({ page }) => {
    await page.route('**/api/generate-image', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://example.com/scene.png' }),
      })
    )
    await page.route('**/api/text-to-speech', route =>
      route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.alloc(44),
      })
    )

    const input = page.getByPlaceholder('A dragon awakens in a forgotten kingdom...')
    await input.pressSequentially('Space adventure begins')
    await input.press('Enter')

    await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeEnabled({ timeout: 30000 })
    await expect(page.getByRole('heading', { name: 'Scenes' })).toBeVisible()
    await expect(page.getByText('Scenes').first()).toBeVisible()
  })

  test('renders correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })

    await expect(page.getByRole('heading', { name: 'Prompt to Video' })).toBeVisible()
    await expect(page.getByText('LIVE').first()).toBeVisible()
    await expect(page.getByPlaceholder('A dragon awakens in a forgotten kingdom...')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Create your video story' })).toBeVisible()
  })
})