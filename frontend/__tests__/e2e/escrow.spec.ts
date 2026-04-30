import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests: Escrow create and milestone release flow.
 * Requirements: 15.5, 3.1, 3.2, 3.4, 3.6, 3.7, 4.1
 */

const CLIENT_KEY = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
const FREELANCER_KEY = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

/** Inject mock wallet + contract stubs so no real blockchain calls are made. */
async function setupMocks(page: Page) {
  await page.addInitScript(
    ({ clientKey, freelancerKey }) => {
      // Mock Freighter
      (window as any).freighterApi = {
        isConnected: () => Promise.resolve(true),
        getPublicKey: () => Promise.resolve(clientKey),
        signTransaction: () => Promise.resolve('signed-xdr'),
      };

      // Mock contract functions via module-level override at runtime.
      // The app reads these from window.__mocks__ which lib/contracts.ts checks
      // when NEXT_PUBLIC_E2E_MOCK=true (set in .env.test).
      (window as any).__mocks__ = {
        fetchAccountBalances: () => Promise.resolve([]),
        xlmUsdRate: null,
        createEscrow: (_client: string, _freelancer: string, _total: bigint, _token: string, _milestones: any[], _signFn: any) =>
          Promise.resolve(BigInt(42)),
        releaseMilestone: () => Promise.resolve(undefined),
        disputeEscrow: () => Promise.resolve(undefined),
        cancelEscrow: () => Promise.resolve(undefined),
      };
    },
    { clientKey: CLIENT_KEY, freelancerKey: FREELANCER_KEY }
  );
}

/** Navigate to dashboard as a connected client. */
async function goToDashboard(page: Page) {
  await setupMocks(page);
  await page.goto('/');
  await page.getByText('Connect Freighter').click();
  await page.waitForURL(/\/dashboard/);
  // Wait for the EscrowForm to be fully rendered and stable
  await page.waitForSelector('#ef-freelancer', { state: 'visible' });
  // Give React time to finish all state updates and settle
  await page.waitForFunction(() => {
    const el = document.getElementById('ef-freelancer');
    return el !== null && el.isConnected;
  });
}

test.describe('Escrow create flow', () => {
  test('EscrowForm is visible on the dashboard', async ({ page }) => {
    await goToDashboard(page);

    await expect(page.getByRole('heading', { name: 'Create Escrow' })).toBeVisible();
    await expect(page.getByLabel('Freelancer address')).toBeVisible();
  });

  test('shows validation error when freelancer address is empty', async ({ page }) => {
    await goToDashboard(page);

    await page.getByRole('button', { name: 'Create Escrow' }).click();

    await expect(page.getByText('Freelancer address is required.')).toBeVisible();
  });

  test('shows validation error for invalid freelancer address', async ({ page }) => {
    await goToDashboard(page);

    await page.getByLabel('Freelancer address').fill('not-a-valid-address');
    // Fill milestone fields to avoid other errors
    await page.getByPlaceholder('Describe the deliverable').first().fill('Design work');
    await page.getByPlaceholder('0.00').first().fill('10');

    await page.getByRole('button', { name: 'Create Escrow' }).click();

    await expect(page.getByText('Invalid Stellar address format.')).toBeVisible();
  });

  test('shows validation error when milestone description is empty', async ({ page }) => {
    await goToDashboard(page);

    await page.getByLabel('Freelancer address').fill(FREELANCER_KEY);
    await page.getByPlaceholder('0.00').first().fill('10');

    await page.getByRole('button', { name: 'Create Escrow' }).click();

    await expect(page.getByText('Description is required.')).toBeVisible();
  });

  test('shows validation error when milestone amount is missing', async ({ page }) => {
    await goToDashboard(page);

    await page.getByLabel('Freelancer address').fill(FREELANCER_KEY);
    await page.getByPlaceholder('Describe the deliverable').first().fill('Design work');

    await page.getByRole('button', { name: 'Create Escrow' }).click();

    await expect(page.getByText('Amount is required.')).toBeVisible();
  });

  test('can add a second milestone', async ({ page }) => {
    await goToDashboard(page);

    await page.getByText('+ Add milestone').click();

    // Two milestone blocks should now be visible
    const descInputs = page.getByPlaceholder('Describe the deliverable');
    await expect(descInputs).toHaveCount(2);
  });

  test('total updates as milestone amounts are entered', async ({ page }) => {
    await goToDashboard(page);

    await page.getByPlaceholder('0.00').first().fill('25');

    await expect(page.getByText(/Total:/)).toContainText('25');
  });

  test('successful escrow creation shows confirmation message', async ({ page }) => {
    await goToDashboard(page);

    await page.getByLabel('Freelancer address').fill(FREELANCER_KEY);
    await page.getByPlaceholder('Describe the deliverable').first().fill('Design work');
    await page.getByPlaceholder('0.00').first().fill('10');

    await page.getByRole('button', { name: 'Create Escrow' }).click();

    // Req 3.1: success feedback with escrow ID
    await expect(page.getByRole('status')).toContainText(/Escrow created/i);
  });
});

