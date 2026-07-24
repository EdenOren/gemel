import { expect, test } from '@playwright/test';
import { gotoCompare } from './helpers';

test.describe('disclaimer modal', () => {
  test('opens from the footer link and shows the legal text', async ({ page }) => {
    await gotoCompare(page);

    const dialog = page.locator('.disclaimer-modal');
    await expect(dialog).toBeHidden();

    await page.locator('.app-footer__disclaimer').click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('חשוב לדעת');
  });

  test('closes via the close button', async ({ page }) => {
    await gotoCompare(page);
    await page.locator('.app-footer__disclaimer').click();

    const dialog = page.locator('.disclaimer-modal');
    await expect(dialog).toBeVisible();

    await page.locator('.disclaimer-modal__close').click();
    await expect(dialog).toBeHidden();
  });

  test('closes on Escape', async ({ page }) => {
    await gotoCompare(page);
    await page.locator('.app-footer__disclaimer').click();

    const dialog = page.locator('.disclaimer-modal');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('the developer link points at the right external URL', async ({ page }) => {
    await gotoCompare(page);
    const link = page.locator('.app-footer__dev-link');
    await expect(link).toHaveAttribute('href', 'https://edenoren.github.io/');
    await expect(link).toHaveAttribute('target', '_blank');
  });
});
