'use client';

/**
 * PaymentForm — direct payment submission form.
 * Requirements: 2.1, 2.7, 9.2, 9.3
 */

import { useState } from 'react';
import { usePayment } from '../hooks/usePayment';
import type { SignFn } from '../lib/contracts';

/** Stellar address regex: G + 55 base32 chars */
const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

interface PaymentFormProps {
  /** Connected wallet public key */
  publicKey: string;
  /** Sign function from useWallet */
  signFn: SignFn;
  /** Available assets: [{ id, label }] — first entry is XLM */
  assets?: { id: string; label: string }[];
  /** Pre-populated values (e.g. from payment link) */
  defaultTo?: string;
  defaultAmount?: string;
  defaultAsset?: string;
}

export default function PaymentForm({
  publicKey,
  signFn,
  assets = [{ id: 'XLM', label: 'XLM' }],
  defaultTo = '',
  defaultAmount = '',
  defaultAsset,
}: PaymentFormProps) {
  const payment = usePayment();

  const [to, setTo] = useState(defaultTo);
  const [amount, setAmount] = useState(defaultAmount);
  const [asset, setAsset] = useState(defaultAsset ?? assets[0]?.id ?? 'XLM');

  const [fieldErrors, setFieldErrors] = useState<{
    to?: string;
    amount?: string;
  }>({});

  function validate(): boolean {
    const errors: typeof fieldErrors = {};
    if (!to.trim()) {
      errors.to = 'Recipient address is required.';
    } else if (!STELLAR_ADDRESS_RE.test(to.trim())) {
      errors.to = 'Invalid Stellar address format.';
    }
    if (!amount.trim()) {
      errors.amount = 'Amount is required.';
    } else {
      const parsed = Number(amount);
      if (isNaN(parsed) || parsed <= 0) {
        errors.amount = 'Amount must be a positive number.';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    // Convert to i128-safe bigint (7 decimal places = stroops-style)
    const [whole, dec = ''] = amount.split('.');
    const paddedDec = dec.slice(0, 7).padEnd(7, '0');
    const amountBigInt = BigInt(whole) * BigInt(10_000_000) + BigInt(paddedDec);

    await payment.submit({
      from: publicKey,
      to: to.trim(),
      amount: amountBigInt,
      token: asset,
      signFn,
    });
  }

  const isPending = payment.status === 'pending';
  const isSuccess = payment.status === 'success';
  const isError = payment.status === 'error';

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Recipient */}
      <div className="flex flex-col gap-1">
        <label htmlFor="pf-to" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Recipient address
        </label>
        <input
          id="pf-to"
          type="text"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="G…"
          aria-describedby={fieldErrors.to ? 'pf-to-error' : undefined}
          aria-invalid={!!fieldErrors.to}
          className={`rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            fieldErrors.to ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
        />
        {fieldErrors.to && (
          <p id="pf-to-error" role="alert" className="text-xs text-red-600 dark:text-red-400">
            {fieldErrors.to}
          </p>
        )}
      </div>

      {/* Amount */}
      <div className="flex flex-col gap-1">
        <label htmlFor="pf-amount" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Amount
        </label>
        <input
          id="pf-amount"
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          aria-describedby={fieldErrors.amount ? 'pf-amount-error' : undefined}
          aria-invalid={!!fieldErrors.amount}
          className={`rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            fieldErrors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
        />
        {fieldErrors.amount && (
          <p id="pf-amount-error" role="alert" className="text-xs text-red-600 dark:text-red-400">
            {fieldErrors.amount}
          </p>
        )}
      </div>

      {/* Asset */}
      <div className="flex flex-col gap-1">
        <label htmlFor="pf-asset" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Asset
        </label>
        <select
          id="pf-asset"
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {/* Submit / Retry */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 transition-colors"
        >
          {isPending ? 'Sending…' : 'Send Payment'}
        </button>

        {/* One-click retry on failure (Req 2.7) */}
        {isError && (
          <button
            type="button"
            onClick={payment.retry}
            disabled={isPending}
            className="rounded-lg border border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 text-sm font-medium px-4 py-2.5 transition-colors"
          >
            Retry
          </button>
        )}
      </div>

      {/* Status feedback */}
      {isSuccess && (
        <p role="status" className="text-sm text-green-600 dark:text-green-400">
          Payment sent successfully.
        </p>
      )}
      {isError && payment.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {payment.error}
        </p>
      )}
    </form>
  );
}
