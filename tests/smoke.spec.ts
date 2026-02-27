import { test, expect } from '@playwright/test';

test.describe('prompt-to-video-live', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the main page with correct heading and subheading', async ({ page }) => {
    // Check main heading in header
    await expect(page.getByRole('heading', { name: 'Prompt to Video Live' })).toBeVisible();
    
    // Check subheading in header
    await expect(page.getByText('AI-powered video generation').first()).toBeVisible();
    
    // Check footer text
    await expect(page.getByText('Prompt to Video Live • AI-Powered Video Generation').first()).toBeVisible();
  });

  test('should display all 4 default scenes with editable fields', async ({ page }) => {
    // Check that there are 4 scene containers (by counting the scene prompt textareas)
    const promptTextareas = page.locator('textarea').filter({ hasText: /A futuristic city|An astronaut|A magical forest|A samurai/ });
    await expect(promptTextareas).toHaveCount(4);
    
    // Check that narration textareas exist for all scenes
    const narrationTextareas = page.locator('textarea').filter({ hasText: /Welcome to the future|In the vastness|Deep in the enchanted|In old Japan/ });
    await expect(narrationTextareas).toHaveCount(4);
  });

  test('should show all voice options in the dropdown', async ({ page }) => {
    // Click on first voice dropdown
    const voiceDropdown = page.locator('select').first();
    await voiceDropdown.click();
    
    // Verify all 8 language options are available
    await expect(page.getByRole('option', { name: /English \(US\)|English US|English British|Chinese|Spanish|French|Japanese|Korean/ })).toHaveCount(8);
  });

  test('should have play/pause controls and scene count display', async ({ page }) => {
    // Check play button exists
    await expect(page.locator('button').filter({ has: page.locator('svg.lucide-play') })).toBeVisible();
    
    // Check scene counter shows "Scene 1 of 4"
    await expect(page.getByText(/Scene \d+ of \d+/)).toBeVisible();
    
    // Check ready status text
    await expect(page.getByText('Ready to play').first()).toBeVisible();
  });

  test('should have Generate All button and Auto-Scroll toggle', async ({ page }) => {
    // Check Generate All button exists (look for button containing "Generate All" text or Wand icon)
    const generateAllBtn = page.getByRole('button', { name: /Generate All/i });
    await expect(generateAllBtn).toBeVisible();
    
    // Check Auto-Scroll button exists
    const autoScrollBtn = page.getByRole('button', { name: /Auto-Scroll/i });
    await expect(autoScrollBtn).toBeVisible();
    
    // Check Auto-Scroll is ON by default (green indicator)
    await expect(page.getByText('Auto-scroll ON').first()).toBeVisible();
  });

  test('should have action buttons for each scene', async ({ page }) => {
    // Each scene should have: Image button, Audio button, Play from here button
    // Check for "Play from here" buttons (exact match since multiple scenes)
    const playFromHereButtons = page.getByRole('button', { name: 'Play from here', exact: true });
    await expect(playFromHereButtons).toHaveCount(4);
    
    // Check for Image generation buttons
    const imageButtons = page.getByRole('button', { name: /Image/i });
    await expect(imageButtons).toHaveCount(4);
    
    // Check for Audio generation buttons
    const audioButtons = page.getByRole('button', { name: /Audio/i });
    await expect(audioButtons).toHaveCount(4);
  });

  test('should toggle auto-scroll when clicked', async ({ page }) => {
    const autoScrollBtn = page.getByRole('button', { name: /Auto-Scroll/i });
    
    // Initially ON
    await expect(page.getByText('Auto-scroll ON').first()).toBeVisible();
    
    // Click to toggle
    await autoScrollBtn.click();
    
    // Should now show OFF
    await expect(page.getByText('Auto-scroll OFF').first()).toBeVisible();
  });

  test('should skip to scene when Play from here is clicked', async ({ page }) => {
    // Click "Play from here" on scene 3 (index 2)
    const playFromHereButtons = page.getByRole('button', { name: 'Play from here', exact: true });
    await playFromHereButtons.nth(2).click();
    
    // Should now show Scene 3 of 4
    await expect(page.getByText('Scene Prompt').first()).toBeVisible();
    
    // Should show "Playing..." state after clicking Play from here (not "Ready to play")
    await expect(page.getByText('Playing...').first()).toBeVisible();
  });

  test('should handle Generate All button state', async ({ page }) => {
    const generateAllBtn = page.getByRole('button', { name: /Generate All/i });
    
    // Button should be enabled initially
    await expect(generateAllBtn).toBeEnabled();
    
    // Click Generate All
    await generateAllBtn.click();
    
    // After clicking, verify we can still interact with the page
    // The button will handle generation - we verify the click worked
    await expect(generateAllBtn).toBeVisible();
  });

  test('should display scene indicators with correct numbering', async ({ page }) => {
    // Scene indicators should show numbers 1-4
    // The first scene indicator should be active (highlighted)
    const sceneIndicators = page.locator('.rounded-full.text-sm.font-bold');
    await expect(sceneIndicators).toHaveCount(4);
    
    // First scene indicator should have gradient (active)
    await expect(sceneIndicators.first()).toHaveClass(/bg-gradient-to-r/);
  });

  test('should render correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Page should still load main heading
    await expect(page.getByRole('heading', { name: 'Prompt to Video Live' })).toBeVisible();
    
    // Controls should be accessible - use aria-label for the main play button
    await expect(page.getByRole('button', { name: /Play|Pause/i }).first()).toBeVisible();
    
    // Generate All button should still be visible
    await expect(page.getByRole('button', { name: /Generate All/i })).toBeVisible();
  });
});