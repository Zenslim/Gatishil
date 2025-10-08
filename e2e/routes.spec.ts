import { test, expect } from '@playwright/test';

test.describe('smoke routes', () => {
  test('home page renders movement summary', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Gatishil Nepal/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /faq/i })).toBeVisible();
  });

  test('login page renders form controls', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /member login/i })).toBeVisible();
    await expect(page.getByLabel('Email or Phone')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('dashboard shows loading state for guests', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText(/Loading your dashboard…/i)).toBeVisible();
  });
});
