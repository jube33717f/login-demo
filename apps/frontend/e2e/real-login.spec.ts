import { expect, type Locator, type Page, test } from '@playwright/test';

const username = process.env.E2E_LOGIN_USERNAME;
const password = process.env.E2E_LOGIN_PASSWORD;

test.describe('real IdP login', () => {
  test.skip(
    !username || !password,
    'Set E2E_LOGIN_USERNAME and E2E_LOGIN_PASSWORD in apps/frontend/.env.local to run the real IdP login test.',
  );

  test('signs in through the IdP and loads protected data', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Login' }).click();

    await expect(page).not.toHaveURL(/localhost:4200\/$/, { timeout: 30_000 });

    await fillFirstVisible(
      page,
      [
        page.getByLabel(/email|username/i),
        page.getByPlaceholder(/email|username/i),
        page.locator('input[type="email"]'),
        page.locator('input[name*="email" i]'),
        page.locator('input[name*="user" i]'),
        page.locator('input[id*="email" i]'),
        page.locator('input[id*="user" i]'),
      ],
      username!,
      'username',
    );

    if (!(await hasVisible(page.locator('input[type="password"]')))) {
      await clickFirstVisible(page, [
        page.getByRole('button', { name: /continue|next/i }),
        page.locator('button[type="submit"]'),
        page.locator('input[type="submit"]'),
      ]);
    }

    await fillFirstVisible(
      page,
      [
        page.getByLabel(/password/i),
        page.getByPlaceholder(/password/i),
        page.locator('input[type="password"]'),
        page.locator('input[name*="password" i]'),
        page.locator('input[id*="password" i]'),
      ],
      password!,
      'password',
    );

    await clickFirstVisible(page, [
      page.getByRole('button', { name: /log in|login|sign in|continue|submit/i }),
      page.locator('button[type="submit"]'),
      page.locator('input[type="submit"]'),
    ]);

    await expect(page.getByText('Signed in')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();

    await page.getByRole('button', { name: 'Load data' }).click();
    await expect(page.getByText('Review OAuth login flow')).toBeVisible();
    await expect(page.getByText('Validate protected API access')).toBeVisible();
  });
});

async function fillFirstVisible(
  page: Page,
  locators: Locator[],
  value: string,
  fieldName: string,
) {
  const locator = await firstVisible(locators);
  if (!locator) {
    throw new Error(`Could not find a visible ${fieldName} field on ${page.url()}`);
  }

  await locator.fill(value);
}

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
