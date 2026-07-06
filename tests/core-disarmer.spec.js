import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Core Disarmer Bookmarklet', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`file://${path.join(process.cwd(), 'tests/fixtures/mock-shield.html')}`);
    });

    test('Red Phase: Mock should detect DevTools via geometry and remove scripts', async ({ page }) => {
        // Mock shield detects if outerWidth - innerWidth > 160
        await page.setViewportSize({ width: 800, height: 600 });
        await page.evaluate(() => {
            // We need to trigger a detection.
            // In Playwright, outerWidth is often equal to innerWidth unless we change it.
            // Since we can't easily change outerWidth in the browser from JS (it's read-only),
            // and Playwright's setViewportSize changes innerWidth.
            // We can spoof it for the RED phase test to verify the MOCK'S behavior.
            Object.defineProperty(window, 'outerWidth', { value: 1000, configurable: true });
        });

        // The mock has a setInterval(check, 1000)
        await expect(page.locator('#status')).toContainText('DETECTED', { timeout: 5000 });

        // Mock removes scripts on detection
        const scriptCount = await page.locator('script').count();
        expect(scriptCount).toBe(0);
    });

    test('Green Phase: should disarm viewport detection', async ({ page }) => {
        const coreDisarmerSource = fs.readFileSync(path.join(process.cwd(), 'src/bytehide-shield/core-disarmer.js'), 'utf8');
        const stealthSource = fs.readFileSync(path.join(process.cwd(), 'src/utils/stealth.js'), 'utf8');
        let coreDisarmerSource = fs.readFileSync(path.join(process.cwd(), 'src/bytehide-shield/core-disarmer.js'), 'utf8');
        coreDisarmerSource = coreDisarmerSource.replace(/\/\/ @include\s+["'](.+?)["']/, stealthSource);
        await page.evaluate(coreDisarmerSource);

        const outerWidth = await page.evaluate(() => window.outerWidth);
        const innerWidth = await page.evaluate(() => window.innerWidth);
        expect(outerWidth).toBe(innerWidth);

        const performanceNow = await page.evaluate(() => performance.now());
        expect(performanceNow).toBe(0);
    });

    test('Green Phase: should prevent script removal', async ({ page }) => {
        const coreDisarmerSource = fs.readFileSync(path.join(process.cwd(), 'src/bytehide-shield/core-disarmer.js'), 'utf8');
    test('should prevent script removal', async ({ page }) => {
        await page.goto(`file://${path.join(process.cwd(), 'tests/fixtures/mock-shield.html')}`);

        const stealthSource = fs.readFileSync(path.join(process.cwd(), 'src/utils/stealth.js'), 'utf8');
        let coreDisarmerSource = fs.readFileSync(path.join(process.cwd(), 'src/bytehide-shield/core-disarmer.js'), 'utf8');
        coreDisarmerSource = coreDisarmerSource.replace(/\/\/ @include\s+["'](.+?)["']/, stealthSource);
        await page.evaluate(coreDisarmerSource);

        const scriptCountBefore = await page.locator('script').count();
        expect(scriptCountBefore).toBeGreaterThan(0);

        await page.evaluate(() => {
            const script = document.querySelector('script');
            if (script) script.remove();
        });

        const scriptCountAfter = await page.locator('script').count();
        expect(scriptCountAfter).toBe(scriptCountBefore);
    });
});
