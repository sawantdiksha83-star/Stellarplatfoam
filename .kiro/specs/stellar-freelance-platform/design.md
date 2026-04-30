# Design Document

## Overview

The Decentralized Freelance Payment Platform is a full-stack web application built on the Stellar blockchain. It consists of two Soroban smart contracts (PaymentContract and EscrowContract) deployed to Stellar Testnet, and a Next.js 14 frontend that interacts with those contracts via the Stellar SDK. Users connect Freighter or Albedo wallets to sign all transactions client-side — no private keys are ever handled by the server.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Next.js UI  │  │  useWallet   │  │   useStream      │  │
│  │  (App Router)│  │  usePayment  │  │   EventSource    │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│  ┌──────▼─────────────────▼────────────────────▼─────────┐  │
│  │              lib/contracts.ts + lib/stellar.ts        │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │                               │
│  ┌──────────────────────────▼────────────────────────────┐  │
│  │         Freighter / Albedo Wallet (signs tx)          │  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │ HTTPS
┌─────────────────────────────▼───────────────────────────────┐
│                    Next.js API Routes                        │
│              /api/events/route.ts (SSE proxy)               │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              Stellar Horizon Testnet                         │
│         https://horizon-testnet.stellar.org                  │
│    Transaction submission + SSE event streaming             │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│              Stellar Testnet Ledger                          │
│  ┌─────────────────────┐  ┌──────────────────────────────┐  │
│  │   PaymentContract   │  │      EscrowContract          │  │
│  │   (Soroban/Rust)    │  │      (Soroban/Rust)          │  │
│  └─────────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Real-Time SSE Flow

```
Stellar Horizon SSE → /api/events/route.ts → EventSource (browser)
                                                      ↓
                                           ActivityFeed UI component
                                           Toast notifications
                                           Status badge updates
```

---

## Project Structure

```
/
├── contracts/
│   ├── payment/
│   │   ├── src/lib.rs          # PaymentContract
│   │   └── Cargo.toml
│   └── escrow/
│       ├── src/lib.rs          # EscrowContract
│       └── Cargo.toml
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── dashboard/page.tsx  # Freelancer dashboard
│   │   ├── client/page.tsx     # Client payment panel
│   │   ├── history/page.tsx    # Transaction history
│   │   ├── activity/page.tsx   # Real-time activity feed
│   │   ├── pay/page.tsx        # Payment link handler
│   │   └── api/events/route.ts # SSE proxy route
│   ├── components/
│   │   ├── NavBar.tsx
│   │   ├── WalletConnect.tsx
│   │   ├── PaymentForm.tsx
│   │   ├── EscrowForm.tsx
│   │   ├── MilestoneCard.tsx
│   │   ├── TxHistory.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── Toast.tsx
│   │   ├── BatchPayment.tsx
│   │   └── InvoiceGenerator.tsx
│   ├── lib/
│   │   ├── stellar.ts          # Stellar SDK helpers
│   │   ├── contracts.ts        # Contract interaction layer
│   │   ├── auditLog.ts         # IndexedDB audit log
│   │   └── wallets/
│   │       ├── freighter.ts
│   │       └── albedo.ts
│   ├── hooks/
│   │   ├── useWallet.ts
│   │   ├── usePayment.ts
│   │   └── useStream.ts
│   └── __tests__/
│       ├── WalletConnect.test.tsx
│       ├── PaymentForm.test.tsx
│       ├── TxHistory.test.tsx
│       └── e2e/
│           ├── wallet.spec.ts
│           ├── escrow.spec.ts
│           └── history.spec.ts
├── scripts/
│   └── deploy.sh
├── .github/
│   └── workflows/ci.yml
└── README.md
```

---

## Smart Contract Design

### PaymentContract (`contracts/payment/src/lib.rs`)

#### Storage Keys
```rust
pub enum DataKey {
    Admin,
    Paused,
    Payment(BytesN<32>),  // payment_id -> PaymentRecord
}
```

#### Data Structures
```rust
#[contracttype]
pub struct PaymentRecord {
    pub from: Address,
    pub to: Address,
    pub amount: i128,
    pub token: Address,
    pub status: PaymentStatus,
    pub timestamp: u64,
}

#[contracttype]
pub enum PaymentStatus {
    Pending,
    Confirmed,
    Failed,
}

#[contracterror]
pub enum Error {
    InsufficientFunds = 1,
    UnauthorizedCaller = 2,
    EscrowAlreadyReleased = 3,
    InvalidMilestone = 4,
    ContractPaused = 5,
}
```

