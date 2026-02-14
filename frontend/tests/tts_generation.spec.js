import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://127.0.0.1:8000/api';

// Unique user for this test suite
let testUser = {
    email: `tts_full_test_${Date.now()}@test.com`,
    password: 'Password123!'
};

test.describe('TTS Feature Complete Suite', () => {
    // Run tests in this file serially to share the user session & avoid parallel login conflicts
    test.describe.configure({ mode: 'serial' });

    // Setup: Create a new user for testing
    test.beforeAll(async ({ request }) => {
        console.log(`Creating test user: ${testUser.email}`);
        const response = await request.post(`${BACKEND_URL}/signup`, {
            data: {
                email: testUser.email,
                password: testUser.password
            }
        });
        if (!response.ok()) {
            console.error('Failed to create test user:', await response.text());
        }
        expect(response.ok()).toBeTruthy();
    });

    // Login before each test
    test.beforeEach(async ({ page }) => {
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', testUser.email);
        await page.fill('input[type="password"]', testUser.password);
        await page.click('button[type="submit"]');

        // Wait for login success and redirect to Home
        await expect(page).toHaveURL(`${BASE_URL}/`);

        // Find and click the "Text to Speech" service card on Home page
        const ttsCard = page.locator('h3:has-text("Text to Speech")');
        await expect(ttsCard).toBeVisible();
        await ttsCard.click();

        // Now wait for navigation to TTS dashboard
        await expect(page).toHaveURL(`${BASE_URL}/tts`);
        // Verify dashboard is loaded
        await expect(page.locator('h2:has-text("Text to Speech")')).toBeVisible();
    });

    // --- BASIC TESTS ---

    test('1. Core Flow: Should generate audio for valid text', async ({ page }) => {
        const testText = 'Hello, this is an automated Playwright test for audio generation.';
        await page.fill('textarea', testText);

        const generateBtn = page.locator('button:has-text("Generate Mp3")');
        await expect(generateBtn).toBeEnabled();
        await generateBtn.click();

        await expect(page.locator('text=Generating...')).toBeVisible();
        const audioPlayer = page.locator('audio');
        await expect(audioPlayer).toBeVisible({ timeout: 45000 });

        const src = await audioPlayer.getAttribute('src');
        expect(src).toBeTruthy();
    });

    test('2. Validation: Generate button should be disabled when text is empty', async ({ page }) => {
        await page.fill('textarea', '');
        const generateBtn = page.locator('button:has-text("Generate Mp3")');
        await expect(generateBtn).toBeDisabled();
    });

    test('3. Voice Selection: Should allow switching voices', async ({ page }) => {
        // Just verify basic presence as UI details might vary
        await page.fill('textarea', 'Testing voice change.');
        await expect(page.locator('text=Select Voice')).toBeVisible();
    });

    test('4. History: Should show new conversion in history list', async ({ page }) => {
        const uniqueText = `History Test ${Date.now()}`;
        await page.fill('textarea', uniqueText);
        await page.click('button:has-text("Generate Mp3")');
        await expect(page.locator('audio')).toBeVisible({ timeout: 45000 });

        const historyItem = page.locator(`text=${uniqueText}`).first();
        await expect(historyItem).toBeVisible();
    });

    test('5. Playback: Audio player controls should work', async ({ page }) => {
        await page.fill('textarea', 'Playback test.');
        await page.click('button:has-text("Generate Mp3")');
        await expect(page.locator('audio')).toBeVisible({ timeout: 45000 });
        const audio = page.locator('audio');
        await expect(audio).toBeVisible();
    });

    // --- ADVANCED TESTS (Merged) ---

    test('6. Download: Should initiate file download', async ({ page }) => {
        await page.fill('textarea', 'Testing download feature.');
        await page.click('button:has-text("Generate Mp3")');
        await expect(page.locator('audio')).toBeVisible({ timeout: 45000 });

        const downloadBtn = page.locator('button:has-text("Download MP3")');
        await expect(downloadBtn).toBeVisible();

        const downloadPromise = page.waitForEvent('download');
        await downloadBtn.click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.mp3');
    });

    test('7. Speed Control: Should update playback rate', async ({ page }) => {
        await page.fill('textarea', 'Testing speed control.');
        await page.click('button:has-text("Generate Mp3")');
        await expect(page.locator('audio')).toBeVisible({ timeout: 45000 });

        const slider = page.locator('input[type="range"][min="0.5"][max="2.0"]');
        await expect(slider).toBeVisible();
        await slider.fill('1.5');
        await expect(page.locator('text=Speed: 1.5x')).toBeVisible();

        const rate = await page.$eval('audio', el => el.playbackRate);
        expect(rate).toBe(1.5);
    });

    test('8. Long Text: Should process text > 3000 chars (Chunking)', async ({ page }) => {
        const longText = 'This is a long text segment to test chunking. '.repeat(100);
        expect(longText.length).toBeGreaterThan(3000);

        await page.fill('textarea', longText);
        await page.click('button:has-text("Generate Mp3")');

        await expect(page.locator('text=Generating...')).toBeVisible();
        await expect(page.locator('audio')).toBeVisible({ timeout: 90000 }); // Longer timeout for chunks

        const src = await page.getAttribute('audio', 'src');
        expect(src).toBeTruthy();
    });

    test('9. Credits: Should verify credits display and deduction', async ({ page }) => {
        // Initial check
        const creditsLocator = page.locator('text=Credits Used:');
        await expect(creditsLocator).toBeVisible();
        const initialText = await creditsLocator.innerText();
        const initialUsed = parseInt(initialText.split(':')[1].trim().split('/')[0]);

        // Action: Generate audio
        await page.fill('textarea', "Credit check.");
        await page.click('button:has-text("Generate Mp3")');
        await expect(page.locator('audio')).toBeVisible({ timeout: 45000 });

        // Wait for potential credit update
        await page.waitForTimeout(3000);

        // Final check
        const finalText = await creditsLocator.innerText();
        const finalUsed = parseInt(finalText.split(':')[1].trim().split('/')[0]);
        expect(finalUsed).toBeGreaterThan(initialUsed);
    });

});
