import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests: Wallet connect flow.
 * Requirements: 15.4, 1.1, 1.4, 1.5
 */

/** Inject a mock Freighter extension into the page context. */
async function mockFreighter(page: Page, publicKey: string) {
  await page.addInitScript((pk) => {
    (window as any).freighterApi = {
      isConnected: () => Promise.resolve(true),
      getPublicKey: () => Promise.resolve(pk),
      signTransaction: (_xdr: string, _opts: any) => Promise.resolve('signed-xdr'),
    };
    // Prevent balance/rate fetches from causing re-renders
    (window as any).__mocks__ = {
      fetchAccountBalances: () => Promise.resolve([]),
      xlmUsdRate: null,
    };
  }, publicKey);
}

/** Inject a mock Albedo extension into the page context. */
async function mockAlbedo(page: Page, publicKey: string) {
  await page.addInitScript((pk) => {
    (window as any).albedo = {
      publicKey: (_opts: any) => Promise.resolve({ pubkey: pk }),
      tx: (_opts: any) => Promise.resolve({ signed_envelope_xdr: 'signed-xdr' }),
    };
    // Prevent balance/rate fetches from causing re-renders
    (window as any).__mocks__ = {
      fetchAccountBalances: () => Promise.resolve([]),
      xlmUsdRate: null,
    };
  }, publicKey);
}

const MOCK_PUBLIC_KEY = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';

test.describe('Wallet connect flow', () => {
  test('home page renders Freighter and Albedo connect buttons', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Connect Freighter')).toBeVisible();
    await expect(page.getByText('Connect Albedo')).toBeVisible();
  });

  test('shows descriptive error when Freighter extension is not installed', async ({ page }) => {
    // No freighterApi injected — extension absent
    await page.goto('/');

    await page.getByText('Connect Freighter').click();

    // Req 1.4: descriptive error per wallet
    await expect(page.getByRole('alert').first()).toContainText(/freighter/i);
  });

  test('shows descriptive error when Albedo extension is not installed', async ({ page }) => {
    // No albedo injected — extension absent
    await page.goto('/');

    await page.getByText('Connect Albedo').click();

    await expect(page.getByRole('alert').first()).toContainText(/albedo/i);
  });

  test('connects via Freighter and redirects to /dashboard', async ({ page }) => {
    await mockFreighter(page, MOCK_PUBLIC_KEY);
    await page.goto('/');

    await page.getByText('Connect Freighter').click();

    // Req 1.5: after connect, user lands on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('connects via Albedo and redirects to /dashboard', async ({ page }) => {
    await mockAlbedo(page, MOCK_PUBLIC_KEY);
    await page.goto('/');

    await page.getByText('Connect Albedo').click();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('displays truncated wallet address in nav after connecting', async ({ page }) => {
    await mockFreighter(page, MOCK_PUBLIC_KEY);
    await page.goto('/');
    await page.getByText('Connect Freighter').click();
    await page.waitForURL(/\/dashboard/);
    await page.waitForLoadState('networkidle');

    // NavBar shows truncated address (first 4 + last 4 chars)
    const nav = page.getByRole('navigation');
    await expect(nav).toContainText('GAAZ');
    await expect(nav).toContainText('CCWN');
  });

  test('disconnect clears session and returns to home', async ({ page }) => {
    await mockFreighter(page, MOCK_PUBLIC_KEY);
    await page.goto('/');
    await page.getByText('Connect Freighter').click();
    await page.waitForURL(/\/dashboard/);
    await page.waitForLoadState('networkidle');

    // Req 1.5: disconnect returns to unauthenticated view
    await page.getByRole('button', { name: /disconnect/i }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByText('Connect Freighter')).toBeVisible();
  });

  test('session is restored from localStorage on page reload', async ({ page }) => {
    await mockFreighter(page, MOCK_PUBLIC_KEY);
    await page.goto('/');
    await page.getByText('Connect Freighter').click();
    await page.waitForURL(/\/dashboard/);
    await page.waitForLoadState('networkidle');

    // Reload — session should be restored from localStorage
    await page.reload();

    await expect(page).toHaveURL(/\/dashboard/);
  });
});
