import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('disable-devtool Disarmer', () => {
    test('should detect DevTools when disarmer is NOT applied (Verification of Red Phase)', async ({ page }) => {
        await page.goto(`file://${path.join(process.cwd(), 'tests/fixtures/disable-devtool.html')}`);

        let detected = false;
        page.on('console', msg => {
            console.log('BROWSER LOG:', msg.text());
            if (msg.text().includes('Devtools detected!') || msg.text().includes('permission to use DEVTOOL')) {
                detected = true;
            }
        });

        await page.evaluate(() => {
            // disable-devtool detects if outerWidth - innerWidth > 160 (usually)
            // But we must also ensure it's actually running.
            // The library might be checking other things.
            Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth + 200, configurable: true });
            Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight + 200, configurable: true });
        });

        await page.waitForTimeout(5000);

        expect(detected).toBe(true);
    });

    test('should NOT detect DevTools when disarmer is applied (Green Phase)', async ({ page }) => {
        await page.goto(`file://${path.join(process.cwd(), 'tests/fixtures/disable-devtool.html')}`);

        // Inject the disarmer
        const stealthSource = fs.readFileSync(path.join(process.cwd(), 'src/utils/stealth.js'), 'utf8');
        let disarmerSource = fs.readFileSync(path.join(process.cwd(), 'src/disable-devtool/disarmer.js'), 'utf8');
        disarmerSource = disarmerSource.replace(/\/\/ @include\s+["'](.+?)["']/, stealthSource);
        await page.evaluate(disarmerSource);

        let detected = false;
        page.on('console', msg => {
            if (msg.text().includes('Devtools detected!') || msg.text().includes('permission to use DEVTOOL')) {
                detected = true;
            }
        });

        await page.evaluate(() => {
            try {
                Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth + 200, configurable: true });
                Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight + 200, configurable: true });
            } catch (e) {
            }
        });

        await page.waitForTimeout(5000);

        expect(detected).toBe(false);
    });
});