#### Public Interface
```rust
pub trait PaymentContractTrait {
    fn initialize(env: Env, admin: Address);
    fn send_payment(env: Env, from: Address, to: Address, amount: i128, token: Address) -> Result<BytesN<32>, Error>;
    fn get_payment_status(env: Env, payment_id: BytesN<32>) -> PaymentStatus;
    fn pause(env: Env, admin: Address) -> Result<(), Error>;
    fn unpause(env: Env, admin: Address) -> Result<(), Error>;
}
```

#### Events Emitted
| Event topic | Data |
|---|---|
| `["payment", "sent"]` | `{ payment_id, from, to, amount, token }` |
| `["payment", "confirmed"]` | `{ payment_id }` |
| `["payment", "failed"]` | `{ payment_id, reason }` |

#### send_payment Flow
1. Check contract is not paused → return `ContractPaused` if true
2. Call `from.require_auth()`
3. Generate `payment_id` from `sha256(from + to + amount + ledger_sequence)`
4. Call token SAC `transfer(from, to, amount)` via cross-contract call
5. Store `PaymentRecord` with status `Confirmed`
6. Emit `payment_sent` and `payment_confirmed` events
7. Return `payment_id`

---

### EscrowContract (`contracts/escrow/src/lib.rs`)

#### Storage Keys
```rust
pub enum DataKey {
    Admin,
    Paused,
    Escrow(BytesN<32>),       // escrow_id -> EscrowRecord
    EscrowCounter,
}
```

#### Data Structures
```rust
#[contracttype]
pub struct Milestone {
    pub id: u32,
    pub amount: i128,
    pub description: String,
    pub released: bool,
}

#[contracttype]
pub struct EscrowRecord {
    pub client: Address,
    pub freelancer: Address,
    pub token: Address,
    pub total: i128,
    pub milestones: Vec<Milestone>,
    pub disputed: bool,
    pub cancelled: bool,
    pub payment_contract: Address,
}
```

#### Public Interface
```rust
pub trait EscrowContractTrait {
    fn initialize(env: Env, admin: Address, payment_contract: Address);
    fn create_escrow(env: Env, client: Address, freelancer: Address, token: Address, total: i128, milestones: Vec<Milestone>) -> Result<BytesN<32>, Error>;
    fn release_milestone(env: Env, client: Address, escrow_id: BytesN<32>, milestone_id: u32) -> Result<(), Error>;
    fn dispute_escrow(env: Env, caller: Address, escrow_id: BytesN<32>) -> Result<(), Error>;
    fn cancel_escrow(env: Env, client: Address, escrow_id: BytesN<32>) -> Result<(), Error>;
    fn pause(env: Env, admin: Address) -> Result<(), Error>;
    fn unpause(env: Env, admin: Address) -> Result<(), Error>;
}
```

#### Events Emitted
| Event topic | Data |
|---|---|
| `["escrow", "created"]` | `{ escrow_id, client, freelancer, total }` |
| `["escrow", "milestone_released"]` | `{ escrow_id, milestone_id, amount }` |
| `["escrow", "dispute_raised"]` | `{ escrow_id, caller }` |
| `["escrow", "cancelled"]` | `{ escrow_id, refund_amount }` |

#### create_escrow Flow
1. Check not paused
2. Call `client.require_auth()`
3. Validate sum of milestone amounts equals `total`
4. Transfer `total` from client to escrow contract via token SAC
5. Store `EscrowRecord` with generated `escrow_id`
6. Emit `escrow_created`

#### release_milestone Flow
1. Check not paused
2. Call `client.require_auth()`
3. Load escrow, verify `client` matches
4. Find milestone by `milestone_id` → `InvalidMilestone` if not found
5. Check `milestone.released == false` → `EscrowAlreadyReleased` if true
6. Cross-contract call: `PaymentContract::send_payment(escrow, freelancer, milestone.amount, token)`
7. Set `milestone.released = true`, save escrow
8. Emit `milestone_released`

#### Inter-Contract Call Pattern
EscrowContract stores the PaymentContract address at initialization and calls it via `env.invoke_contract()` for all fund releases, keeping payment logic centralized.

---

## Frontend Design

