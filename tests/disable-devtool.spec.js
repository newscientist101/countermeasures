import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('disable-devtool Disarmer', () => {
    function getDisarmerSource() {
        const stealthSource = fs.readFileSync(path.join(process.cwd(), 'src/utils/stealth.js'), 'utf8');
        let disarmerSource = fs.readFileSync(path.join(process.cwd(), 'src/disable-devtool/disarmer.js'), 'utf8');
        disarmerSource = disarmerSource.replace(/\/\/ @include\s+["'](.+?)["']/, stealthSource);
        return disarmerSource;
    }

    test('Red Phase: Mock should detect DevTools via geometry spoof', async ({ page }) => {
        await page.addInitScript(() => {
            Object.defineProperty(window, 'outerWidth', { get: () => 2000 });
            Object.defineProperty(window, 'innerWidth', { get: () => 400 });
        });
        await page.goto(`file://${path.join(process.cwd(), 'tests/fixtures/disable-devtool-red-mock.html')}`);

        await expect(page.locator('#status')).toHaveText('DETECTED', { timeout: 10000 });
    });

    test('Green Phase: Disarmer should neutralize real library', async ({ page }) => {
        await page.addInitScript(getDisarmerSource());
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
                Object.defineProperty(window, 'outerWidth', { get: () => 2000, configurable: true });
                Object.defineProperty(window, 'innerWidth', { get: () => 400, configurable: true });
            } catch(e) {}
        });

        await expect(async () => {
            const status = await page.locator('#status').innerText();
            expect(status).toBe('INITIAL');
            const hasClass = await page.locator('body').evaluate(el => el.classList.contains('detected'));
            expect(hasClass).toBe(false);
        }).toPass({ timeout: 5000 });
    });
});
