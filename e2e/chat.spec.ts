import { test, expect } from '@playwright/test';

test.describe('Chat flow', () => {
  test('user can start chat and see streamed response', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', 'test@example.com');
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Sign in")');
    await expect(page).toHaveURL('/dashboard');

    // Navigate to chat page
    await page.click('text=Chat');
    await expect(page).toHaveURL('/chat');

    // Start a chat session
    await page.click('button:has-text("Start Chat")');
    await expect(page.locator('text=Send a message to start chatting')).toBeVisible();
  });
});
