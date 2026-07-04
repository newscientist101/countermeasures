import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Core Disarmer Bookmarklet', () => {
    test('should disarm viewport detection', async ({ page }) => {
        await page.goto(`file://${path.join(process.cwd(), 'tests/fixtures/mock-shield.html')}`);

        const coreDisarmerSource = fs.readFileSync(path.join(process.cwd(), 'src/bytehide-shield/core-disarmer.js'), 'utf8');
        await page.evaluate(coreDisarmerSource);

        const outerWidth = await page.evaluate(() => window.outerWidth);
        const innerWidth = await page.evaluate(() => window.innerWidth);
        expect(outerWidth).toBe(innerWidth);

        const performanceNow = await page.evaluate(() => performance.now());
        expect(performanceNow).toBe(0);
    });

    test('should prevent script removal', async ({ page }) => {
        await page.goto(`file://${path.join(process.cwd(), 'tests/fixtures/mock-shield.html')}`);

        const coreDisarmerSource = fs.readFileSync(path.join(process.cwd(), 'src/bytehide-shield/core-disarmer.js'), 'utf8');
        await page.evaluate(coreDisarmerSource);

        const scriptCountBefore = await page.locator('script').count();

        await page.evaluate(() => {
            const script = document.querySelector('script');
            if (script) script.remove();
        });

        const scriptCountAfter = await page.locator('script').count();
        expect(scriptCountAfter).toBe(scriptCountBefore);
    });
});
