import { test, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * E2E tests: Transaction history filtering and CSV export.
 * Requirements: 15.6, 7.1, 7.2, 7.3
 */

const CLIENT_KEY = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';

const MOCK_RECORDS = [
  {
    paymentId: 'tx-001',
    sender: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    recipient: 'GBVZZ3XZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZX',
    amount: '100',
    asset: 'XLM',
    status: 'confirmed',
  },
  {
    paymentId: 'tx-002',
    sender: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    recipient: 'GCAAA1BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    amount: '50',
    asset: 'USDC',
    status: 'failed',
  },
  {
    paymentId: 'tx-003',
    sender: 'GBVZZ3XZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZXZX',
    recipient: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    amount: '200',
    asset: 'XLM',
    status: 'confirmed',
  },
];

/** Inject Freighter mock and stub fetchTransactionHistory via window.__mocks__. */
async function setupMocks(page: Page) {
  await page.addInitScript((records) => {
    (window as any).freighterApi = {
      isConnected: () => Promise.resolve(true),
      getPublicKey: () =>
        Promise.resolve('GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'),
      signTransaction: () => Promise.resolve('signed-xdr'),
    };

    (window as any).__mocks__ = {
      fetchAccountBalances: () => Promise.resolve([]),
      xlmUsdRate: null,
      fetchTransactionHistory: () =>
        Promise.resolve({ records, nextCursor: null }),
    };
  }, MOCK_RECORDS);
}

async function goToHistory(page: Page) {
  await setupMocks(page);
  await page.goto('/');
  await page.getByText('Connect Freighter').click();
  await page.waitForURL(/\/dashboard/);
  await page.goto('/history');
  // Wait for the table to render
  await expect(page.getByRole('table')).toBeVisible();
}

test.describe('Transaction history page', () => {
  test('renders the history table with correct columns', async ({ page }) => {
    await goToHistory(page);

    // Req 7.1: table columns
    await expect(page.getByRole('columnheader', { name: /payment id/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /sender/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /recipient/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /amount/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /asset/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
  });

  test('renders rows from transaction data', async ({ page }) => {
    await goToHistory(page);

    await expect(page.getByText('tx-001')).toBeVisible();
    await expect(page.getByText('tx-002')).toBeVisible();
    await expect(page.getByText('tx-003')).toBeVisible();
  });

  test('filter by payment ID narrows results', async ({ page }) => {
    await goToHistory(page);

    await page.getByLabel('Filter transactions').fill('tx-001');

    // Req 7.2: filter updates within 500ms (synchronous state update)
    await expect(page.getByText('tx-001')).toBeVisible();
    await expect(page.getByText('tx-002')).not.toBeVisible();
    await expect(page.getByText('tx-003')).not.toBeVisible();
  });

  test('filter by asset narrows results', async ({ page }) => {
    await goToHistory(page);

    await page.getByLabel('Filter transactions').fill('USDC');

    await expect(page.getByText('tx-002')).toBeVisible();
    await expect(page.getByText('tx-001')).not.toBeVisible();
  });

  test('filter by status narrows results', async ({ page }) => {
    await goToHistory(page);

    await page.getByLabel('Filter transactions').fill('failed');

    await expect(page.getByText('tx-002')).toBeVisible();
    await expect(page.getByText('tx-001')).not.toBeVisible();
    await expect(page.getByText('tx-003')).not.toBeVisible();
  });

  test('clearing filter restores all rows', async ({ page }) => {
    await goToHistory(page);

    await page.getByLabel('Filter transactions').fill('tx-001');
    await expect(page.getByText('tx-002')).not.toBeVisible();

    await page.getByLabel('Filter transactions').fill('');

    await expect(page.getByText('tx-001')).toBeVisible();
    await expect(page.getByText('tx-002')).toBeVisible();
    await expect(page.getByText('tx-003')).toBeVisible();
  });

  test('shows "No transactions found" when filter matches nothing', async ({ page }) => {
    await goToHistory(page);

    await page.getByLabel('Filter transactions').fill('zzz-no-match');

    await expect(page.getByText('No transactions found.')).toBeVisible();
  });

  test('CSV export triggers a file download', async ({ page }) => {
    await goToHistory(page);

    // Req 7.3: CSV export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export CSV' }).click(),
    ]);

    expect(download.suggestedFilename()).toBe('transactions.csv');
  });

  test('CSV export contains only filtered rows when a filter is active', async ({ page }) => {
    await goToHistory(page);

    await page.getByLabel('Filter transactions').fill('tx-001');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export CSV' }).click(),
    ]);

    const filePath = await download.path();
    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath!, 'utf-8');

    expect(content).toContain('tx-001');
    expect(content).not.toContain('tx-002');
    expect(content).not.toContain('tx-003');
  });
});
