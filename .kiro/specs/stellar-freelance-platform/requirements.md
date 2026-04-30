# Requirements Document

## Introduction

A decentralized freelance payment platform built on the Stellar blockchain using Soroban smart contracts. The platform enables clients and freelancers to transact directly via XLM or custom SAC tokens, with milestone-based escrow, real-time activity streaming, invoice generation, and multi-wallet support. All contract interactions are signed by the connected wallet — no private keys are ever stored or exposed.

## Glossary

- **Platform**: The full-stack decentralized freelance payment application
- **PaymentContract**: The Soroban smart contract responsible for direct token transfers
- **EscrowContract**: The Soroban smart contract managing milestone-based escrow funds
- **Client**: A user who creates escrow agreements and releases milestone payments
- **Freelancer**: A user who receives milestone payments upon completion
- **Milestone**: A discrete unit of work with an associated payment amount within an escrow
- **SAC_Token**: A Stellar Asset Contract token supported by the Platform
- **Wallet**: A Stellar wallet (Freighter or Albedo) used to sign transactions
- **Horizon**: The Stellar Horizon API used for transaction submission and event streaming
- **Escrow**: A smart contract holding funds until milestone conditions are met
- **Payment_Link**: A shareable URL encoding recipient, amount, and asset for a payment
- **Invoice**: A PDF document summarizing a completed transaction
- **Audit_Log**: A local IndexedDB record of all user-initiated contract interactions
- **Admin**: A privileged account authorized to pause or unpause contracts

---

## Requirements

### Requirement 1: Wallet Connection

**User Story:** As a freelancer or client, I want to connect my Stellar wallet, so that I can sign transactions without exposing my private key.

#### Acceptance Criteria

1. THE Platform SHALL support wallet connection via Freighter and Albedo.
2. WHEN a user initiates wallet connection, THE Platform SHALL request the public key from the connected wallet without accessing or storing the private key.
3. WHEN a wallet is successfully connected, THE Platform SHALL display the user's XLM balance and supported SAC_Token balances in the navigation bar.
4. IF a wallet extension is not installed or not available, THEN THE Platform SHALL display a descriptive error message indicating which wallet is unavailable.
5. WHEN a user disconnects their wallet, THE Platform SHALL clear all session state and return the user to the unauthenticated view.

---

### Requirement 2: Direct Payment

**User Story:** As a client, I want to send a direct payment to a freelancer, so that I can compensate completed work immediately.

#### Acceptance Criteria

1. WHEN a client submits a payment, THE PaymentContract SHALL invoke `send_payment(env, from, to, amount, token)` with the client's address, freelancer's address, amount as i128, and token contract address.
2. THE PaymentContract SHALL require authorization from the `from` address via `address.require_auth()` before executing any fund transfer.
3. WHEN a payment is successfully submitted, THE PaymentContract SHALL emit a `payment_sent` event containing the payment ID, sender, recipient, amount, and token.
4. WHEN a payment is confirmed on-chain, THE PaymentContract SHALL emit a `payment_confirmed` event.
5. IF a payment fails due to insufficient funds, THEN THE PaymentContract SHALL emit a `payment_failed` event and return an `InsufficientFunds` error.
6. THE PaymentContract SHALL support both XLM and SAC_Token transfers using the same `send_payment` interface.
7. WHEN a payment fails, THE Platform SHALL provide a one-click retry action that resubmits the original transaction parameters.

---

### Requirement 3: Milestone-Based Escrow

**User Story:** As a client, I want to create a milestone-based escrow, so that freelancers are paid incrementally as work is completed.

#### Acceptance Criteria

1. WHEN a client creates an escrow, THE EscrowContract SHALL invoke `create_escrow(env, client, freelancer, total, milestones)` and store each Milestone as `{ id: u32, amount: i128, description: String, released: bool }`.
2. THE EscrowContract SHALL require authorization from the `client` address via `address.require_auth()` before creating an escrow.
3. WHEN an escrow is created, THE EscrowContract SHALL emit an `escrow_created` event containing the escrow ID, client address, freelancer address, and total amount.
4. WHEN a client releases a milestone, THE EscrowContract SHALL invoke `release_milestone(env, client, milestone_id)` and call THE PaymentContract to transfer the milestone amount to the freelancer.
5. THE EscrowContract SHALL require authorization from the `client` address via `address.require_auth()` before releasing a milestone.
6. WHEN a milestone is released, THE EscrowContract SHALL emit a `milestone_released` event and set the Milestone `released` field to `true`.
7. IF a client attempts to release an already-released milestone, THEN THE EscrowContract SHALL return an `EscrowAlreadyReleased` error.
8. IF a milestone ID does not exist in the escrow, THEN THE EscrowContract SHALL return an `InvalidMilestone` error.
9. WHEN a client cancels an escrow, THE EscrowContract SHALL invoke `cancel_escrow(env, client, escrow_id)` and return all unreleased funds to the client.
10. WHEN an escrow is cancelled, THE EscrowContract SHALL emit an `escrow_cancelled` event.
11. THE EscrowContract SHALL call THE PaymentContract for all fund release operations.