### Environment Variables (`.env.local`)
```
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
NEXT_PUBLIC_PAYMENT_CONTRACT_ID=<deployed_contract_id>
NEXT_PUBLIC_ESCROW_CONTRACT_ID=<deployed_contract_id>
NEXT_PUBLIC_TOKEN_CONTRACT_ID=<deployed_sac_id>
```

### Wallet Integration (`lib/wallets/`)

#### `freighter.ts`
```typescript
export async function getFreighterPublicKey(): Promise<string>
export async function signTransactionFreighter(xdr: string, network: string): Promise<string>
export function isFreighterInstalled(): boolean
```

#### `albedo.ts`
```typescript
export async function getAlbedoPublicKey(): Promise<string>
export async function signTransactionAlbedo(xdr: string, network: string): Promise<string>
```

### `useWallet` Hook
```typescript
interface WalletState {
  publicKey: string | null;
  walletType: 'freighter' | 'albedo' | null;
  xlmBalance: string;
  tokenBalance: string;
  xlmUsdRate: number | null;
  connected: boolean;
}

// Persists publicKey and walletType to localStorage
// Fetches balances from Horizon /accounts/{id} on connect
// Fetches XLM/USD rate from CoinGecko on connect
```

### `lib/contracts.ts` — Contract Interaction Layer

All Soroban contract calls go through this module. It builds, simulates, and submits transactions using `@stellar/stellar-sdk`.

```typescript
// PaymentContract
export async function sendPayment(params: {
  from: string; to: string; amount: bigint; token: string;
  signTransaction: (xdr: string) => Promise<string>;
}): Promise<{ paymentId: string; txHash: string }>

export async function getPaymentStatus(paymentId: string): Promise<PaymentStatus>

// EscrowContract
export async function createEscrow(params: {
  client: string; freelancer: string; token: string;
  total: bigint; milestones: Milestone[];
  signTransaction: (xdr: string) => Promise<string>;
}): Promise<{ escrowId: string; txHash: string }>

export async function releaseMilestone(params: {
  client: string; escrowId: string; milestoneId: number;
  signTransaction: (xdr: string) => Promise<string>;
}): Promise<{ txHash: string }>

export async function disputeEscrow(params: {
  caller: string; escrowId: string;
  signTransaction: (xdr: string) => Promise<string>;
}): Promise<{ txHash: string }>

export async function cancelEscrow(params: {
  client: string; escrowId: string;
  signTransaction: (xdr: string) => Promise<string>;
}): Promise<{ txHash: string }>

// Admin
export async function pauseContract(contractId: string, admin: string, signTransaction: ...): Promise<void>
export async function unpauseContract(contractId: string, admin: string, signTransaction: ...): Promise<void>

// Batch payment (multi-operation transaction)
export async function batchPayment(params: {
  from: string;
  recipients: Array<{ to: string; amount: bigint; token: string }>;
  signTransaction: (xdr: string) => Promise<string>;
}): Promise<Array<{ to: string; txHash: string; status: 'success' | 'failed' }>>
```

### `lib/stellar.ts` — SDK Helpers

```typescript
export function getServer(): SorobanRpc.Server
export function getHorizonServer(): Horizon.Server
export async function fetchAccountBalances(publicKey: string): Promise<{ xlm: string; tokens: Record<string, string> }>
export async function fetchTransactionHistory(publicKey: string, cursor?: string): Promise<Transaction[]>
export function truncateAddress(address: string): string  // "GABC...XYZ"
export function stroopsToXlm(stroops: bigint): string
export function xlmToStroops(xlm: string): bigint
```

### `useStream` Hook

```typescript
// Connects to /api/events?account={publicKey}
// Returns: { events: ContractEvent[], connectionStatus: 'connected' | 'reconnecting' | 'disconnected' }
// Auto-reconnects with exponential backoff on disconnect
```

### `/api/events/route.ts` — SSE Proxy

```typescript
// GET /api/events?account={publicKey}
// Proxies Horizon SSE stream: GET https://horizon-testnet.stellar.org/accounts/{id}/transactions?cursor=now
// Streams events as text/event-stream to the browser
// Handles reconnection via Last-Event-ID header
```

### `lib/auditLog.ts` — IndexedDB Audit Log

```typescript
interface AuditEntry {
  id: string;           // auto-generated
  action: string;       // 'send_payment' | 'create_escrow' | 'release_milestone' | etc.
  contractAddress: string;
  parameters: Record<string, unknown>;
  timestamp: number;
  txHash: string | null;
  result: 'success' | 'failed';
  error?: string;
}

export async function logAction(entry: Omit<AuditEntry, 'id'>): Promise<void>
export async function getAuditLog(): Promise<AuditEntry[]>
export async function clearAuditLog(): Promise<void>
```

