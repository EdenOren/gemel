import { expect, test } from '@playwright/test';
import { gotoCompare } from './helpers';

test.describe('initial load', () => {
  test('shows the page title, header, and footer', async ({ page }) => {
    await gotoCompare(page);

    await expect(page).toHaveTitle(/מדד גמל/);
    await expect(page.locator('.compare__title')).toHaveText('מדד גמל');
    await expect(page.locator('.compare__subtitle')).toHaveText('משווים תשואות. בוחרים חכם.');
    await expect(page.locator('.app-footer__copyright')).toContainText(String(new Date().getFullYear()));
  });

  test('defaults to "by company" mode with no selection yet, showing the hint', async ({ page }) => {
    await gotoCompare(page);

    await expect(page.locator('.compare__tab--active')).toHaveText('לפי חברה');
    await expect(page.locator('.compare-by-company__hint')).toContainText('בחרו חברה אחת או יותר');
  });

  test('switching to "by path" mode with no selection shows its own hint', async ({ page }) => {
    await gotoCompare(page);

    await page.locator('.compare__tab', { hasText: 'לפי מסלול' }).click();
    await expect(page.locator('.compare-by-path__hint')).toContainText('בחרו מסלול אחד או יותר');
  });
});
