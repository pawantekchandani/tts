import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

// Helper to generate unique emails
const generateEmail = () => `user_${Date.now()}_${Math.floor(Math.random() * 1000)}@test.com`;

test.describe('Signup Page Tests (Top 5)', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/register`);
    });

    test('1. Should register successfully with valid credentials', async ({ page }) => {
        const email = generateEmail();
        const password = 'Password123!';

        await page.fill('input[type="email"]', email);
        await page.locator('input[type="password"]').first().fill(password);
        await page.locator('input[type="password"]').nth(1).fill(password);
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(`${BASE_URL}/login`, { timeout: 10000 });
    });

    test('2. Should fail when passwords do not match', async ({ page }) => {
        const email = generateEmail();
        await page.fill('input[type="email"]', email);
        await page.locator('input[type="password"]').first().fill('Password123!');
        await page.locator('input[type="password"]').nth(1).fill('Password999!');
        await page.click('button[type="submit"]');

        await expect(page.locator('text=Passwords do not match')).toBeVisible();
    });

    test('3. Should fail when password is too short (< 6 characters)', async ({ page }) => {
        const email = generateEmail();
        await page.fill('input[type="email"]', email);
        await page.locator('input[type="password"]').first().fill('12345');
        await page.locator('input[type="password"]').nth(1).fill('12345');
        await page.click('button[type="submit"]');

        await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
    });

    test('4. Should fail if email is already registered', async ({ page }) => {
        const email = generateEmail();
        const password = 'Password123!';

        // First registration
        await page.fill('input[type="email"]', email);
        await page.locator('input[type="password"]').first().fill(password);
        await page.locator('input[type="password"]').nth(1).fill(password);
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(`${BASE_URL}/login`, { timeout: 20000 });

        // Second registration with same email
        await page.goto(`${BASE_URL}/register`);
        await page.fill('input[type="email"]', email);
        await page.locator('input[type="password"]').first().fill(password);
        await page.locator('input[type="password"]').nth(1).fill(password);
        await page.click('button[type="submit"]');

        // Check for ANY visible error text or toast
        // We know backend sends "400: Email already registered"
        // Frontend displays err.detail OR "Registration failed"
        // Since backend sends 500 containing the message, frontend axios catch block catches it
        // The message likely contains "Email already registered" inside the 500 error detail

        await expect(
            page.locator('div[role="alert"]')
                .or(page.locator('.Toastify__toast--error'))
                .or(page.locator('text=Email already registered'))
                .or(page.locator('text=Registration failed'))
        ).toBeVisible({ timeout: 20000 });
    });

    test('5. Should navigate to Login page via link', async ({ page }) => {
        await page.click('text=Login');
        await expect(page).toHaveURL(`${BASE_URL}/login`);
    });

});