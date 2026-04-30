# Implementation Plan: Stellar Freelance Platform

## Overview

Incremental implementation of the Stellar-based freelance payment platform: Soroban smart contracts first, then frontend lib/hooks, then UI components, then pages, then tests and CI/CD.

## Tasks

- [x] 1. Set up project structure and shared contract types
  - Create `contracts/payment/Cargo.toml` and `contracts/escrow/Cargo.toml` with soroban-sdk dependency
  - Define shared `ContractError` enum (`InsufficientFunds=1, UnauthorizedCaller=2, EscrowAlreadyReleased=3, InvalidMilestone=4, ContractPaused=5`) in each contract crate
  - Define `Milestone` struct (`id: u32, amount: i128, description: String, released: bool`) in the escrow crate
  - Create `frontend/` Next.js project scaffold with `tsconfig.json`, `tailwind.config.ts`, and `.env.local.example` containing `NEXT_PUBLIC_HORIZON_URL`, `NEXT_PUBLIC_NETWORK_PASSPHRASE`, `NEXT_PUBLIC_PAYMENT_CONTRACT_ID`, `NEXT_PUBLIC_ESCROW_CONTRACT_ID`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 17.4, 17.5, 17.6_

- [x] 2. Implement PaymentContract
  - [x] 2.1 Implement `contracts/payment/src/lib.rs`
    - Implement `initialize(env, admin, token)` storing admin and token in contract storage
    - Implement `send_payment(env, from, to, amount: i128, token)` with `from.require_auth()`, pause guard, SAC token client transfer, `payment_sent` and `payment_confirmed` events
    - Implement `get_payment_status(env, payment_id)` reading from storage
    - Implement `pause(env, caller)` and `unpause(env, caller)` with admin check, setting paused flag, returning `UnauthorizedCaller` for non-admin
    - Return `InsufficientFunds` on transfer failure, `ContractPaused` when paused
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.1, 5.5, 6.1, 6.3, 6.5, 17.2, 17.6_

  - [x] 2.2 Write property test for PaymentContract pause guard (P5)
    - **Property 5: Pause Guard** — any state-changing call on a paused contract returns `ContractPaused`
    - **Validates: Requirements 5.5, 6.1**

  - [x] 2.3 Write Rust unit tests for PaymentContract
    - `test_send_payment_success`: verify correct amount transferred to recipient
    - `test_insufficient_funds_error`: verify `InsufficientFunds` returned on low balance
    - _Requirements: 14.1, 14.4_

- [x] 3. Implement EscrowContract
  - [x] 3.1 Implement `contracts/escrow/src/lib.rs`
    - Implement `initialize(env, admin, payment_contract)` storing admin and payment contract address
    - Implement `create_escrow(env, client, freelancer, total: i128, milestones: Vec<Milestone>)` with `client.require_auth()`, milestone sum validation, token transfer to escrow, `escrow_created` event
    - Implement `release_milestone(env, client, milestone_id: u32)` with `client.require_auth()`, `EscrowAlreadyReleased` guard, `InvalidMilestone` guard, inter-contract call to PaymentContract, `milestone_released` event, set `released = true`
    - Implement `dispute_escrow(env, caller, escrow_id)` checking caller is client or freelancer, returning `UnauthorizedCaller` otherwise, emitting `dispute_raised` event
    - Implement `cancel_escrow(env, client, escrow_id)` refunding all unreleased milestone amounts to client, emitting `escrow_cancelled` event
    - Implement `pause(env, caller)` and `unpause(env, caller)` with admin check
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 4.1, 4.2, 4.3, 5.2, 5.3, 5.4, 5.5, 6.2, 6.4, 6.6, 17.3, 17.6_

  - [x] 3.2 Write property test for EscrowContract milestone monotonicity (P2)
    - **Property 2: Escrow Milestone Monotonicity** — once `released` is set to `true` it can never revert to `false`
    - **Validates: Requirements 3.6, 3.7**

  - [x] 3.3 Write property test for EscrowContract total integrity (P3)
    - **Property 3: Escrow Total Integrity** — sum of all milestone amounts always equals the stored total
    - **Validates: Requirements 3.1**

  - [x] 3.4 Write property test for authorization exclusivity (P4)
    - **Property 4: Authorization Exclusivity** — only the client can release/cancel; only client or freelancer can dispute
    - **Validates: Requirements 3.5, 4.2, 6.6, 17.3**

  - [x] 3.5 Write property test for cancel refund completeness (P6)
    - **Property 6: Cancel Refund Completeness** — sum of refunded amounts equals sum of all unreleased milestone amounts
    - **Validates: Requirements 3.9**

  - [x] 3.6 Write Rust unit tests for EscrowContract
    - `test_escrow_milestone_release`: verify milestone release transfers correct amount via PaymentContract
    - `test_unauthorized_dispute`: verify non-party caller receives `UnauthorizedCaller`
    - `test_cancel_escrow_refunds_client`: verify all unreleased funds returned to client
    - _Requirements: 14.2, 14.3, 14.5_

