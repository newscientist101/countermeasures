import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('devtools-detector Disarmer', () => {
    function getDisarmerSource() {
        const stealthSource = fs.readFileSync(path.join(process.cwd(), 'src/utils/stealth.js'), 'utf8');
        let disarmerSource = fs.readFileSync(path.join(process.cwd(), 'src/devtools-detector/disarmer.js'), 'utf8');
        disarmerSource = disarmerSource.replace(/\/\/ @include\s+["'](.+?)["']/, stealthSource);
        return disarmerSource;
    }

    test('Red Phase: Real library should detect "DevTools" via geometry spoof', async ({ page }) => {
        await page.addInitScript(() => {
            Object.defineProperty(window, 'outerWidth', { value: 1000, configurable: true });
            Object.defineProperty(window, 'outerHeight', { value: 800, configurable: true });
        });
        await page.goto(`file://${path.join(process.cwd(), 'tests/fixtures/devtools-detector.html')}`);

        await expect(page.locator('body')).toHaveClass(/detected/, { timeout: 10000 });
        await expect(page.locator('#status')).toHaveText('DETECTED');
    });

    test('Green Phase: Disarmer should neutralize real library detections', async ({ page }) => {
        await page.addInitScript(getDisarmerSource());
        await page.goto(`file://${path.join(process.cwd(), 'tests/fixtures/devtools-detector.html')}`);

        await page.evaluate(() => {
            try {
                Object.defineProperty(window, 'outerWidth', { value: 1000, configurable: true });
            } catch (e) {}
            window.dispatchEvent(new Event('resize'));
        });

        // Use toPass to verify it remains NOT DETECTED over a period
        await expect(async () => {
             const status = await page.locator('#status').innerText();
             expect(status).toBe('NOT DETECTED');
             const hasClass = await page.locator('body').evaluate(el => el.classList.contains('detected'));
             expect(hasClass).toBe(false);
        }).toPass({ timeout: 5000 });
    });
});
