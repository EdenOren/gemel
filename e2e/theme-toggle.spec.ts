import { expect, test } from '@playwright/test';
import { gotoCompare } from './helpers';

test.describe('theme toggle', () => {
  test('toggles data-theme and persists the choice across a reload', async ({ page }) => {
    await gotoCompare(page);

    const root = page.locator('html');
    const initialTheme = await root.getAttribute('data-theme');

    await page.locator('.app-theme-toggle').click();
    const toggledTheme = initialTheme === 'dark' ? 'light' : 'dark';
    await expect(root).toHaveAttribute('data-theme', toggledTheme);

    const stored = await page.evaluate(() => localStorage.getItem('gemel:theme'));
    expect(stored).toBe(toggledTheme);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', toggledTheme);

    // toggle back so this test doesn't leave the browser's storage state mutated for
    // whichever spec happens to run next against the same origin
    await page.locator('.app-theme-toggle').click();
    await expect(root).toHaveAttribute('data-theme', initialTheme ?? 'light');
  });

  test('toggle button label flips between the two modes', async ({ page }) => {
    await gotoCompare(page);
    const button = page.locator('.app-theme-toggle');
    const firstLabel = await button.getAttribute('aria-label');

    await button.click();
    await expect(button).not.toHaveAttribute('aria-label', firstLabel ?? '');

    await button.click();
    await expect(button).toHaveAttribute('aria-label', firstLabel ?? '');
  });
});
