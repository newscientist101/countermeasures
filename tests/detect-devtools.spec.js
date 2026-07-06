import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('detect-devtools Detection', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`file://${path.join(process.cwd(), 'tests/fixtures/detect-devtools.html')}`);
    });

    function getDisarmerSource() {
        const stealthSource = fs.readFileSync(path.join(process.cwd(), 'src/utils/stealth.js'), 'utf8');
        let disarmerSource = fs.readFileSync(path.join(process.cwd(), 'src/detect-devtools/disarmer.js'), 'utf8');
        disarmerSource = disarmerSource.replace(/\/\/ @include\s+["'](.+?)["']/, stealthSource);
        return disarmerSource;
    }

    test('Red Phase: should detect DevTools when NO disarmer is applied', async ({ page }) => {
        // Trigger detection manually since we can't easily open DevTools in Playwright
        // detect-devtools uses ObjectID check via console.dir
        await page.waitForTimeout(2000);
        await page.evaluate(() => {
            console.dir(new Image());
        });
        await expect(page.locator('#status')).toContainText('DETECTED', { timeout: 5000 });
    });

    test('Green Phase: mock should NOT detect "DevTools" when disarmer is applied', async ({ page }) => {
        await page.evaluate(getDisarmerSource());
        await page.waitForTimeout(2000);
        await page.evaluate(() => {
            console.dir(new Image());
        });
        const status = page.locator('#status');
        await expect(status).toHaveText('NOT DETECTED');
        const count = await page.locator('#detection-count').innerText();
        expect(parseInt(count)).toBe(0);
    });
});
