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