---

## Pages

### `/` — Landing Page
- Hero section with platform tagline and CTA to connect wallet
- Feature highlights: instant payments, milestone escrow, multi-wallet, real-time feed
- NavBar with WalletConnect, dark mode toggle, XLM balance, XLM/USD rate

### `/dashboard` — Freelancer Dashboard
- Incoming payments list with status badges (Pending / Confirmed / Failed)
- Active escrows with per-milestone progress bars showing released/total
- Total earned summary (XLM + token amounts)
- "Get Payment Link" button → generates `/pay?to={address}&amount=&asset=XLM`

### `/client` — Client Payment Panel
- Direct payment form: recipient address, amount, asset selector (XLM / FLNC), memo
- Create escrow form: freelancer address, token, dynamic milestone rows (add/remove), total auto-sum
- Active escrows list with "Release Milestone" button per milestone
- Batch payment section: add multiple recipients, submit as single multi-operation transaction

### `/history` — Transaction History
- Paginated table: tx hash (linked to Stellar Expert), from, to, amount, asset, type, status, timestamp
- Filters: status (all/pending/confirmed/failed), type (direct/escrow), date range
- CSV export button (client-side generation)
- Invoice download button per row (jsPDF)

### `/activity` — Real-Time Activity Feed
- Live event list fed by SSE via `useStream`
- Connection status indicator (green/yellow/red dot)
- Toast notifications for incoming payment events
- Auto-scroll to latest event

### `/pay` — Payment Link Handler
- Reads `to`, `amount`, `asset` from URL query params
- Validates Stellar address format
- Pre-fills PaymentForm; shows validation error if address is invalid

---

## Component Design

### `WalletConnect.tsx`
- "Connect Wallet" button opens modal with Freighter / Albedo options
- On connect: calls appropriate wallet adapter, stores `publicKey` + `walletType` in localStorage
- Connected state: shows truncated address + copy button + disconnect button
- Handles "wallet not installed" with descriptive message per wallet type

### `PaymentForm.tsx`
- Controlled form: recipient, amount (i128 via BigInt), asset, memo
- Inline validation: required fields, valid Stellar address, positive amount
- On submit: calls `contracts.sendPayment`, shows pending toast, updates to confirmed/failed
- Retry button stored in component state if last tx failed (resubmits same params)
- Reads URL params if rendered on `/pay` route

### `EscrowForm.tsx`
- Dynamic milestone rows: description + amount fields, add/remove buttons
- Auto-calculates total from milestone amounts
- On submit: calls `contracts.createEscrow`

### `MilestoneCard.tsx`
- Displays milestone: id, description, amount, released status
- "Release" button (client only) → calls `contracts.releaseMilestone`
- Progress bar showing released milestones vs total

### `TxHistory.tsx`
- Renders paginated table from Horizon transaction data
- Filter controls: status select, type select, date pickers
- CSV export: builds CSV string client-side and triggers download
- Invoice button: calls `InvoiceGenerator` with row data

### `ActivityFeed.tsx`
- Consumes `useStream` hook
- Renders scrollable event list with event type icon, description, timestamp
- Connection status badge

### `Toast.tsx`
- Global toast provider using React context
- Types: success (green), error (red), info (blue)
- Error toasts for failed transactions include link to Stellar Expert

### `BatchPayment.tsx`
- Table of recipient rows: address, amount, asset
- Add/remove row buttons
- Submit → calls `contracts.batchPayment`
- Results table: per-recipient status after submission

### `InvoiceGenerator.tsx`
- Uses `jsPDF` to generate PDF with: tx ID, from, to, amount, asset, timestamp, network
- Triggers browser download on button click

### `NavBar.tsx`
- Logo + nav links
- WalletConnect component
- XLM balance display (fetched from Horizon)
- XLM/USD rate display (fetched from CoinGecko, fallback to "N/A")
- Dark mode toggle (next-themes)

---

## Error Handling

### Contract Errors → UI Messages
| Soroban Error | UI Message |
|---|---|
| `InsufficientFunds` | "Insufficient balance. Please fund your account at the Stellar faucet." |
| `UnauthorizedCaller` | "You are not authorized to perform this action." |
| `EscrowAlreadyReleased` | "This milestone has already been released." |
| `InvalidMilestone` | "Milestone not found in this escrow." |
| `ContractPaused` | "Contract is currently paused for maintenance." |

