import { expect, type Locator, type Page, test } from '@playwright/test';

const realLoginEnabled = process.env.E2E_REAL_LOGIN === 'true';
const username = process.env.E2E_LOGIN_USERNAME;
const password = process.env.E2E_LOGIN_PASSWORD;

test.describe('real IdP login', () => {
  test.skip(
    !realLoginEnabled || !username || !password,
    'Set E2E_REAL_LOGIN=true plus E2E_LOGIN_USERNAME and E2E_LOGIN_PASSWORD in apps/frontend/.env.local to run the real IdP login test.',
  );

  test('signs in through the IdP and loads protected data', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();

    await expect(page).not.toHaveURL(/localhost:4200\/$/, { timeout: 30_000 });

    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    const loginForm = page.locator('form').first();
    await loginForm.locator('input').nth(0).fill(username!, { force: true });
    await loginForm.locator('input').nth(1).fill(password!, { force: true });

    await clickFirstVisible(page, [
      page.getByRole('button', { name: /log in|login|sign in|continue|submit/i }),
      page.locator('button[type="submit"]'),
      page.locator('input[type="submit"]'),
    ]);

    await expect(page.getByText('Signed in')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

    await page.getByRole('button', { name: 'Load data' }).click();
    await expect(page.getByText('Review OAuth login flow')).toBeVisible();
    await expect(page.getByText('Protected API access available')).toBeVisible();
  });
});

async function clickFirstVisible(page: Page, locators: Locator[]) {
  const locator = await firstVisible(locators);
  if (!locator) {
    throw new Error(`Could not find a visible submit control on ${page.url()}`);
  }

  await locator.click();
}

async function firstVisible(locators: Locator[]) {
  for (const locator of locators) {
    const first = locator.first();
    if (await hasVisible(first)) {
      return first;
    }
  }

  return null;
}

async function hasVisible(locator: Locator) {
  return locator.isVisible({ timeout: 2_000 }).catch(() => false);
}