- [x] 4. Checkpoint — Ensure all Rust contract tests pass
  - Run `cargo test` in `contracts/payment` and `contracts/escrow`; ask the user if questions arise.

- [x] 5. Implement frontend wallet and Stellar utilities
  - [x] 5.1 Implement `frontend/lib/wallets/freighter.ts`
    - Export `isFreighterInstalled(): boolean`
    - Export `getFreighterPublicKey(): Promise<string>`
    - Export `signTransactionFreighter(xdr: string, network: string): Promise<string>`
    - _Requirements: 1.1, 1.2, 17.1_

  - [x] 5.2 Implement `frontend/lib/wallets/albedo.ts`
    - Export `getAlbedoPublicKey(): Promise<string>`
    - Export `signTransactionAlbedo(xdr: string, network: string): Promise<string>`
    - _Requirements: 1.1, 1.2, 17.1_

  - [x] 5.3 Implement `frontend/lib/stellar.ts`
    - Export `getServer()` returning SorobanRpc.Server from env var
    - Export `getHorizonServer()` returning Horizon.Server from env var
    - Export `fetchAccountBalances(publicKey: string)` returning XLM + SAC token balances
    - Export `fetchTransactionHistory(publicKey: string, cursor?: string)` returning paginated records
    - Export `truncateAddress`, `stroopsToXlm`, `xlmToStroops` utilities
    - _Requirements: 1.3, 7.1, 17.4, 17.5_

- [x] 6. Implement frontend contract client and audit log
  - [x] 6.1 Implement `frontend/lib/contracts.ts`
    - Export `sendPayment(from, to, amount, token, signFn)` building and submitting a PaymentContract `send_payment` invocation
    - Export `getPaymentStatus(paymentId)`
    - Export `createEscrow(client, freelancer, total, milestones, signFn)`
    - Export `releaseMilestone(client, milestoneId, signFn)`
    - Export `disputeEscrow(caller, escrowId, signFn)`
    - Export `cancelEscrow(client, escrowId, signFn)`
    - Export `pauseContract(admin, contract, signFn)` and `unpauseContract(admin, contract, signFn)`
    - Export `batchPayment(from, recipients: {to, amount, token}[], signFn)` executing independent per-recipient payments
    - _Requirements: 2.1, 2.6, 3.4, 3.9, 4.1, 6.1, 6.2, 17.4_

  - [x] 6.2 Implement `frontend/lib/auditLog.ts`
    - Open IndexedDB `audit-log` store on module init
    - Export `logAction(action, contractAddress, params, result)` writing a timestamped entry
    - Export `getAuditLog()` returning all entries
    - Export `clearAuditLog()` deleting all entries
    - _Requirements: 12.1, 12.2_

