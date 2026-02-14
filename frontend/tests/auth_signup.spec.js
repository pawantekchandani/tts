import { test, expect } from '@playwright/test';

test('Signup Error: Existing User', async ({ page }) => {
    await page.goto('http://localhost:3000/signup');
    await page.fill('input[name="email"]', 'already@exists.com');
    await page.fill('input[name="password"]', 'Password123');
    await page.click('button[type="submit"]');

    // Error message check karna
    await expect(page.locator('text=Email already exists')).toBeVisible();
});