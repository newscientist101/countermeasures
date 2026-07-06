import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Interval Killer Bookmarklet', () => {
    test('should clear existing intervals and hijack new ones', async ({ page }) => {
        await page.goto(`file://${path.join(process.cwd(), 'tests/fixtures/mock-shield.html')}`);

        const initialCount = await page.evaluate(() => {
            window.intervalFired = 0;
            window.testInterval = setInterval(() => { window.intervalFired++; }, 10);
            return window.testInterval;
        });

        await page.waitForTimeout(100);
        const firedBefore = await page.evaluate(() => window.intervalFired);
        expect(firedBefore).toBeGreaterThan(0);

        const killerSource = fs.readFileSync(path.join(process.cwd(), 'src/bytehide-shield/interval-killer.js'), 'utf8');
        await page.evaluate(killerSource);

        const firedAfterKiller = await page.evaluate(() => window.intervalFired);
        await page.waitForTimeout(100);
        const firedFinal = await page.evaluate(() => window.intervalFired);
        expect(firedFinal).toBe(firedAfterKiller);

        await page.evaluate(() => {
            window.newIntervalFired = 0;
            setInterval(() => { window.newIntervalFired++; }, 10);
        });
        await page.waitForTimeout(100);
        const newFired = await page.evaluate(() => window.newIntervalFired);
        expect(newFired).toBe(0);
    });
});