- [x] 7. Implement frontend hooks
  - [x] 7.1 Implement `frontend/hooks/useWallet.ts`
    - Manage `publicKey`, `walletType`, `balances`, `xlmUsdRate` state
    - `connect(walletType)` calls freighter or albedo adapter, persists `publicKey` and `walletType` to `localStorage`
    - `disconnect()` clears state and localStorage
    - On mount, restore session from localStorage and fetch balances
    - Fetch XLM/USD rate from CoinGecko API; on error set rate to `null`
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 11.1, 11.2, 13.3_

  - [x] 7.2 Implement `frontend/hooks/usePayment.ts`
    - Manage `status`, `error`, `lastParams` state
    - `submit(params)` calls `sendPayment` from contracts.ts, logs to auditLog, sets status
    - `retry()` resubmits `lastParams`
    - _Requirements: 2.7, 12.1_

  - [x] 7.3 Implement `frontend/hooks/useStream.ts`
    - Open `EventSource` to `/api/events`
    - Append incoming events to `events` state array
    - On error, reconnect with exponential backoff; expose `connectionStatus`
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 8. Implement SSE API route and core UI components
  - [x] 8.1 Implement `frontend/app/api/events/route.ts`
    - Stream Horizon SSE (`/accounts/{address}/transactions?cursor=now`) to the client as `text/event-stream`
    - _Requirements: 8.1, 8.2_

  - [x] 8.2 Implement `frontend/components/NavBar.tsx`
    - Display wallet address (truncated), XLM balance, SAC token balances, XLM/USD rate
    - Dark mode toggle using `next-themes` `useTheme`
    - _Requirements: 1.3, 11.1, 13.1, 13.2_

  - [x] 8.3 Implement `frontend/components/WalletConnect.tsx`
    - Render Freighter and Albedo connect buttons
    - On missing extension show descriptive error per wallet
    - On connect call `useWallet.connect(walletType)`
    - _Requirements: 1.1, 1.4_

  - [x] 8.4 Implement `frontend/components/Toast.tsx`
    - Lightweight toast notification component for success/error feedback
    - _Requirements: 2.5, 5.1_

- [x] 9. Implement payment and escrow UI components
  - [x] 9.1 Implement `frontend/components/PaymentForm.tsx`
    - Fields: `to` (Stellar address), `amount` (i128-safe), `asset` (XLM or SAC token)
    - Validate required fields and Stellar address format; display inline errors
    - On submit call `usePayment.submit`; show retry button on failure
    - _Requirements: 2.1, 2.7, 9.2, 9.3_

  - [x] 9.2 Implement `frontend/components/EscrowForm.tsx`
    - Fields: freelancer address, total amount, milestone list (description + amount each)
    - On submit call `createEscrow` from contracts.ts, log to auditLog
    - _Requirements: 3.1, 3.2_

  - [x] 9.3 Implement `frontend/components/MilestoneCard.tsx`
    - Display milestone id, description, amount, released status
    - "Release" button calls `releaseMilestone`; "Dispute" button calls `disputeEscrow`
    - Disable "Release" if already released
    - _Requirements: 3.4, 3.6, 3.7, 4.1_

  - [x] 9.4 Implement `frontend/components/BatchPayment.tsx`
    - Allow adding multiple recipients; call `batchPayment` from contracts.ts
    - _Requirements: 2.6_

  - [x] 9.5 Implement `frontend/components/InvoiceGenerator.tsx`
    - Accept transaction data props; use jsPDF to generate PDF with tx ID, sender, recipient, amount, asset, timestamp, network
    - Trigger browser download on button click
    - _Requirements: 10.1, 10.2_

- [x] 10. Implement transaction history component and TxHistory page
  - [x] 10.1 Implement `frontend/components/TxHistory.tsx`
    - Paginated table columns: payment ID, sender, recipient, amount, asset, status
    - Filter controls updating display within 500ms
    - CSV export button serializing current filtered rows
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 10.2 Write property test for batch payment atomicity (P7)
    - **Property 7: Batch Payment Atomicity per Operation** — each recipient's outcome is independent; one failure does not affect others
    - **Validates: Requirements 2.6**