---

### Requirement 4: Dispute Resolution

**User Story:** As a client or freelancer, I want to raise a dispute on an escrow, so that a resolution process can be initiated when there is a disagreement.

#### Acceptance Criteria

1. WHEN a caller raises a dispute, THE EscrowContract SHALL invoke `dispute_escrow(env, caller, escrow_id)` and record the dispute against the specified escrow.
2. THE EscrowContract SHALL require that the `caller` is either the client or freelancer of the escrow; IF the caller is neither, THEN THE EscrowContract SHALL return an `UnauthorizedCaller` error.
3. WHEN a dispute is raised, THE EscrowContract SHALL emit a `dispute_raised` event containing the escrow ID and caller address.

---

### Requirement 5: Contract Error Handling

**User Story:** As a developer, I want contracts to return typed errors, so that the frontend can display meaningful feedback to users.

#### Acceptance Criteria

1. IF a transaction is submitted with insufficient token balance, THEN THE PaymentContract SHALL return an `InsufficientFunds` error.
2. IF a caller is not authorized to perform an action, THEN THE EscrowContract SHALL return an `UnauthorizedCaller` error.
3. IF a milestone release is attempted on an already-released milestone, THEN THE EscrowContract SHALL return an `EscrowAlreadyReleased` error.
4. IF a milestone ID referenced in a call does not exist, THEN THE EscrowContract SHALL return an `InvalidMilestone` error.
5. WHILE THE PaymentContract or EscrowContract is paused, THE Platform SHALL return a `ContractPaused` error for all state-changing operations.

---

### Requirement 6: Contract Pause / Unpause

**User Story:** As an admin, I want to pause contracts in an emergency, so that I can prevent further transactions while an issue is investigated.

#### Acceptance Criteria

1. WHEN an Admin invokes the pause function, THE PaymentContract SHALL set its paused state to `true` and reject all subsequent state-changing calls with a `ContractPaused` error.
2. WHEN an Admin invokes the pause function, THE EscrowContract SHALL set its paused state to `true` and reject all subsequent state-changing calls with a `ContractPaused` error.
3. WHEN an Admin invokes the unpause function, THE PaymentContract SHALL set its paused state to `false` and resume accepting calls.
4. WHEN an Admin invokes the unpause function, THE EscrowContract SHALL set its paused state to `false` and resume accepting calls.
5. IF a non-Admin address invokes pause or unpause, THEN THE PaymentContract SHALL return an `UnauthorizedCaller` error.
6. IF a non-Admin address invokes pause or unpause, THEN THE EscrowContract SHALL return an `UnauthorizedCaller` error.

---

### Requirement 7: Transaction History

**User Story:** As a user, I want to view my transaction history, so that I can track all payments and escrow activity associated with my wallet.

#### Acceptance Criteria

1. THE Platform SHALL display a paginated transaction history table on the `/history` page showing payment ID, sender, recipient, amount, asset, and status for each transaction.
2. WHEN a user applies a filter on the history page, THE Platform SHALL update the displayed transactions to match the selected filter criteria within 500ms.
3. THE Platform SHALL allow users to export transaction history as a CSV file.

---

### Requirement 8: Real-Time Activity Feed

**User Story:** As a user, I want to see real-time contract events, so that I can monitor payment and escrow activity as it happens.

#### Acceptance Criteria

1. THE Platform SHALL stream contract events from Stellar Horizon using Server-Sent Events (SSE) on the `/activity` page.
2. WHEN a new contract event is received via SSE, THE Platform SHALL append the event to the activity feed within 2 seconds of the event being emitted on-chain.
3. IF the SSE connection is interrupted, THEN THE Platform SHALL attempt to reconnect and display a connection status indicator to the user.

---

### Requirement 9: Payment Links

**User Story:** As a freelancer, I want to generate a shareable payment link, so that clients can pay me without navigating the full UI.

#### Acceptance Criteria

1. THE Platform SHALL generate a Payment_Link in the format `/pay?to={address}&amount={amount}&asset={asset}`.
2. WHEN a user visits a Payment_Link, THE Platform SHALL pre-populate the payment form with the `to`, `amount`, and `asset` values from the URL parameters.
3. IF a Payment_Link contains an invalid Stellar address in the `to` parameter, THEN THE Platform SHALL display a descriptive validation error and prevent form submission.

---

### Requirement 10: Invoice Generation

**User Story:** As a freelancer or client, I want to download a PDF invoice for a completed transaction, so that I have a record for accounting purposes.

#### Acceptance Criteria

