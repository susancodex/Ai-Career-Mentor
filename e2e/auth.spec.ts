import { test, expect } from '@playwright/test';

test.describe('Auth flows', () => {
  test('user can register and login', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[placeholder="Jane Doe"]', 'Test User');
    await page.fill('input[placeholder="you@example.com"]', 'test@example.com');
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Create account")');
    await expect(page).toHaveURL('/dashboard');
  });

  test('user can login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[placeholder="you@example.com"]', 'test@example.com');
    await page.fill('input[placeholder="••••••••"]', 'password123');
    await page.click('button:has-text("Sign in")');
    await expect(page).toHaveURL('/dashboard');
  });
});
