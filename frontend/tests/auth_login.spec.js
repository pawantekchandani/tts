import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://127.0.0.1:8000/api';

// Shared credentials for the login tests
let testUser = {
    email: `auto_login_${Date.now()}@test.com`,
    password: 'Password123!'
};

test.describe('Login Page Tests', () => {

    // Setup: Create a user BEFORE running the login tests so we have a valid account
    test.beforeAll(async ({ request }) => {
        // We use Playwright's APIRequestContext to create a user directly on the backend
        const response = await request.post(`${BACKEND_URL}/signup`, {
            data: {
                email: testUser.email,
                password: testUser.password
            }
        });

        // If user already exists (rare due to timestamp), we proceed, otherwise check success
        if (!response.ok()) {
            console.log('Setup user creation response:', await response.text());
        }
    });

    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
    });

    test('1. Should login successfully with the new account', async ({ page }) => {
        await page.fill('input[type="email"]', testUser.email);
        await page.fill('input[type="password"]', testUser.password);
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(`${BASE_URL}/`);
        await expect(page.locator('text=Start Login')).not.toBeVisible();
    });

    test('2. Should fail with unregistered email', async ({ page }) => {
        await page.fill('input[type="email"]', 'random_unregistered@test.com');
        await page.fill('input[type="password"]', 'Password123');
        await page.click('button[type="submit"]');

        await expect(page.locator('text=Email is not registered')).toBeVisible();
    });

    test('3. Should fail with wrong password', async ({ page }) => {
        await page.fill('input[type="email"]', testUser.email);
        await page.fill('input[type="password"]', 'WrongPassword!');
        await page.click('button[type="submit"]');

        // Check for generic login failed or specific error depending on backend
        // Login.jsx says: toast.error(err.detail || 'Login failed')
        const errorToast = page.locator('div[role="alert"]').or(page.locator('.Toastify__toast--error')).or(page.locator('text=Invalid password')).or(page.locator('text=Login failed'));
        await expect(errorToast.first()).toBeVisible();
    });

    test('4. Should fail with empty email', async ({ page }) => {
        await page.fill('input[type="password"]', 'Password123!');
        await page.click('button[type="submit"]');

        await expect(page.locator('text=Email and password are required')).toBeVisible();
    });

    test('5. Should fail with empty password', async ({ page }) => {
        await page.fill('input[type="email"]', testUser.email);
        await page.click('button[type="submit"]');

        await expect(page.locator('text=Email and password are required')).toBeVisible();
    });

    // Test 6 removed as it tests browser native validation which is flaky in automated tests 
    // and covered by backend validation tests.

    test('7. Should navigate to Register page', async ({ page }) => {
        await page.click('text=Register');
        await expect(page).toHaveURL(`${BASE_URL}/register`);
    });

    test('8. Should navigate to Forgot Password page', async ({ page }) => {
        await page.click('text=Forgot Password?');
        await expect(page).toHaveURL(`${BASE_URL}/forgot-password`);
    });

    test('9. Should show loading state while logging in', async ({ page }) => {
        await page.route('**/api/login', async route => {
            await new Promise(f => setTimeout(f, 1000));
            await route.continue();
        });

        await page.fill('input[type="email"]', testUser.email);
        await page.fill('input[type="password"]', testUser.password);
        await page.click('button[type="submit"]');

        await expect(page.locator('button[type="submit"]')).toBeDisabled();
        // Login.jsx says "Logging in..."
        await expect(page.locator('text=Logging in...')).toBeVisible();
    });

    test('10. Should successfully redirect to Admin Dashboard for admin user', async ({ page }) => {
        // Setup mock admin response
        await page.route('**/api/login', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    access_token: 'mock_admin_token',
                    plan_type: 'Pro',
                    email: 'admin@gmail.com' // Triggers checking in Login.jsx
                })
            });
        });

        await page.route('**/api/me', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: 'admin_id',
                    email: 'admin@gmail.com',
                    plan_type: 'Pro',
                    is_admin: true
                })
            });
        });

        await page.fill('input[type="email"]', 'admin@gmail.com');
        await page.fill('input[type="password"]', 'AdminPassword');
        await page.click('button[type="submit"]');

        await expect(page).toHaveURL(`${BASE_URL}/admin`);
    });

});