test.describe('Milestone release flow', () => {
  /** Seed localStorage with a mock escrow so the /client page has data. */
  async function seedEscrow(page: Page) {
    await page.evaluate(({ clientKey, freelancerKey }) => {
      const escrow = {
        id: '42n',
        freelancer: freelancerKey,
        total: '100000000n',
        milestones: [
          { id: 0, amount: '50000000n', description: 'Design', released: false },
          { id: 1, amount: '50000000n', description: 'Development', released: false },
        ],
      };
      localStorage.setItem('escrows', JSON.stringify([escrow]));
    }, { clientKey: CLIENT_KEY, freelancerKey: FREELANCER_KEY });
  }

  test('client page shows active escrow with milestone cards', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');
    await page.getByText('Connect Freighter').click();
    await page.waitForURL(/\/dashboard/);

    await seedEscrow(page);
    await page.goto('/client');

    await expect(page.getByText('Active Escrows')).toBeVisible();
    await expect(page.getByText('Design')).toBeVisible();
    await expect(page.getByText('Development')).toBeVisible();
  });

  test('Release button is visible for unreleased milestones', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');
    await page.getByText('Connect Freighter').click();
    await page.waitForURL(/\/dashboard/);
    await seedEscrow(page);
    await page.goto('/client');

    // Req 3.4: client can release milestones
    const releaseButtons = page.getByRole('button', { name: 'Release' });
    await expect(releaseButtons.first()).toBeVisible();
  });

  test('clicking Release marks milestone as Released', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');
    await page.getByText('Connect Freighter').click();
    await page.waitForURL(/\/dashboard/);
    await seedEscrow(page);
    await page.goto('/client');

    await page.getByRole('button', { name: 'Release' }).first().click();

    // Req 3.6: milestone released badge appears
    await expect(page.getByText('Released').first()).toBeVisible();
  });

  test('Dispute button is visible and triggers dispute', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');
    await page.getByText('Connect Freighter').click();
    await page.waitForURL(/\/dashboard/);
    await seedEscrow(page);
    await page.goto('/client');

    // Req 4.1: dispute button present
    await page.getByRole('button', { name: 'Dispute' }).first().click();

    await expect(page.getByRole('status')).toContainText(/Dispute raised/i);
  });

  test('Cancel Escrow button removes escrow from list', async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');
    await page.getByText('Connect Freighter').click();
    await page.waitForURL(/\/dashboard/);
    await seedEscrow(page);
    await page.goto('/client');

    // Req 3.9: cancel refunds client
    await page.getByRole('button', { name: 'Cancel Escrow' }).click();

    await expect(page.getByText('No active escrows found')).toBeVisible();
  });
});
