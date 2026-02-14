import { test, expect } from '@playwright/test';

test('Login Success Test', async ({ page }) => {
    // 1. Login page par jana
    await page.goto('http://localhost:3000/login');

    // 2. Email bharna (Smarter way: css selector use karke)
    await page.locator('input[type="email"]').fill('test1@gmail.com');

    // 3. Password bharna (Smarter way: type="password" dhoondhna)
    await page.locator('input[type="password"]').fill('123456');

    // 4. Login button click karna
    await page.getByRole('button', { name: 'Login' }).click();

    // 5. Dashboard ka intezar karna
    // Note: Agar dashboard ka URL alag hai toh yahan change karein
    await expect(page).toHaveURL(/.*dashboard/);
});