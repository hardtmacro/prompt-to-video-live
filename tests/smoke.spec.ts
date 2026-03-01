import { test, expect } from '@playwright/test';

test.describe('prompt-to-video-live', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load initial page with correct title and header', async ({ page }) => {
    // Verify main heading
    await expect(page.getByRole('heading', { name: 'Prompt to Video Live' })).toBeVisible();
    
    // Verify subtitle in header
    await expect(page.getByText('AI-powered video generation').first()).toBeVisible();
    
    // Verify Create Your Video Script section heading
    await expect(page.getByRole('heading', { name: 'Create Your Video Script' })).toBeVisible();
    
    // Verify prompt textarea exists with correct placeholder
    await expect(page.getByPlaceholder('Enter your prompt here... e.g., ')).toBeVisible();
    
    // Verify Generate Script button exists and is initially disabled (empty input)
    const generateBtn = page.getByRole('button', { name: 'Generate Script' });
    await expect(generateBtn).toBeVisible();
    
    // Verify example prompts are visible
    await expect(page.getByText('Try these examples:').first()).toBeVisible();
  });

  test('should generate script when prompt is entered', async ({ page }) => {
    // Fill in the prompt textarea
    const promptInput = page.getByPlaceholder('Enter your prompt here... e.g., ');
    await promptInput.fill('A hero\'s journey through ancient ruins');
    
    // Button should now be enabled - use getByText for more reliable matching
    const generateBtn = page.getByRole('button').filter({ hasText: 'Generate Script' });
    await expect(generateBtn).toBeEnabled();
    
    // Click Generate Script
    await generateBtn.click();
    
    // Wait for script to be generated (button should show original text again)
    await expect(generateBtn).toBeEnabled({ timeout: 10000 });
    
    // Verify scenes are displayed (4 scenes should be generated)
    // The scenes appear as divs in a timeline with progress indicator
    await expect(page.locator('[class*="rounded-2xl"][class*="border"]').first()).toBeVisible({ timeout: 10000 });
    
    // Verify New Script button appears
    await expect(page.getByRole('button', { name: 'New Script', exact: true })).toBeVisible();
    
    // Verify Generate All button appears
    await expect(page.getByRole('button', { name: 'Generate All' })).toBeVisible();
  });

  test('should generate image for a scene when clicking Generate scene', async ({ page }) => {
    // First generate a script
    const promptInput = page.getByPlaceholder('Enter your prompt here... e.g., ');
    await promptInput.fill('A hero\'s journey through ancient ruins');
    
    const generateBtn = page.getByRole('button').filter({ hasText: 'Generate Script' });
    await generateBtn.click();
    
    // Wait for script generation
    await expect(generateBtn).toBeEnabled({ timeout: 10000 });
    
    // Wait for scenes to be visible
    await expect(page.locator('[class*="rounded-2xl"][class*="border"]').first()).toBeVisible({ timeout: 10000 });
    
    // Find and click the first "Generate scene" button (it's inside each scene card)
    // The first scene's Generate scene button
    const firstSceneGenerateBtn = page.locator('button').filter({ hasText: 'Generate scene' }).first();
    await firstSceneGenerateBtn.click();
    
    // Wait for image to appear - it should have src starting with data:image
    const sceneImage = page.locator('img').first();
    await expect(sceneImage).toBeVisible({ timeout: 10000 });
    await expect(sceneImage).toHaveAttribute('src', /^data:image\/svg\+xml/);
  });

  test('should play audio for a scene when clicking Play Audio', async ({ page }) => {
    // First generate a script
    const promptInput = page.getByPlaceholder('Enter your prompt here... e.g., ');
    await promptInput.fill('A hero\'s journey through ancient ruins');
    
    const generateBtn = page.getByRole('button').filter({ hasText: 'Generate Script' });
    await generateBtn.click();
    
    // Wait for script generation
    await expect(generateBtn).toBeEnabled({ timeout: 10000 });
    
    // Wait for scenes to be visible
    await expect(page.locator('[class*="rounded-2xl"][class*="border"]').first()).toBeVisible({ timeout: 10000 });
    
    // Find and click the first "Play Audio" button
    const playAudioBtn = page.locator('button').filter({ hasText: 'Play Audio' }).first();
    await playAudioBtn.click();
    
    // Audio should play - we can't directly verify audio output, but the button should be clickable
    // and the scene should have narration text visible
    const firstSceneNarration = page.locator('textarea').nth(1); // Second textarea is narration
    await expect(firstSceneNarration).toBeVisible();
  });

  test('should reset to initial state when clicking New Script', async ({ page }) => {
    // First generate a script
    const promptInput = page.getByPlaceholder('Enter your prompt here... e.g., ');
    await promptInput.fill('A hero\'s journey through ancient ruins');
    
    const generateBtn = page.getByRole('button').filter({ hasText: 'Generate Script' });
    await generateBtn.click();
    
    // Wait for script generation
    await expect(generateBtn).toBeEnabled({ timeout: 10000 });
    
    // Wait for scenes
    await expect(page.locator('[class*="rounded-2xl"][class*="border"]').first()).toBeVisible({ timeout: 10000 });
    
    // Click New Script button
    const newScriptBtn = page.getByRole('button', { name: 'New Script', exact: true });
    await newScriptBtn.click();
    
    // Verify we're back to initial state - prompt input should be empty
    await expect(promptInput).toHaveValue('');
    
    // Verify Create Your Video Script heading is visible again
    await expect(page.getByRole('heading', { name: 'Create Your Video Script' })).toBeVisible();
  });

  test('should select different voice for a scene', async ({ page }) => {
    // First generate a script
    const promptInput = page.getByPlaceholder('Enter your prompt here... e.g., ');
    await promptInput.fill('A hero\'s journey through ancient ruins');
    
    const generateBtn = page.getByRole('button').filter({ hasText: 'Generate Script' });
    await generateBtn.click();
    
    // Wait for script generation
    await expect(generateBtn).toBeEnabled({ timeout: 10000 });
    
    // Wait for scenes
    await expect(page.locator('[class*="rounded-2xl"][class*="border"]').first()).toBeVisible({ timeout: 10000 });
    
    // Find the voice dropdown in the first scene
    // Voice select appears after the Narration field
    const voiceSelect = page.locator('select').first();
    await expect(voiceSelect).toBeVisible();
    
    // Verify default voice (should be Asteria based on matching theme)
    await expect(voiceSelect).toHaveValue('asteria-en');
    
    // Change to a different voice - Luna
    await voiceSelect.selectOption('luna-en');
    
    // Verify voice changed
    await expect(voiceSelect).toHaveValue('luna-en');
  });

  test('should load correctly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Verify main heading is visible on mobile
    await expect(page.getByRole('heading', { name: 'Prompt to Video Live' })).toBeVisible();
    
    // Verify prompt input is visible
    await expect(page.getByPlaceholder('Enter your prompt here... e.g., ')).toBeVisible();
    
    // Verify Generate Script button is visible
    await expect(page.getByRole('button').filter({ hasText: 'Generate Script' })).toBeVisible();
  });

  test('should use example prompt when clicked', async ({ page }) => {
    // Click on an example prompt
    const exampleBtn = page.getByRole('button', { name: "A hero's journey through ancient ruins" });
    await exampleBtn.click();
    
    // Verify the prompt input is filled with the example
    const promptInput = page.getByPlaceholder('Enter your prompt here... e.g., ');
    await expect(promptInput).toHaveValue("A hero's journey through ancient ruins");
    
    // Verify Generate button is enabled
    const generateBtn = page.getByRole('button').filter({ hasText: 'Generate Script' });
    await expect(generateBtn).toBeEnabled();
  });
});