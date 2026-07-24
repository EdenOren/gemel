import { expect, test } from '@playwright/test';
import { COMPANY_DROPDOWN, dropdownTrigger, gotoCompare, waitForResultsSettled } from './helpers';

test.describe('yield period multiselect', () => {
  test('exactly one period is active by default, and its button is disabled', async ({ page }) => {
    await gotoCompare(page);

    const active = page.locator('.yield-switch__option--active');
    await expect(active).toHaveCount(1);
    await expect(active).toBeDisabled();
  });

  test('adding a second period re-enables the first (no longer the sole selection)', async ({ page }) => {
    await gotoCompare(page);

    const soleActive = page.locator('.yield-switch__option--active');
    await expect(soleActive).toBeDisabled();

    const anotherOption = page.locator('.yield-switch__option:not(.yield-switch__option--active)').first();
    await anotherOption.click();

    await expect(page.locator('.yield-switch__option--active')).toHaveCount(2);
    for (const option of await page.locator('.yield-switch__option--active').all()) {
      await expect(option).toBeEnabled();
    }
  });

  test('removing back down to one re-disables the remaining option', async ({ page }) => {
    await gotoCompare(page);

    // A fixed index, not a live ":not(--active)" filter — re-querying that filter after
    // the first click would resolve to a *different* (still-inactive) option on the
    // second click instead of toggling the same one back off.
    const secondOption = page.locator('.yield-switch__option').nth(1);
    await expect(secondOption).not.toHaveClass(/--active/);

    await secondOption.click();
    await expect(page.locator('.yield-switch__option--active')).toHaveCount(2);

    await secondOption.click();
    const active = page.locator('.yield-switch__option--active');
    await expect(active).toHaveCount(1);
    await expect(active).toBeDisabled();
  });

  test('selecting a second period renders a second value column per result row', async ({ page }) => {
    await gotoCompare(page);

    // Default mode is "by company", so its primary selection (satisfying hasSelection())
    // is the company dropdown, at DOM index 1 regardless of mode.
    const companyTrigger = dropdownTrigger(page, COMPANY_DROPDOWN);
    await companyTrigger.click();
    await page.locator('.multiselect-dropdown__item').first().click();
    await companyTrigger.click();
    await waitForResultsSettled(page);

    // rows with no data render as a compact `--empty` line with no `__period` children at
    // all, so scope to a data-bearing row — sort order puts those first, but this is
    // explicit rather than relying on that.
    const dataRow = page.locator('.comparison-bed__row:not(.comparison-bed__row--empty)').first();
    await expect(dataRow.locator('.comparison-bed__period')).toHaveCount(1);

    const anotherPeriod = page.locator('.yield-switch__option:not(.yield-switch__option--active)').first();
    await anotherPeriod.click();
    await waitForResultsSettled(page);

    await expect(dataRow.locator('.comparison-bed__period')).toHaveCount(2);
  });
});