- [x] 11. Implement application pages
  - [x] 11.1 Implement `frontend/app/page.tsx` (landing/home)
    - Render `WalletConnect` when no wallet connected; redirect to `/dashboard` when connected
    - _Requirements: 1.1, 1.5_

  - [x] 11.2 Implement `frontend/app/dashboard/page.tsx`
    - Render `PaymentForm`, `EscrowForm`, `BatchPayment`, and `InvoiceGenerator`
    - _Requirements: 2.1, 3.1, 10.1_

  - [x] 11.3 Implement `frontend/app/client/page.tsx`
    - List active escrows for connected client with `MilestoneCard` per milestone
    - _Requirements: 3.4, 3.9, 4.1_

  - [x] 11.4 Implement `frontend/app/history/page.tsx`
    - Render `TxHistory` component with data from `fetchTransactionHistory`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 11.5 Implement `frontend/app/activity/page.tsx`
    - Render `ActivityFeed` component using `useStream` hook; show connection status indicator
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 11.6 Implement `frontend/app/pay/page.tsx`
    - Read `to`, `amount`, `asset` from URL search params
    - Validate Stellar address; show error and block submit on invalid address
    - Pre-populate `PaymentForm` with parsed values
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 11.7 Implement `frontend/components/ActivityFeed.tsx`
    - Render live event list from `useStream`; show reconnecting indicator when disconnected
    - _Requirements: 8.2, 8.3_

- [x] 12. Implement dark mode and theme persistence
  - Wrap app in `ThemeProvider` from `next-themes` in `frontend/app/layout.tsx`
  - Ensure all components use Tailwind `dark:` classes
  - Theme preference persisted automatically by `next-themes` localStorage strategy
  - _Requirements: 13.1, 13.2, 13.3_

- [x] 13. Checkpoint — Ensure frontend builds without errors
  - Run `next build`; ask the user if questions arise.

- [x] 14. Write Jest unit tests
  - [x] 14.1 Write `frontend/__tests__/WalletConnect.test.tsx`
    - Verify component renders Freighter and Albedo buttons
    - Verify correct wallet connection handler is called on button click
    - _Requirements: 15.1_

  - [x] 14.2 Write `frontend/__tests__/PaymentForm.test.tsx`
    - Verify required field validation errors are displayed
    - Verify invalid Stellar address shows validation error
    - _Requirements: 15.2_

  - [x] 14.3 Write `frontend/__tests__/TxHistory.test.tsx`
    - Verify table renders correct rows from mock transaction data
    - _Requirements: 15.3_

- [x] 15. Write Playwright end-to-end tests
  - [x] 15.1 Write `frontend/__tests__/e2e/wallet.spec.ts`
    - Test wallet connect flow end-to-end
    - _Requirements: 15.4_

  - [x] 15.2 Write `frontend/__tests__/e2e/escrow.spec.ts`
    - Test escrow create and milestone release flow end-to-end
    - _Requirements: 15.5_

  - [x] 15.3 Write `frontend/__tests__/e2e/history.spec.ts`
    - Test history filtering and CSV export flow end-to-end
    - _Requirements: 15.6_

- [x] 16. Set up CI/CD pipeline and deployment script
  - [x] 16.1 Create `.github/workflows/ci.yml`
    - `contract-tests` job: checkout, install Rust + soroban-cli, run `cargo test` in both contract crates
    - `frontend-tests` job: checkout, `npm ci`, run Jest tests
    - `e2e` job: checkout, `npm ci`, install Playwright browsers, run Playwright tests
    - All jobs trigger on `push` and `pull_request`; PR merge blocked on failure
    - _Requirements: 16.1, 16.2_

  - [x] 16.2 Create `scripts/deploy.sh`
    - Build both contracts with `soroban contract build`
    - Deploy to Stellar Testnet using `soroban contract deploy` with env-var network passphrase and Horizon URL
    - _Requirements: 17.4, 17.5_

- [x] 17. Final checkpoint — Ensure all tests pass
  - Run `cargo test` for contracts and `jest --run` + `playwright test` for frontend; ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All monetary values use `i128`; no floating-point in contract code
- Contract addresses, Horizon URL, and network passphrase come exclusively from environment variables
- Property tests (P1–P7) validate universal correctness properties from the design document
