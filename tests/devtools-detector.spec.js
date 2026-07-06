import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('devtools-detector Disarmer', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`file://${path.join(process.cwd(), 'tests/fixtures/devtools-detector-mock.html')}`);
        // Wait for the mock's own initial checks to finish
        await page.waitForTimeout(1000);
    });

    function getDisarmerSource() {
        const stealthSource = fs.readFileSync(path.join(process.cwd(), 'src/utils/stealth.js'), 'utf8');
        let disarmerSource = fs.readFileSync(path.join(process.cwd(), 'src/devtools-detector/disarmer.js'), 'utf8');
        disarmerSource = disarmerSource.replace(/\/\/ @include\s+["'](.+?)["']/, stealthSource);
        return disarmerSource;
    }

    test('Mock should detect "DevTools" by default (Red Phase)', async ({ page }) => {
        await page.evaluate(() => {
            Object.defineProperty(window, 'outerWidth', { value: 1000, configurable: true });
            Object.defineProperty(window, 'outerHeight', { value: 800, configurable: true });
            window.runChecks();
        });

        await expect(page.locator('#FormatterCheck')).toContainText('DETECTED');
        await expect(page.locator('#GeometryCheck')).toContainText('DETECTED');
        await expect(page.locator('#IDCheck')).toContainText('DETECTED');
    });

    test('Disarmer should neutralize all detections (Green Phase)', async ({ page }) => {
        await page.evaluate(getDisarmerSource());

        await page.evaluate(() => {
            window.runChecks();
        });

        await expect(page.locator('#FormatterCheck')).toContainText('NOT DETECTED');
        await expect(page.locator('#GeometryCheck')).toContainText('NOT DETECTED');
        await expect(page.locator('#IDCheck')).toContainText('NOT DETECTED');
        await expect(page.locator('#ToStringCheck')).toContainText('NOT DETECTED');
    });

    test('Disarmer should prevent destructive actions', async ({ page }) => {
        await page.evaluate(getDisarmerSource());

        await page.evaluate(() => {
            window.triggerClose();
        });
        await expect(page.locator('#DestructiveCheck')).toContainText('CLOSE TRIGGERED');

        // Reload test:
        await page.evaluate(() => { window.stillHere = true; });

        // We'll use a beforeunload listener in the test itself to verify it was triggered
        let reloadAttempted = false;
        page.on('dialog', async dialog => {
            reloadAttempted = true;
            await dialog.dismiss();
        });

        await page.evaluate(() => {
            window.triggerReload();
        });

        // If our patch worked, stillHere remains true AND no navigation occurred.
        // If it didn't work but we are in Playwright, it might still navigate.
        // We check #DestructiveCheck text - if it's "RELOAD TRIGGERED", the code AFTER reload() ran.
        await expect(page.locator('#DestructiveCheck')).toContainText('RELOAD TRIGGERED');
        const stillHere = await page.evaluate(() => window.stillHere);
        expect(stillHere).toBe(true);
    });
});
