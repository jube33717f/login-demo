import { expect, test } from '@playwright/test';

test('shows the anonymous login state', async ({ page }) => {
  await page.route('**/me', async (route) => {
    await route.fulfill({ status: 401, body: '' });
  });

  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Login' })).toHaveAttribute(
    'href',
    '/login',
  );
  await expect(page.getByText('Protected API')).toBeVisible();
});

test('loads authenticated data and starts logout', async ({ page }) => {
  await page.route('**/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sub: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
      }),
    });
  });
  await page.route('**/api/data', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 'task-1',
            title: 'Review OAuth login flow',
            status: 'completed',
          },
          {
            id: 'task-2',
            title: 'Protected API access available',
            status: 'available',
          },
        ],
      }),
    });
  });
  await page.route('**/logout', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<h1>Signing out</h1>',
    });
  });

  await page.goto('/');

  await expect(page.getByText('Test User')).toBeVisible();
  await page.getByRole('button', { name: 'Load data' }).click();
  await expect(page.getByText('Review OAuth login flow')).toBeVisible();
  await expect(page.getByText('Protected API access available')).toBeVisible();

  await page.getByRole('button', { name: 'Logout' }).click();

  await expect(page).toHaveURL(/\/logout$/);
  await expect(page.getByRole('heading', { name: 'Signing out' })).toBeVisible();
});
