import { test, expect } from '@playwright/test';

test.describe('prompt-to-video-live', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays initial page with heading, form, disabled button, and footer', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Prompt to Video Live' })).toBeVisible();
    await expect(page.getByText('AI-powered video generation').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create Your Video Script' })).toBeVisible();
    await expect(page.getByPlaceholder(/Enter your prompt here/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate Script' })).toBeDisabled();
    await expect(page.getByText('Try these examples:').first()).toBeVisible();
    await expect(page.getByText('Prompt to Video Live • AI-Powered Video Generation').first()).toBeVisible();
  });

  test('enables Generate Script button on input and example prompt fills textarea', async ({ page }) => {
    const generateBtn = page.getByRole('button', { name: 'Generate Script' });
    const textarea = page.getByPlaceholder(/Enter your prompt here/);

    await expect(generateBtn).toBeDisabled();

    // Typing enables the button
    await textarea.pressSequentially('Test prompt');
    await expect(generateBtn).toBeEnabled();

    // Clear and click example prompt
    await textarea.fill('');
    await expect(generateBtn).toBeDisabled();
    await page.getByRole('button', { name: "A hero's journey through ancient ruins" }).click();
    await expect(textarea).toHaveValue("A hero's journey through ancient ruins");
    await expect(generateBtn).toBeEnabled();
  });

  test('generates script with 4 scenes, images, and action buttons', async ({ page }) => {
    await page.route('**/api/generate-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA4MDAgNDUwIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgZmlsbD0iIzY2N2VlYSIvPjwvc3ZnPg==' }),
      });
    });
    await page.route('**/api/text-to-speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.from([0xFF, 0xFB, 0x90, 0x00]),
      });
    });

    await page.getByPlaceholder(/Enter your prompt here/).pressSequentially('Space exploration adventure');
    await page.getByRole('button', { name: 'Generate Script' }).click();

    // Wait for scene UI to appear
    await expect(page.getByRole('button', { name: 'New Script', exact: true })).toBeVisible({ timeout: 15000 });

    // Initial form should be hidden
    await expect(page.getByRole('heading', { name: 'Create Your Video Script' })).toBeHidden();

    // Verify 4 scenes rendered with labels (no .first() — count needs the full set)
    await expect(page.getByText('Scene Prompt')).toHaveCount(4);
    await expect(page.getByText('Narration')).toHaveCount(4);

    // Verify voice label is visible
    await expect(page.getByText('Voice:').first()).toBeVisible();

    // Wait for at least one image API call to complete
    await page.waitForResponse('**/api/generate-image', { timeout: 15000 });

    // Verify images render with valid src
    const images = page.locator('img');
    await expect(images.first()).toBeVisible({ timeout: 15000 });
    await expect(images.first()).toHaveAttribute('src', /^(https?:|\/|data:)/);

    // Verify per-scene action buttons (4 scenes × each button)
    await expect(page.getByRole('button', { name: 'Play Audio', exact: true })).toHaveCount(4);
    await expect(page.getByRole('button', { name: 'Play from here', exact: true })).toHaveCount(4);

    // Verify scene counter and play button
    await expect(page.getByText('Scene Prompt').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  });

  test('New Script resets back to the initial prompt form', async ({ page }) => {
    await page.route('**/api/generate-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }),
      });
    });
    await page.route('**/api/text-to-speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.from([0xFF, 0xFB, 0x90, 0x00]),
      });
    });

    // Generate a script
    await page.getByPlaceholder(/Enter your prompt here/).pressSequentially('A test story');
    await page.getByRole('button', { name: 'Generate Script' }).click();
    await expect(page.getByRole('button', { name: 'New Script', exact: true })).toBeVisible({ timeout: 15000 });

    // Verify scenes exist (no .first() — count needs the full set)
    await expect(page.getByText('Scene Prompt')).toHaveCount(4);

    // Click New Script to reset
    await page.getByRole('button', { name: 'New Script', exact: true }).click();

    // Verify initial form returns
    await expect(page.getByRole('heading', { name: 'Create Your Video Script' })).toBeVisible();
    await expect(page.getByPlaceholder(/Enter your prompt here/)).toBeVisible();
    await expect(page.getByPlaceholder(/Enter your prompt here/)).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Generate Script' })).toBeDisabled();

    // Scenes should be gone (no .first() — count needs the full set)
    await expect(page.getByText('Scene Prompt')).toHaveCount(0);
  });

  test('voice dropdown changes the selected voice for a scene', async ({ page }) => {
    await page.route('**/api/generate-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }),
      });
    });
    await page.route('**/api/text-to-speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.from([0xFF, 0xFB, 0x90, 0x00]),
      });
    });

    // "adventure" keyword matches Zeus voice
    await page.getByPlaceholder(/Enter your prompt here/).pressSequentially('Space exploration adventure');
    await page.getByRole('button', { name: 'Generate Script' }).click();
    await expect(page.getByRole('button', { name: 'New Script', exact: true })).toBeVisible({ timeout: 15000 });

    // Verify initial voice is zeus-en (first keyword match: "adventure" → Zeus)
    const firstVoiceSelect = page.locator('select').first();
    await expect(firstVoiceSelect).toHaveValue('zeus-en');

    // Change voice to Apollo
    await firstVoiceSelect.selectOption('apollo-en');
    await expect(firstVoiceSelect).toHaveValue('apollo-en');

    // Change voice to Luna
    await firstVoiceSelect.selectOption('luna-en');
    await expect(firstVoiceSelect).toHaveValue('luna-en');
  });

  test('renders correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    await expect(page.getByRole('heading', { name: 'Prompt to Video Live' })).toBeVisible();
    await expect(page.getByText('AI-powered video generation').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create Your Video Script' })).toBeVisible();
    await expect(page.getByPlaceholder(/Enter your prompt here/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate Script' })).toBeVisible();
    await expect(page.getByText('Try these examples:').first()).toBeVisible();
    await expect(page.getByText('Prompt to Video Live • AI-Powered Video Generation').first()).toBeVisible();

    // Example prompts should still be clickable on mobile
    await page.getByRole('button', { name: "A love story in Paris" }).click();
    await expect(page.getByPlaceholder(/Enter your prompt here/)).toHaveValue("A love story in Paris");
    await expect(page.getByRole('button', { name: 'Generate Script' })).toBeEnabled();
  });

  test('theme voice matching assigns correct voice based on prompt keywords', async ({ page }) => {
    await page.route('**/api/generate-image', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' }),
      });
    });
    await page.route('**/api/text-to-speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.from([0xFF, 0xFB, 0x90, 0x00]),
      });
    });

    // "A love story in Paris" — first keyword match is "love" → Luna (luna-en)
    await page.getByRole('button', { name: "A love story in Paris" }).click();
    await page.getByRole('button', { name: 'Generate Script' }).click();
    await expect(page.getByRole('button', { name: 'New Script', exact: true })).toBeVisible({ timeout: 15000 });

    // Verify Luna voice is selected on all 4 scene dropdowns
    const voiceSelects = page.locator('select');
    await expect(voiceSelects).toHaveCount(4);
    await expect(voiceSelects.nth(0)).toHaveValue('luna-en');
    await expect(voiceSelects.nth(1)).toHaveValue('luna-en');
    await expect(voiceSelects.nth(2)).toHaveValue('luna-en');
    await expect(voiceSelects.nth(3)).toHaveValue('luna-en');
  });
});