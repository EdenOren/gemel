import { expect, test } from '@playwright/test';
import { PATH_DROPDOWN, closeDropdown, dropdownChips, dropdownTrigger, gotoCompare, openDropdown } from './helpers';

test.describe('multiselect dropdown', () => {
  test('selecting items shows them as chips in the trigger, not raw text', async ({ page }) => {
    await gotoCompare(page);

    await openDropdown(page, PATH_DROPDOWN);
    const items = page.locator('.multiselect-dropdown__item');
    await items.nth(0).click();
    await items.nth(1).click();
    await closeDropdown(page, PATH_DROPDOWN);

    await expect(dropdownChips(page, PATH_DROPDOWN)).toHaveCount(2);
  });

  test('search filters the option list', async ({ page }) => {
    await gotoCompare(page);

    await openDropdown(page, PATH_DROPDOWN);
    const items = page.locator('.multiselect-dropdown__item');
    const totalCount = await items.count();
    expect(totalCount).toBeGreaterThan(1);

    const firstLabel = (await items.nth(0).textContent())?.trim() ?? '';
    const searchTerm = firstLabel.slice(0, Math.min(3, firstLabel.length));

    await page.locator('.multiselect-dropdown__search').fill(searchTerm);
    await expect
      .poll(async () => items.count())
      .toBeLessThanOrEqual(totalCount);
    const filteredCount = await items.count();
    expect(filteredCount).toBeGreaterThan(0);

    for (let i = 0; i < filteredCount; i++) {
      await expect(items.nth(i)).toContainText(searchTerm);
    }
  });

  test('"select all" only selects the currently-searched items, not the full list', async ({ page }) => {
    await gotoCompare(page);

    await openDropdown(page, PATH_DROPDOWN);
    const items = page.locator('.multiselect-dropdown__item');
    const totalCount = await items.count();
    const firstLabel = (await items.nth(0).textContent())?.trim() ?? '';
    const searchTerm = firstLabel.slice(0, Math.min(3, firstLabel.length));

    await page.locator('.multiselect-dropdown__search').fill(searchTerm);
    const filteredCount = await items.count();
    // A meaningful test needs the search to actually narrow the list — otherwise "select
    // all (searched)" and "select all" would be indistinguishable.
    test.skip(filteredCount === totalCount, 'search term did not narrow the list on this data set');

    await page.locator('.multiselect-dropdown__action', { hasText: 'בחר הכל' }).click();
    await page.locator('.multiselect-dropdown__search').fill('');
    await expect(page.locator('.multiselect-dropdown__item--selected')).toHaveCount(filteredCount);
  });

  test('clear empties the pending selection without closing the menu', async ({ page }) => {
    await gotoCompare(page);

    await openDropdown(page, PATH_DROPDOWN);
    const items = page.locator('.multiselect-dropdown__item');
    await items.nth(0).click();
    await items.nth(1).click();
    await expect(page.locator('.multiselect-dropdown__item--selected')).toHaveCount(2);

    await page.locator('.multiselect-dropdown__action--clear').click();
    await expect(page.locator('.multiselect-dropdown__item--selected')).toHaveCount(0);
    await expect(page.locator('.multiselect-dropdown__menu')).toBeVisible();
  });

  test('reopening shows the previously committed selection checked', async ({ page }) => {
    await gotoCompare(page);

    await openDropdown(page, PATH_DROPDOWN);
    const items = page.locator('.multiselect-dropdown__item');
    const firstLabel = (await items.nth(0).textContent())?.trim();
    await items.nth(0).click();
    await closeDropdown(page, PATH_DROPDOWN);

    await openDropdown(page, PATH_DROPDOWN);
    const selected = page.locator('.multiselect-dropdown__item--selected');
    await expect(selected).toHaveCount(1);
    await expect(selected.first()).toContainText(firstLabel ?? '');
  });

  test('clicking outside closes the menu without changing the selection', async ({ page }) => {
    await gotoCompare(page);

    await openDropdown(page, PATH_DROPDOWN);
    await page.locator('.multiselect-dropdown__item').nth(0).click();
    await page.locator('.compare__title').click();

    await expect(page.locator('.multiselect-dropdown__menu')).toBeHidden();
    await expect(dropdownChips(page, PATH_DROPDOWN)).toHaveCount(1);
  });

  test('many selections collapse into a trailing "+N" chip that matches the others visually', async ({ page }) => {
    await gotoCompare(page);

    await openDropdown(page, PATH_DROPDOWN);
    const items = page.locator('.multiselect-dropdown__item');
    const total = await items.count();
    test.skip(total < 6, 'not enough options on this data set to force chip overflow');

    for (let i = 0; i < total; i++) {
      await items.nth(i).click();
    }
    await closeDropdown(page, PATH_DROPDOWN);

    const moreChip = dropdownTrigger(page, PATH_DROPDOWN).locator('.multiselect-dropdown__chip', { hasText: '+' });
    await expect(moreChip).toBeVisible();

    const regularChip = dropdownTrigger(page, PATH_DROPDOWN).locator('.multiselect-dropdown__chip').first();
    const [moreBg, regularBg] = await Promise.all([
      moreChip.evaluate((el) => getComputedStyle(el).backgroundColor),
      regularChip.evaluate((el) => getComputedStyle(el).backgroundColor),
    ]);
    expect(moreBg).toBe(regularBg);
  });
});
