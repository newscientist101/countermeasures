import { test, expect } from '@playwright/test';
import path from 'path';

import fs from 'fs';

test.describe('detect-devtools Detection', () => {
    test('mock should NOT detect "DevTools" when disarmer is applied (Green Phase)', async ({ page }) => {
        await page.goto(`file://${path.join(process.cwd(), 'tests/fixtures/detect-devtools-mock.html')}`);

        // Inject the disarmer before the mock's checks run
        const stealthSource = fs.readFileSync(path.join(process.cwd(), 'src/utils/stealth.js'), 'utf8');
        let disarmerSource = fs.readFileSync(path.join(process.cwd(), 'src/detect-devtools/disarmer.js'), 'utf8');
        disarmerSource = disarmerSource.replace(/\/\/ @include\s+["'](.+?)["']/, stealthSource);

        await page.evaluate(disarmerSource);

        // Manually trigger checks because the disarmer might have killed the scheduled timeout
        await page.evaluate(() => {
            runObjectIDCheck();
            runLogPerformanceCheck();
            runToStringCheck();
            runDebugCheck();
        });

        // Wait for checks to complete (they use internal setTimeouts for reporting in some cases)
        await page.waitForTimeout(1000);

        const objectIDCheck = page.locator('#ObjectIDCheck');
        const logPerformanceCheck = page.locator('#LogPerformanceCheck');
        const toStringCheck = page.locator('#ToStringCheck');
        const debugCheck = page.locator('#DebugCheck');

        await expect(objectIDCheck).toContainText('NOT DETECTED');
        await expect(logPerformanceCheck).toContainText('NOT DETECTED');
        await expect(toStringCheck).toContainText('NOT DETECTED');
        await expect(debugCheck).toContainText('NOT DETECTED');
    });
});
