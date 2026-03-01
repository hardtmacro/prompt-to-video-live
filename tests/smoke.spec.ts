import { test, expect } from '@playwright/test';

test.describe('prompt-to-video-live', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4MDAgNDUwIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzY2N2VlYSIvPjwvc3ZnPg==' }),
      });
    });

    await page.route('**/api/tts', async (route) => {
      const wavHeader = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
        0x57, 0x41, 0x56, 0x45, 0x66, 0x6D, 0x74, 0x20,
        0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x44, 0xAC, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00,
        0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61,
        0x00, 0x00, 0x00, 0x00,
      ]);
      await route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        body: wavHeader,
      });
    });

    await page.goto('/');
  });

  test('displays initial page with header, script form, and footer', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Prompt to Video Live', exact: true })).toBeVisible();
    await expect(page.getByText('AI-powered video generation').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create Your Video Script', exact: true })).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate Script', exact: true })).toBeDisabled();
    await expect(page.getByText('Try these examples:').first()).toBeVisible();
    await expect(page.getByText('Prompt to Video Live • AI-Powered Video Generation').first()).toBeVisible();
  });

  test('clicking example prompt fills textarea and enables generate button', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: 'Generate Script', exact: true });
    await expect(generateBtn).toBeDisabled();

    await page.locator('button', { hasText: "A hero's journey through ancient ruins" }).click();

    await expect(page.locator('textarea')).toHaveValue("A hero's journey through ancient ruins");
    await expect(generateBtn).toBeEnabled();
  });

  test('generates script showing 4 scenes with images and controls', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.pressSequentially('Space adventure');

    const generateBtn = page.getByRole('button', { name: 'Generate Script', exact: true });
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    await page.waitForResponse('**/api/image', { timeout: 30000 });

    // Script form gone, scene view visible
    await expect(page.getByRole('heading', { name: 'Create Your Video Script', exact: true })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'New Script', exact: true })).toBeVisible();

    // Scene labels
    await expect(page.getByText('Scene Prompt').first()).toBeVisible();
    await expect(page.getByText('Narration').first()).toBeVisible();
    await expect(page.getByText('Voice:').first()).toBeVisible();

    // Per-scene action buttons
    await expect(page.getByRole('button', { name: 'Play Audio', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play from here', exact: true }).first()).toBeVisible();

    // Images load with valid src (from mock or SVG fallback)
    await expect(page.locator('img').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('img').first()).toHaveAttribute('src', /^(https?:|\/|data:)/);

    // Voice dropdown has 15 options
    const voiceSelect = page.locator('select').first();
    await expect(voiceSelect).toBeVisible();
    await expect(voiceSelect.locator('option')).toHaveCount(15);
  });

  test('New Script button resets to initial form state', async ({ page }) => {
    await page.locator('textarea').pressSequentially('ocean');
    await page.getByRole('button', { name: 'Generate Script', exact: true }).click();
    await page.waitForResponse('**/api/image', { timeout: 30000 });

    await expect(page.getByRole('button', { name: 'New Script', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'New Script', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Create Your Video Script', exact: true })).toBeVisible();
    await expect(page.locator('textarea')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Generate Script', exact: true })).toBeDisabled();
    await expect(page.getByText('Try these examples:').first()).toBeVisible();
  });

  test('play/pause toggle changes button and status text', async ({ page }) => {
    await page.locator('textarea').pressSequentially('drama');
    await page.getByRole('button', { name: 'Generate Script', exact: true }).click();
    await page.waitForResponse('**/api/image', { timeout: 30000 });

    // Initial: Play button visible
    const playBtn = page.getByRole('button', { name: 'Play', exact: true });
    await expect(playBtn).toBeVisible();

    // Click play -> becomes Pause
    await playBtn.click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();

    // Click pause -> back to Play
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  });

  test('all 4 scene images render with valid src after generation', async ({ page }) => {
    await page.locator('textarea').pressSequentially('hero journey');
    await page.getByRole('button', { name: 'Generate Script', exact: true }).click();

    // Wait for all 4 images to appear in the DOM with valid src
    // (instead of sequentially waiting for API responses which race)
    const images = page.locator('img');
    await expect(images).toHaveCount(4, { timeout: 30000 });
    for (let i = 0; i < 4; i++) {
      await expect(images.nth(i)).toHaveAttribute('src', /^(https?:|\/|data:)/, { timeout: 30000 });
    }
  });

  test('mobile viewport renders and generates correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await expect(page.getByRole('heading', { name: 'Prompt to Video Live', exact: true })).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.getByText('Prompt to Video Live • AI-Powered Video Generation').first()).toBeVisible();

    // Generate on mobile
    await page.locator('textarea').pressSequentially('forest');
    await page.getByRole('button', { name: 'Generate Script', exact: true }).click();
    await page.waitForResponse('**/api/image', { timeout: 30000 });

    await expect(page.getByRole('button', { name: 'New Script', exact: true })).toBeVisible();
    await expect(page.getByText('Scene Prompt').first()).toBeVisible();
    await expect(page.locator('img').first()).toBeVisible({ timeout: 10000 });
  });
});