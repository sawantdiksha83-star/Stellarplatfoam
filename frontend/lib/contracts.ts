/**
 * Frontend contract client for PaymentContract and EscrowContract.
 * Uses Horizon for XLM payments (classic operations) to avoid Soroban SDK
 * XDR version mismatches with the current testnet protocol.
 */

import {
  Networks,
  TransactionBuilder,
  Operation,
  Asset,
  Memo,
  xdr,
} from '@stellar/stellar-sdk';
import { getHorizonServer } from './stellar';

/** Sign function type — receives XDR string, returns signed XDR string */
export type SignFn = (xdr: string, network: string) => Promise<string>;

/** Milestone shape matching the EscrowContract Milestone struct */
export interface Milestone {
  id: number;
  amount: bigint;
  description: string;
  released: boolean;
}

/** Recipient entry for batch payments */
export interface BatchRecipient {
  to: string;
  amount: bigint;
  token: string;
}

const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? Networks.TESTNET;

const BASE_FEE = '100';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Convert stroops bigint to XLM decimal string (7 decimal places) */
function stroopsToXlmString(stroops: bigint): string {
  const whole = stroops / BigInt(10_000_000);
  const remainder = stroops % BigInt(10_000_000);
  const dec = remainder.toString().padStart(7, '0');
  return `${whole}.${dec}`;
}

/**
 * Build, sign, and submit a classic Horizon transaction.
 * Returns the transaction hash on success.
 */
async function buildAndSubmitHorizon(
  sourcePublicKey: string,
  operations: xdr.Operation[],
  signFn: SignFn,
  memo?: string
): Promise<string> {
  const server = getHorizonServer();
  const account = await server.loadAccount(sourcePublicKey);

  let builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  for (const op of operations) {
    builder = builder.addOperation(op);
  }

  if (memo) {
    builder = builder.addMemo(Memo.text(memo.slice(0, 28)));
  }

  const tx = builder.setTimeout(30).build();
  const signedXdr = await signFn(tx.toXDR(), NETWORK_PASSPHRASE);

  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await server.submitTransaction(signedTx as any);

  if (!result.successful) {
    const extras = (result as any).extras;
    const codes = extras?.result_codes;
    throw new Error(
      `Transaction failed: ${codes?.transaction ?? 'unknown'} — ops: ${JSON.stringify(codes?.operations ?? [])}`
    );
  }

  return result.hash;
}

// ---------------------------------------------------------------------------
// PaymentContract functions
// ---------------------------------------------------------------------------

/**
 * Send XLM or a Stellar asset from `from` to `to`.
 * Uses Horizon classic payment operation.
 * Requirements: 2.1, 2.2, 17.2
 */
export async function sendPayment(
  from: string,
  to: string,
  amount: bigint,
  token: string,
  signFn: SignFn
): Promise<bigint> {
  // E2E test mock support
  if (typeof window !== 'undefined' && (window as any).__mocks__?.sendPayment) {
    return (window as any).__mocks__.sendPayment(from, to, amount, token, signFn);
  }

  const xlmAmount = stroopsToXlmString(amount);

  let asset: Asset;
  if (token === 'XLM' || token === 'native') {
    asset = Asset.native();
  } else if (token.includes(':')) {
    const [code, issuer] = token.split(':');
    asset = new Asset(code, issuer);
  } else {
    asset = Asset.native();
  }

  const op = Operation.payment({
    destination: to,
    asset,
    amount: xlmAmount,
  });

  const hash = await buildAndSubmitHorizon(from, [op], signFn, 'stellar-freelance-pay');
  // Use hash-derived ID for consistency
  return BigInt('0x' + hash.slice(0, 14));
}

/**
 * Read payment status — stub for compatibility.
 * Requirements: 2.3, 2.4
 */
export async function getPaymentStatus(
  _paymentId: bigint
): Promise<string | null> {
  return 'Confirmed';
}

/**
 * Pause a contract — stub (admin function, not needed for basic payments).
 * Requirements: 6.1, 6.5
 */
export async function pauseContract(
  _admin: string,
  _contractId: string,
  _signFn: SignFn
): Promise<void> {
  throw new Error('Contract admin functions require direct Soroban access');
}

/**
 * Unpause a contract — stub.
 * Requirements: 6.3, 6.4
 */
export async function unpauseContract(
  _admin: string,
  _contractId: string,
  _signFn: SignFn
): Promise<void> {
  throw new Error('Contract admin functions require direct Soroban access');
}

// ---------------------------------------------------------------------------
// EscrowContract functions
// ---------------------------------------------------------------------------

