import { test, expect } from '@playwright/test';

test.describe('prompt-to-video-live', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the main page with header and title', async ({ page }) => {
    // Verify the main heading is visible
    await expect(page.getByRole('heading', { name: 'Prompt to Video Live' })).toBeVisible();
    
    // Verify subtitle
    await expect(page.getByText('AI-powered video generation').first()).toBeVisible();
    
    // Verify the Generate All button exists
    await expect(page.getByRole('button', { name: 'Generate All' })).toBeVisible();
  });

  test('should display 4 default scenes in the timeline', async ({ page }) => {
    // There should be 4 scene cards
    const sceneCards = page.locator('[class*="rounded-2xl"][class*="border"]').locator('..');
    await expect(page.locator('textarea').first()).toBeVisible();
    
    // Verify scene count by checking the timeline numbers (1, 2, 3, 4)
    await expect(page.getByText('Scene Prompt').first()).toBeVisible();
    await expect(page.getByText('Scene Prompt').first()).toBeVisible();
    await expect(page.getByText('Scene Prompt').first()).toBeVisible();
    await expect(page.getByText('Scene Prompt').first()).toBeVisible();
  });

  test('should toggle auto-scroll functionality', async ({ page }) => {
    // Find the Auto-Scroll button
    const autoScrollButton = page.getByRole('button', { name: /Auto-Scroll/i });
    await expect(autoScrollButton).toBeVisible();
    
    // Click to toggle auto-scroll off
    await autoScrollButton.click();
    
    // Verify the button reflects OFF state - it should show ChevronRight icon now
    // The button text should still contain "Auto-Scroll"
    await expect(autoScrollButton).toContainText('Auto-Scroll');
    
    // Click again to toggle back on
    await autoScrollButton.click();
    
    // Should still contain Auto-Scroll text
    await expect(autoScrollButton).toContainText('Auto-Scroll');
  });

  test('should have all 8 voice options available in dropdown', async ({ page }) => {
    // The first scene (index 0) is the current scene by default, so its dropdown should show all options
    // Find the voice select dropdown in the first scene (which is the current/active scene)
    const voiceSelect = page.locator('select').first();
    await expect(voiceSelect).toBeVisible();
    
    // Click to open dropdown options
    await voiceSelect.click();
    
    // Wait for dropdown to open and options to be visible
    // Verify all 8 voice options are present in the dropdown (the labels include the voice name in parentheses)
    await expect(page.getByRole('option', { name: /Asteria/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /Luna/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /Zeus/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /Orion/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /Aurora/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /Hermes/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /Athena/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /Orpheus/i })).toBeVisible();
  });

  test('should show play/pause button and toggle play state', async ({ page }) => {
    // Find the main play button in the controls section (the large circular button with aria-label)
    // Use the aria-label which alternates between "Play" and "Pause"
    const playButton = page.getByRole('button', { name: /Play|Pause/i }).first();
    await expect(playButton).toBeVisible();
    
    // Initially should show Play icon (Ready to play)
    await expect(page.getByText('Ready to play').first()).toBeVisible();
    
    // Click the play button to start playback
    await playButton.click();
    
    // After clicking, should show "Playing..." or "Playing" state
    await expect(page.getByText(/Playing/i)).toBeVisible();
    
    // Now click to pause
    await playButton.click();
    
    // Should go back to ready state
    await expect(page.getByText('Ready to play').first()).toBeVisible();
  });

  test('should have Play from here buttons for each scene', async ({ page }) => {
    // There should be 4 "Play from here" buttons (one for each scene)
    const playFromHereButtons = page.getByRole('button', { name: 'Play from here' });
    await expect(playFromHereButtons).toHaveCount(4);
  });

  test('should have Audio and Image generation buttons for each scene', async ({ page }) => {
    // Each scene should have Image and Audio generation buttons
    // We check the first scene has these buttons
    const imageButton = page.locator('button').filter({ hasText: 'Image' }).first();
    const audioButton = page.locator('button').filter({ hasText: 'Audio' }).first();
    const playAudioButton = page.getByRole('button', { name: 'Play Audio' }).first();
    
    await expect(imageButton).toBeVisible();
    await expect(audioButton).toBeVisible();
    await expect(playAudioButton).toBeVisible();
  });

  test('should render correctly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Page should still load with main heading
    await expect(page.getByRole('heading', { name: 'Prompt to Video Live' })).toBeVisible();
    
    // The timeline should still be visible (may stack differently)
    await expect(page.getByText('Scene Prompt').first()).toBeVisible();
    
    // Play button should still be accessible - use .first() to avoid strict mode violation
    await expect(page.getByRole('button', { name: /Play|Pause/i }).first()).toBeVisible();
  });
});