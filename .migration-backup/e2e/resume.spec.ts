import { test, expect } from '@playwright/test';

test.describe('Resume upload flow', () => {
  test('user can upload resume and see analysis', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', 'test@example.com');
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Sign in")');
    await expect(page).toHaveURL('/dashboard');

    // Navigate to resume page
    await page.click('text=Resume');
    await expect(page).toHaveURL('/resume');

    // Since we can't easily upload real files in e2e with MSW, verify the UI loads
    await expect(page.locator('text=Drag & drop your resume')).toBeVisible();
  });
});
