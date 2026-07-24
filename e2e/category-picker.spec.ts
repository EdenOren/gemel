import { expect, test } from '@playwright/test';
import { PATH_DROPDOWN, closeDropdown, dropdownChips, gotoCompare, openDropdown } from './helpers';

test.describe('category picker', () => {
  test('switching category clears the path selection', async ({ page }) => {
    await gotoCompare(page);

    await openDropdown(page, PATH_DROPDOWN);
    await page.locator('.multiselect-dropdown__item').first().click();
    await closeDropdown(page, PATH_DROPDOWN);
    await expect(dropdownChips(page, PATH_DROPDOWN)).toHaveCount(1);

    const pots = page.locator('.category-picker__pot:not(.category-picker__pot--more)');
    const potCount = await pots.count();
    test.skip(potCount < 2, 'not enough visible categories to switch between on this data set');

    const activePotLabelBefore = await page.locator('.category-picker__pot--active .category-picker__pot-label').textContent();
    let clickedLabel: string | null = null;
    for (let i = 0; i < potCount; i++) {
      const pot = pots.nth(i);
      const isActive = (await pot.getAttribute('class'))?.includes('--active');
      if (!isActive) {
        clickedLabel = await pot.locator('.category-picker__pot-label').textContent();
        await pot.click();
        break;
      }
    }
    await expect(page.locator('.category-picker__pot--active .category-picker__pot-label')).toHaveText(
      clickedLabel ?? '',
    );
    expect(clickedLabel).not.toBe(activePotLabelBefore);

    await expect(dropdownChips(page, PATH_DROPDOWN)).toHaveCount(0);
  });

  test('"עוד" overflow menu opens, lists the remaining categories, and selecting one activates it', async ({
    page,
  }) => {
    await gotoCompare(page);

    const moreButton = page.locator('.category-picker__pot--more');
    test.skip((await moreButton.count()) === 0, 'no overflow categories on this data set');

    await moreButton.click();
    const menu = page.locator('.category-picker__menu');
    await expect(menu).toBeVisible();

    const menuItems = menu.locator('.category-picker__menu-item');
    const firstOverflowLabel = (await menuItems.first().textContent())?.trim();
    await menuItems.first().click();

    await expect(menu).toBeHidden();
    await expect(moreButton).toHaveClass(/--active/);
    await expect(moreButton.locator('.category-picker__pot-label')).toHaveText(firstOverflowLabel ?? '');
  });

  test('clicking outside closes the overflow menu', async ({ page }) => {
    await gotoCompare(page);

    const moreButton = page.locator('.category-picker__pot--more');
    test.skip((await moreButton.count()) === 0, 'no overflow categories on this data set');

    await moreButton.click();
    await expect(page.locator('.category-picker__menu')).toBeVisible();

    await page.locator('.compare__title').click();
    await expect(page.locator('.category-picker__menu')).toBeHidden();
  });
});
