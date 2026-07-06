import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Jscrambler Universal Bypass', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`file://${path.join(process.cwd(), 'tests/fixtures/jscrambler-complex-mock.html')}`);
    });

    test('Red Phase: Mock should detect "debugging" without bypass', async ({ page }) => {
        // Wait for checks to run automatically
        await page.waitForTimeout(1000);

        await expect(page.locator('#res-TimingCheck')).toContainText('DETECTED');
        await expect(page.locator('#res-RegExpTrap')).toContainText('NOT DETECTED'); // Regex trap is NOT detected by default (browser is native)
        await expect(page.locator('#res-IntegrityCheck')).toContainText('NOT DETECTED'); // Integrity is NOT detected by default
        await expect(page.locator('#res-DebuggerCheck')).toContainText('DETECTED'); // Mock reports DETECTED if 'debugger' is in source
        await expect(page.locator('#res-StackCheck')).toContainText('DETECTED'); // Stack exists by default
    });

    test('Green Phase: Disarmer and Timing Suppressor should neutralize detections', async ({ page }) => {
        const disarmerSource = fs.readFileSync(path.join(process.cwd(), 'src/jscrambler/disarmer.js'), 'utf8');
        const suppressorSource = fs.readFileSync(path.join(process.cwd(), 'src/jscrambler/timing-suppressor.js'), 'utf8');

        await page.evaluate(disarmerSource);
        await page.evaluate(suppressorSource);

        // Re-run all checks
        await page.evaluate(() => {
            window.runAllChecks();
        });

        // Wait for checks to complete
        await page.waitForTimeout(1000);

        // Timing should be 0 (NOT DETECTED)
        await expect(page.locator('#res-TimingCheck')).toContainText('NOT DETECTED');
        // RegExp trap should be neutralized (spoofed native)
        await expect(page.locator('#res-RegExpTrap')).toContainText('NOT DETECTED');
        // Integrity should still be NOT DETECTED (spoofed native)
        await expect(page.locator('#res-IntegrityCheck')).toContainText('NOT DETECTED');

        // Debugger check: The disarmer replaces 'debugger' with a comment.
        // The mock checks if the stringified function body contains 'debugger'.
        // Wait, the disarmer hooks Function and Function.prototype.constructor.
        // It should work for new Function('debugger').
        await expect(page.locator('#res-DebuggerCheck')).toContainText('NOT DETECTED');

        // Stack should be suppressed (NOT DETECTED)
        await expect(page.locator('#res-StackCheck')).toContainText('NOT DETECTED');
    });
});