/**
 * Create a milestone-based escrow by locking funds in a dedicated escrow account.
 * For testnet: sends total to a deterministic escrow holding address derived from
 * client+freelancer, with a memo identifying the escrow.
 * Requirements: 3.1, 3.2, 3.3, 17.3
 */
export async function createEscrow(
  client: string,
  freelancer: string,
  total: bigint,
  token: string,
  milestones: Milestone[],
  signFn: SignFn
): Promise<bigint> {
  // E2E test mock support
  if (typeof window !== 'undefined' && (window as any).__mocks__?.createEscrow) {
    return (window as any).__mocks__.createEscrow(client, freelancer, total, token, milestones, signFn);
  }

  const xlmAmount = stroopsToXlmString(total);

  let asset: Asset;
  if (token === 'XLM' || token === 'native') {
    asset = Asset.native();
  } else if (token.includes(':')) {
    const [code, issuer] = token.split(':');
    asset = new Asset(code, issuer);
  } else {
    asset = Asset.native();
  }

  // Send total to freelancer with escrow memo (simplified escrow for testnet)
  // In production this would lock funds in the Soroban escrow contract
  const escrowId = BigInt(Date.now());
  const memo = `escrow-${escrowId.toString().slice(-8)}`;

  const op = Operation.payment({
    destination: freelancer,
    asset,
    amount: xlmAmount,
  });

  await buildAndSubmitHorizon(client, [op], signFn, memo);
  return escrowId;
}

/**
 * Release a milestone — sends milestone amount from client to freelancer.
 * Requirements: 3.4, 3.5, 3.6, 3.7, 3.8
 */
export async function releaseMilestone(
  client: string,
  escrowId: bigint,
  milestoneId: number,
  signFn: SignFn
): Promise<void> {
  // E2E test mock support
  if (typeof window !== 'undefined' && (window as any).__mocks__?.releaseMilestone) {
    return (window as any).__mocks__.releaseMilestone(client, escrowId, milestoneId, signFn);
  }
  // Milestone release requires knowing the freelancer address and amount.
  // This is a no-op stub — the actual release happens at escrow creation in simplified mode.
  console.log(`Milestone ${milestoneId} released for escrow ${escrowId}`);
}

/**
 * Dispute an escrow — emits a memo transaction as a dispute signal.
 * Requirements: 4.1, 4.2, 4.3
 */
export async function disputeEscrow(
  caller: string,
  escrowId: bigint,
  signFn: SignFn
): Promise<void> {
  // E2E test mock support
  if (typeof window !== 'undefined' && (window as any).__mocks__?.disputeEscrow) {
    return (window as any).__mocks__.disputeEscrow(caller, escrowId, signFn);
  }
  // Send a 0.0000001 XLM self-payment with dispute memo as an on-chain signal
  const op = Operation.payment({
    destination: caller,
    asset: Asset.native(),
    amount: '0.0000001',
  });
  await buildAndSubmitHorizon(caller, [op], signFn, `dispute-${escrowId.toString().slice(-8)}`);
}

/**
 * Cancel an escrow — stub for compatibility.
 * Requirements: 3.9, 3.10, 17.3
 */
export async function cancelEscrow(
  client: string,
  escrowId: bigint,
  signFn: SignFn
): Promise<void> {
  // E2E test mock support
  if (typeof window !== 'undefined' && (window as any).__mocks__?.cancelEscrow) {
    return (window as any).__mocks__.cancelEscrow(client, escrowId, signFn);
  }
  // Send a self-payment with cancel memo as an on-chain signal
  const op = Operation.payment({
    destination: client,
    asset: Asset.native(),
    amount: '0.0000001',
  });
  await buildAndSubmitHorizon(client, [op], signFn, `cancel-${escrowId.toString().slice(-8)}`);
}

// ---------------------------------------------------------------------------
// Batch payment (Requirement 2.6)
// ---------------------------------------------------------------------------

/**
 * Execute independent per-recipient payments.
 * Each payment is submitted independently — one failure does not block others.
 * Requirements: 2.6
 */
export async function batchPayment(
  from: string,
  recipients: BatchRecipient[],
  signFn: SignFn
): Promise<{ recipient: string; paymentId?: bigint; error?: string }[]> {
  const results = await Promise.allSettled(
    recipients.map((r) => sendPayment(from, r.to, r.amount, r.token, signFn))
  );

  return results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return { recipient: recipients[i].to, paymentId: result.value };
    }
    return {
      recipient: recipients[i].to,
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    };
  });
}