1. WHEN a user requests an invoice for a completed transaction, THE Platform SHALL generate a PDF Invoice using jsPDF containing the transaction ID, sender address, recipient address, amount, asset, timestamp, and network.
2. THE Platform SHALL allow the user to download the generated Invoice as a PDF file.

---

### Requirement 11: XLM/USD Rate Display

**User Story:** As a user, I want to see the current XLM/USD exchange rate, so that I can understand the fiat value of my transactions.

#### Acceptance Criteria

1. THE Platform SHALL fetch the current XLM/USD exchange rate from the CoinGecko API and display it in the navigation bar.
2. WHEN the XLM/USD rate is unavailable due to an API error, THE Platform SHALL display a fallback indicator showing that the rate is unavailable.

---

### Requirement 12: Audit Log

**User Story:** As a user, I want a local audit log of my contract interactions, so that I have an offline record of all actions I have taken.

#### Acceptance Criteria

1. THE Platform SHALL record every user-initiated contract interaction in an IndexedDB Audit_Log entry containing the action type, contract address, parameters, timestamp, and transaction result.
2. THE Audit_Log SHALL persist across browser sessions until explicitly cleared by the user.

---

### Requirement 13: Dark Mode

**User Story:** As a user, I want to toggle dark mode, so that I can use the platform comfortably in low-light environments.

#### Acceptance Criteria

1. THE Platform SHALL support dark mode using Tailwind `dark:` classes managed by `next-themes`.
2. WHEN a user toggles the dark mode setting, THE Platform SHALL apply the selected theme immediately without a full page reload.
3. THE Platform SHALL persist the user's theme preference across browser sessions.

---

### Requirement 14: Smart Contract Testing

**User Story:** As a developer, I want comprehensive smart contract tests, so that I can verify contract correctness before deployment.

#### Acceptance Criteria

1. THE PaymentContract test suite SHALL include a `test_send_payment_success` test that verifies a valid payment transfers the correct amount to the recipient.
2. THE EscrowContract test suite SHALL include a `test_escrow_milestone_release` test that verifies releasing a milestone transfers the correct amount via THE PaymentContract.
3. THE EscrowContract test suite SHALL include a `test_unauthorized_dispute` test that verifies a caller who is neither client nor freelancer receives an `UnauthorizedCaller` error.
4. THE PaymentContract test suite SHALL include a `test_insufficient_funds_error` test that verifies a payment with insufficient balance returns an `InsufficientFunds` error.
5. THE EscrowContract test suite SHALL include a `test_cancel_escrow_refunds_client` test that verifies cancelling an escrow returns all unreleased funds to the client.

---

### Requirement 15: Frontend Testing

**User Story:** As a developer, I want frontend unit and end-to-end tests, so that I can verify UI correctness and critical user flows.

#### Acceptance Criteria

1. THE Platform test suite SHALL include a Jest test verifying that the wallet connect component renders and triggers the correct wallet connection handler.
2. THE Platform test suite SHALL include a Jest test verifying that the payment form validates required fields and displays errors for invalid input.
3. THE Platform test suite SHALL include a Jest test verifying that the transaction history table renders rows correctly from mock data.
4. THE Platform test suite SHALL include a Playwright end-to-end test covering the wallet connect flow.
5. THE Platform test suite SHALL include a Playwright end-to-end test covering the escrow create and milestone release flow.
6. THE Platform test suite SHALL include a Playwright end-to-end test covering history filtering and CSV export.

---

### Requirement 16: CI/CD Pipeline

**User Story:** As a developer, I want an automated CI/CD pipeline, so that contract and frontend tests run on every push.

#### Acceptance Criteria

1. THE Platform SHALL include a GitHub Actions workflow with separate jobs for `contract-tests`, `frontend-tests`, and `e2e` that run on every push and pull request.
2. WHEN any CI job fails, THE Platform SHALL block the pull request from merging until all jobs pass.

---

### Requirement 17: Security and Key Management

**User Story:** As a user, I want assurance that my private keys are never exposed, so that my funds remain secure.

#### Acceptance Criteria

1. THE Platform SHALL never store, transmit, or log any wallet private key.
2. THE PaymentContract SHALL call `address.require_auth()` on the `from` address before executing `send_payment`.
3. THE EscrowContract SHALL call `address.require_auth()` on the `client` address before executing `create_escrow`, `release_milestone`, and `cancel_escrow`.
4. THE Platform SHALL store contract addresses, Horizon URL, and network passphrase exclusively in environment variables and SHALL NOT hardcode these values in source code.
5. THE Platform SHALL use the Stellar Testnet Horizon endpoint `https://horizon-testnet.stellar.org` and network passphrase `Test SDF Network ; September 2015`.
6. THE PaymentContract and EscrowContract SHALL represent all monetary amounts as `i128` and SHALL NOT use floating-point types for any monetary calculation.
