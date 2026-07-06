import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Jscrambler Universal Bypass', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(`file://${path.join(process.cwd(), 'tests/fixtures/jscrambler-mock.html')}`);
    });

    test('Red Phase: Mock should detect "debugging" without bypass', async ({ page }) => {
        // Wait for checks to run automatically
        await page.waitForTimeout(1000);

        const timingCheck = page.locator('#TimingCheck');
        const consoleTrapCheck = page.locator('#ConsoleTrapCheck');
        const integrityCheck = page.locator('#IntegrityCheck');
        const debuggerCheck = page.locator('#DebuggerCheck');
        const stackCheck = page.locator('#StackCheck');

        // Without any bypass, these should be "DETECTED" or at least normal behavior
        await expect(timingCheck).toContainText('DETECTED');
        await expect(consoleTrapCheck).toContainText('DETECTED');
        // Integrity should be NOT DETECTED because it's currently native
        await expect(integrityCheck).toContainText('NOT DETECTED');
        await expect(debuggerCheck).toContainText('DETECTED');
        await expect(stackCheck).toContainText('DETECTED');
    });

    test('Green Phase: Disarmer and Timing Suppressor should neutralize detections', async ({ page }) => {
        // 1. Load and inject the disarmer and suppressor
        const stealthSource = fs.readFileSync(path.join(process.cwd(), 'src/utils/stealth.js'), 'utf8');
        let disarmerSource = fs.readFileSync(path.join(process.cwd(), 'src/jscrambler/disarmer.js'), 'utf8');
        disarmerSource = disarmerSource.replace(/\/\/ @include\s+["'](.+?)["']/, stealthSource);

        let suppressorSource = fs.readFileSync(path.join(process.cwd(), 'src/jscrambler/timing-suppressor.js'), 'utf8');
        suppressorSource = suppressorSource.replace(/\/\/ @include\s+["'](.+?)["']/, stealthSource);

        await page.evaluate(disarmerSource);
        await page.evaluate(suppressorSource);

        // 2. Re-run all checks
        await page.evaluate(() => {
            window.runAllChecks();
        });

        // 3. Wait for checks to complete
        await page.waitForTimeout(1000);

        const timingCheck = page.locator('#TimingCheck');
        const consoleTrapCheck = page.locator('#ConsoleTrapCheck');
        const integrityCheck = page.locator('#IntegrityCheck');
        const debuggerCheck = page.locator('#DebuggerCheck');
        const stackCheck = page.locator('#StackCheck');

        // With bypass, timing should be 0 (NOT DETECTED)
        await expect(timingCheck).toContainText('NOT DETECTED');
        // Console traps should be blocked (NOT DETECTED)
        await expect(consoleTrapCheck).toContainText('NOT DETECTED');
        // Integrity should still be NOT DETECTED (spoofed native)
        await expect(integrityCheck).toContainText('NOT DETECTED');
        // Debugger should be stripped (NOT DETECTED)
        await expect(debuggerCheck).toContainText('NOT DETECTED');
        // Stack should be blocked or modified (NOT DETECTED)
        await expect(stackCheck).toContainText('NOT DETECTED');
    });
});
