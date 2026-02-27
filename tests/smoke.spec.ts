import { test, expect } from '@playwright/test';

test.describe('prompt-to-video-live', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page loads with correct title and header', async ({ page }) => {
    // Check main heading
    await expect(page.getByRole('heading', { name: 'Prompt to Video Live' })).toBeVisible();
    
    // Check subtitle in header
    await expect(page.getByText('AI-powered video generation').first()).toBeVisible();
    
    // Check footer text
    await expect(page.getByText('Prompt to Video Live • AI-Powered Video Generation').first()).toBeVisible();
  });

  test('displays 4 default scenes', async ({ page }) => {
    // Verify scene count - each scene has a number indicator
    const sceneNumbers = page.locator('.rounded-full').filter({ hasText: /^[1-4]$/ });
    await expect(sceneNumbers).toHaveCount(4);
  });

  test('all control buttons are present', async ({ page }) => {
    // Play/Pause button (main control) - check for Play icon when not playing
    await expect(page.getByRole('button', { name: /Play/i }).first()).toBeVisible();
    
    // Auto-scroll toggle button
    await expect(page.getByRole('button', { name: 'Auto-Scroll' })).toBeVisible();
    
    // Generate All button
    await expect(page.getByRole('button', { name: 'Generate All' })).toBeVisible();
  });

  test('scene cards have required action buttons', async ({ page }) => {
    // Each scene should have "Play Audio" button
    const playAudioButtons = page.getByRole('button', { name: 'Play Audio' });
    await expect(playAudioButtons).toHaveCount(4);
    
    // Each scene should have "Play from here" button
    const playFromHereButtons = page.getByRole('button', { name: 'Play from here' });
    await expect(playFromHereButtons).toHaveCount(4);
  });

  test('voice dropdown shows all language options', async ({ page }) => {
    // Click on voice dropdown in first scene (current scene with index 0)
    const voiceSelect = page.locator('select').first();
    await voiceSelect.click();
    
    // Wait for dropdown to open and options to be visible
    await page.waitForTimeout(300);
    
    // Verify all voice options are available
    await expect(page.getByRole('option', { name: 'English (US) 🇺🇸' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'English US 🇺🇸' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'English British 🇬🇧' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Chinese 🇨🇳' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Spanish 🇪🇸' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'French 🇫🇷' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Japanese 🇯🇵' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Korean 🇰🇷' })).toBeVisible();
  });

  test('scene labels are present', async ({ page }) => {
    // Check for scene field labels in first scene card
    await expect(page.getByText('Scene Prompt').first()).toBeVisible();
    await expect(page.getByText('Narration').first()).toBeVisible();
    await expect(page.getByText('Voice').first()).toBeVisible();
  });

  test('renders correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    // Page should still load correctly
    await expect(page.getByRole('heading', { name: 'Prompt to Video Live' })).toBeVisible();
    
    // Controls should still be visible
    await expect(page.getByRole('button', { name: 'Generate All' })).toBeVisible();
    
    // Scenes should still render (may be stacked differently)
    const sceneNumbers = page.locator('.rounded-full').filter({ hasText: /^[1-4]$/ });
    await expect(sceneNumbers).toHaveCount(4);
  });

  test('auto-scroll toggle changes state', async ({ page }) => {
    const autoScrollButton = page.getByRole('button', { name: 'Auto-Scroll' });
    
    // Initially should show Auto-Scroll ON state (button with ChevronDown)
    await expect(page.getByText('Auto-scroll ON').first()).toBeVisible();
    
    // Click to toggle off
    await autoScrollButton.click();
    
    // Should now show Auto-scroll OFF
    await expect(page.getByText('Auto-scroll OFF').first()).toBeVisible();
    
    // Click to toggle back on
    await autoScrollButton.click();
    
    // Should show Auto-scroll ON again
    await expect(page.getByText('Auto-scroll ON').first()).toBeVisible();
  });
});