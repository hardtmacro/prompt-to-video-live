import { test, expect } from '@playwright/test';

test.describe('prompt-to-video-live', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('initial page renders with heading, prompt form, disabled button, examples, and footer', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Prompt to Video Live' })).toBeVisible();
    await expect(page.getByText('AI-powered video generation').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create Your Video Script' })).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();

    const generateBtn = page.getByRole('button', { name: 'Generate Script' });
    await expect(generateBtn).toBeVisible();
    await expect(generateBtn).toBeDisabled();

    await expect(page.getByText('Try these examples:').first()).toBeVisible();
    await expect(page.getByText('Prompt to Video Live • AI-Powered Video Generation').first()).toBeVisible();
  });

  test('clicking example prompt fills textarea and enables generate button', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: 'Generate Script' });
    await expect(generateBtn).toBeDisabled();

    await page.locator('button', { hasText: 'ancient ruins' }).click();

    await expect(page.locator('textarea')).not.toBeEmpty();
    await expect(generateBtn).toBeEnabled();
  });

  test('generates 4 scenes with images, voice selectors, and action buttons', async ({ page }) => {
    await page.route('**/api/generate-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://example.com/scene.jpg' }),
      });
    });
    await page.route('**/api/text-to-speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.from([0xFF, 0xFB, 0x90, 0x00]),
      });
    });

    await page.locator('textarea').pressSequentially('Space exploration', { delay: 20 });
    const generateBtn = page.getByRole('button', { name: 'Generate Script' });
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    await expect(page.getByRole('button', { name: 'New Script' })).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole('button', { name: 'Play from here' })).toHaveCount(4, { timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Play Audio' })).toHaveCount(4);

    await expect(page.getByText('Scene Prompt').first()).toBeVisible();
    await expect(page.getByText('Narration').first()).toBeVisible();
    await expect(page.getByText('Voice:').first()).toBeVisible();

    await expect(page.locator('select')).toHaveCount(4);
    const firstSelect = page.locator('select').first();
    await expect(firstSelect.locator('option')).toHaveCount(15);

    await expect(page.locator('img')).toHaveCount(4, { timeout: 30000 });
    await expect(page.locator('img').first()).toHaveAttribute('src', /^(https?:|\/|data:)/);
  });

  test('New Script button resets to initial prompt state', async ({ page }) => {
    await page.route('**/api/generate-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://example.com/scene.jpg' }),
      });
    });
    await page.route('**/api/text-to-speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.from([0xFF, 0xFB, 0x90, 0x00]),
      });
    });

    await page.locator('textarea').pressSequentially('test prompt', { delay: 20 });
    await page.getByRole('button', { name: 'Generate Script' }).click();
    await expect(page.getByRole('button', { name: 'New Script' })).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'New Script' }).click();

    await expect(page.getByRole('heading', { name: 'Create Your Video Script' })).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate Script' })).toBeDisabled();
    await expect(page.getByText('Try these examples:').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play from here' })).toHaveCount(0);
  });

  test('play button toggles to pause and back', async ({ page }) => {
    await page.route('**/api/generate-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://example.com/scene.jpg' }),
      });
    });
    await page.route('**/api/text-to-speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.from([0xFF, 0xFB, 0x90, 0x00]),
      });
    });

    await page.locator('textarea').pressSequentially('adventure', { delay: 20 });
    await page.getByRole('button', { name: 'Generate Script' }).click();
    await expect(page.getByRole('button', { name: 'New Script' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('img').first()).toBeVisible({ timeout: 30000 });

    // Mock Audio so playback doesn't complete instantly in headless browser
    await page.evaluate(() => {
      (window as any).Audio = class {
        src = '';
        onended: (() => void) | null = null;
        onerror: ((e: any) => void) | null = null;
        pause() {}
        play() { return new Promise<void>(() => {}); }
      };
    });

    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('voice can be changed on a scene via dropdown', async ({ page }) => {
    await page.route('**/api/generate-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://example.com/scene.jpg' }),
      });
    });
    await page.route('**/api/text-to-speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.from([0xFF, 0xFB, 0x90, 0x00]),
      });
    });

    await page.locator('textarea').pressSequentially('ocean voyage', { delay: 20 });
    await page.getByRole('button', { name: 'Generate Script' }).click();
    await expect(page.getByRole('button', { name: 'New Script' })).toBeVisible({ timeout: 15000 });

    const firstSelect = page.locator('select').first();
    await expect(firstSelect).toBeVisible();
    await firstSelect.selectOption('zeus-en');
    await expect(firstSelect).toHaveValue('zeus-en');
  });

  test('mobile viewport displays initial page correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await expect(page.getByRole('heading', { name: 'Prompt to Video Live' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create Your Video Script' })).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate Script' })).toBeVisible();
    await expect(page.getByText('Prompt to Video Live • AI-Powered Video Generation').first()).toBeVisible();
  });
});