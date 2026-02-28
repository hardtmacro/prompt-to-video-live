import { test, expect } from '@playwright/test';

test.describe('prompt-to-video-live', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('initial state shows correct branding and script creation UI', async ({ page }) => {
    await expect(page.getByText('Prompt to Video Live').first()).toBeVisible();
    await expect(page.getByText('AI-powered video generation').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create Your Video Script', exact: true })).toBeVisible();
    
    // Using regex for placeholder as the actual text is very long
    const textarea = page.getByPlaceholder(/Enter your prompt here/);
    await expect(textarea).toBeVisible();
    
    // Verify example prompts are visible
    await expect(page.getByText('Try these examples:').first()).toBeVisible();
  });

  test('complete flow: generate script and interact with scenes', async ({ page }) => {
    // 1. Enter prompt and generate script
    const textarea = page.getByPlaceholder(/Enter your prompt here/);
    await textarea.fill('A hero\'s journey through ancient ruins');
    
    // Mock the initial script generation trigger (API call)
    await page.route('**/api/text-to-speech', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/mpeg',
        body: Buffer.from('mock-audio'),
      });
    });

    const generateBtn = page.getByRole('button', { name: 'Generate Script', exact: true });
    await generateBtn.click();

    // 2. Verify scenes are generated (UI should transition)
    await expect(page.getByText('Scene Prompt').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'New Script', exact: true })).toBeVisible();

    // 3. Verify scene content editors
    await expect(page.getByText('Scene Prompt').first()).toBeVisible();
    await expect(page.getByText('Narration').first()).toBeVisible();
    await expect(page.getByText('Voice:').first()).toBeVisible();

    // 4. Test image generation for a scene
    await page.route('**/api/generate-image', async (route) => {
      await route.fulfill({
        status: 200,
        json: { url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa' }
      });
    });

    // The "Generate scene" button is the one with the ImageIcon
    const generateImageBtn = page.getByRole('button', { name: 'Generate scene', exact: true }).first();
    await generateImageBtn.click();
    
    const sceneImage = page.locator('img').first();
    await expect(sceneImage).toBeVisible();
    await expect(sceneImage).toHaveAttribute('src', /^(https?:|\/|data:)/);

    // 5. Verify voice selection options are available for the active scene
    const voiceSelect = page.locator('select').first();
    await expect(voiceSelect).toBeVisible();
    // Check for a specific voice option from reference strings
    await expect(page.getByText('Asteria (Confident)').first()).toBeVisible();
  });

  test('audio playback interaction', async ({ page }) => {
    // Setup script first
    await page.getByPlaceholder(/Enter your prompt here/).fill('Space adventure');
    await page.getByRole('button', { name: 'Generate Script', exact: true }).click();

    // Mock audio generation
    await page.route('**/api/text-to-speech', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'audio/mpeg' },
        body: Buffer.from('mock-audio-content'),
      });
    });

    // In this UI, the "Play Audio" button is disabled until audio is generated.
    // We must first click the "Audio" button to trigger the API call and populate scene.audioUrl.
    const generateAudioBtn = page.getByRole('button', { name: 'Audio', exact: true }).first();
    await generateAudioBtn.click();

    // Wait for the audio request to complete
    await page.waitForResponse('**/api/text-to-speech');

    // Click "Play Audio" on the first scene now that it's enabled
    const playAudioBtn = page.getByRole('button', { name: 'Play Audio', exact: true }).first();
    await playAudioBtn.click();
    
    // Verify the "Play Audio" button is still available and enabled
    await expect(playAudioBtn).toBeEnabled();
  });

  test('resetting the script returns to initial state', async ({ page }) => {
    // Setup script
    await page.getByPlaceholder(/Enter your prompt here/).fill('Nature documentary');
    await page.getByRole('button', { name: 'Generate Script', exact: true }).click();
    await expect(page.getByText('Scene Prompt').first()).toBeVisible();

    // Click New Script
    await page.getByRole('button', { name: 'New Script', exact: true }).click();

    // Verify UI reset
    await expect(page.getByRole('heading', { name: 'Create Your Video Script', exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(/Enter your prompt here/)).toBeEmpty();
  });

  test('mobile viewport layout check', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    await expect(page.getByText('Prompt to Video Live').first()).toBeVisible();
    const textarea = page.getByPlaceholder(/Enter your prompt here/);
    await expect(textarea).toBeVisible();
    
    // Verify the generate button is accessible on mobile
    await expect(page.getByRole('button', { name: 'Generate Script', exact: true })).toBeVisible();
  });

  test('interactive scene controls after generation', async ({ page }) => {
    await page.getByPlaceholder(/Enter your prompt here/).fill('The last robot');
    await page.getByRole('button', { name: 'Generate Script', exact: true }).click();

    // Verify "Play from here" functionality
    const playFromHereBtn = page.getByRole('button', { name: 'Play from here', exact: true }).first();
    await expect(playFromHereBtn).toBeVisible();

    // Verify auto-scroll toggle exists
    const autoScrollBtn = page.getByRole('button', { name: 'Auto-Scroll', exact: true });
    await expect(autoScrollBtn).toBeVisible();
  });
});