### Frontend Error States
- Wallet not connected → redirect to `/` with "Please connect your wallet" message
- Insufficient XLM balance → inline error below amount field
- Transaction rejected by user → info toast "Transaction cancelled"
- Transaction failed on-chain → error toast with tx hash link to `https://stellar.expert/explorer/testnet/tx/{hash}`
- Network timeout → error toast with "Retry" button that resubmits the signed XDR envelope
- SSE disconnected → yellow status indicator + auto-reconnect with exponential backoff

---

## Correctness Properties

The following properties must hold at all times and are validated by the property-based test suite.

### P1: Payment Conservation
For any successful `send_payment(from, to, amount, token)`, the token balance of `to` increases by exactly `amount` and the balance of `from` decreases by exactly `amount`. No tokens are created or destroyed.

### P2: Escrow Milestone Monotonicity
Once a milestone's `released` field is set to `true`, it can never be set back to `false`. A released milestone cannot be released again.

### P3: Escrow Total Integrity
The sum of all milestone amounts in an escrow must equal the `total` field at creation time. The contract must reject escrow creation if this invariant is violated.

### P4: Authorization Exclusivity
Only the `client` address of an escrow can call `release_milestone` and `cancel_escrow`. Any other caller must receive `UnauthorizedCaller`. Only the `client` or `freelancer` can call `dispute_escrow`.

### P5: Pause Guard
When a contract is paused, all state-changing functions (`send_payment`, `create_escrow`, `release_milestone`, `cancel_escrow`, `dispute_escrow`) must return `ContractPaused` without modifying any state.

### P6: Cancel Refund Completeness
When `cancel_escrow` is called, the sum of all unreleased milestone amounts must be returned to the `client`. No unreleased funds may remain in the contract after cancellation.

### P7: Batch Payment Atomicity per Operation
Each operation in a batch payment is independent. A failure in one operation does not roll back others. The result table must accurately reflect the per-recipient outcome.

---

## Testing Strategy

### Smart Contract Tests (Rust — soroban-sdk test framework)

Located in `contracts/payment/src/lib.rs` and `contracts/escrow/src/lib.rs` under `#[cfg(test)]`.

| Test | Contract | Validates |
|---|---|---|
| `test_send_payment_success` | Payment | P1: correct amount transferred |
| `test_insufficient_funds_error` | Payment | P1: InsufficientFunds returned |
| `test_escrow_milestone_release` | Escrow | P2, P3: milestone released via PaymentContract |
| `test_unauthorized_dispute` | Escrow | P4: UnauthorizedCaller for non-party |
| `test_cancel_escrow_refunds_client` | Escrow | P6: full unreleased refund to client |

### Frontend Unit Tests (Jest + React Testing Library)

| Test | Component | Validates |
|---|---|---|
| Wallet connect renders and triggers handler | WalletConnect | R1 |
| Payment form validates required fields | PaymentForm | R2 |
| TxHistory renders mock data and filters | TxHistory | R7 |

### E2E Tests (Playwright)

| Test | Flow | Validates |
|---|---|---|
| `wallet.spec.ts` | Connect wallet → navigate to client panel → fill form → submit | R1, R2 |
| `escrow.spec.ts` | Create escrow → release milestone → verify dashboard update | R3 |
| `history.spec.ts` | History page loads → filter by status → CSV export download | R7 |

---

## CI/CD Pipeline (`.github/workflows/ci.yml`)

Three parallel jobs on every push and pull request:

1. `contract-tests` — `dtolnay/rust-toolchain@stable` → `cd contracts && cargo test`
2. `frontend-tests` — `actions/setup-node@v4` (Node 20) → `cd frontend && npm ci && npm test`
3. `e2e` — Node 20 → `cd frontend && npm ci && npx playwright test`

All three jobs must pass before a PR can be merged (enforced via branch protection rules).

---

## Deployment

### Smart Contracts
- Build: `cargo build --target wasm32-unknown-unknown --release`
- Deploy via `stellar contract deploy` CLI to Stellar Testnet
- `scripts/deploy.sh` automates build + deploy + saves contract IDs to `.env.local`

### Frontend
- Deployed to Vercel via GitHub integration
- Environment variables set in Vercel project settings
- Preview deployments on every PR branch
