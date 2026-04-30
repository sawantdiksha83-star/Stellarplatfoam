'use client';

/**
 * BatchPayment — send payments to multiple recipients in one action.
 * Each payment is independent; one failure does not block others.
 * Requirements: 2.6
 */

import { useState } from 'react';
import { batchPayment } from '../lib/contracts';
import type { SignFn } from '../lib/contracts';

const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

interface RecipientInput {
  to: string;
  amount: string;
  token: string;
}

interface RecipientResult {
  recipient: string;
  paymentId?: bigint;
  error?: string;
}

interface BatchPaymentProps {
  publicKey: string;
  signFn: SignFn;
  assets?: { id: string; label: string }[];
}

export default function BatchPayment({
  publicKey,
  signFn,
  assets = [{ id: 'XLM', label: 'XLM' }],
}: BatchPaymentProps) {
  const [recipients, setRecipients] = useState<RecipientInput[]>([
    { to: '', amount: '', token: assets[0]?.id ?? 'XLM' },
  ]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'pending' | 'done'>('idle');
  const [results, setResults] = useState<RecipientResult[]>([]);

  function updateRecipient(index: number, field: keyof RecipientInput, value: string) {
    setRecipients((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addRecipient() {
    setRecipients((prev) => [...prev, { to: '', amount: '', token: assets[0]?.id ?? 'XLM' }]);
  }

  function removeRecipient(index: number) {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    recipients.forEach((r, i) => {
      if (!r.to.trim()) {
        errors[`to_${i}`] = 'Address is required.';
      } else if (!STELLAR_ADDRESS_RE.test(r.to.trim())) {
        errors[`to_${i}`] = 'Invalid Stellar address.';
      }
      if (!r.amount.trim()) {
        errors[`amt_${i}`] = 'Amount is required.';
      } else {
        const parsed = Number(r.amount);
        if (isNaN(parsed) || parsed <= 0) {
          errors[`amt_${i}`] = 'Must be a positive number.';
        }
      }
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function toI128(value: string): bigint {
    const [whole, dec = ''] = value.split('.');
    const paddedDec = dec.slice(0, 7).padEnd(7, '0');
    return BigInt(whole) * BigInt(10_000_000) + BigInt(paddedDec);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setStatus('pending');
    setResults([]);

    const built = recipients.map((r) => ({
      to: r.to.trim(),
      amount: toI128(r.amount),
      token: r.token,
    }));

    const raw = await batchPayment(publicKey, built, signFn);
    setResults(raw);
    setStatus('done');
  }

  const isPending = status === 'pending';

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {recipients.map((r, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Recipient {i + 1}
              </span>
              {recipients.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRecipient(i)}
                  aria-label={`Remove recipient ${i + 1}`}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1">
              <label htmlFor={`bp-to-${i}`} className="text-xs text-gray-600 dark:text-gray-400">
                Address
              </label>
              <input
                id={`bp-to-${i}`}
                type="text"
                value={r.to}
                onChange={(e) => updateRecipient(i, 'to', e.target.value)}
                placeholder="G…"
                aria-invalid={!!fieldErrors[`to_${i}`]}
                className={`rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  fieldErrors[`to_${i}`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {fieldErrors[`to_${i}`] && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                  {fieldErrors[`to_${i}`]}
                </p>
              )}
            </div>

            {/* Amount + Asset */}
            <div className="flex gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <label htmlFor={`bp-amt-${i}`} className="text-xs text-gray-600 dark:text-gray-400">
                  Amount
                </label>
                <input
                  id={`bp-amt-${i}`}
                  type="number"
                  min="0"
                  step="any"
                  value={r.amount}
                  onChange={(e) => updateRecipient(i, 'amount', e.target.value)}
                  placeholder="Enter amount"
                  aria-invalid={!!fieldErrors[`amt_${i}`]}
                  className={`rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    fieldErrors[`amt_${i}`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {fieldErrors[`amt_${i}`] && (
                  <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                    {fieldErrors[`amt_${i}`]}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1 w-28">
                <label htmlFor={`bp-asset-${i}`} className="text-xs text-gray-600 dark:text-gray-400">
                  Asset
                </label>
                <select
                  id={`bp-asset-${i}`}
                  value={r.token}
                  onChange={(e) => updateRecipient(i, 'token', e.target.value)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRecipient}
        className="self-start text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        + Add recipient
      </button>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 transition-colors"
      >
        {isPending ? 'Sending…' : `Send to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`}
      </button>

      {/* Per-recipient results */}
      {status === 'done' && results.length > 0 && (
        <ul className="flex flex-col gap-1" role="status">
          {results.map((r, i) => (
            <li key={i} className="text-xs flex items-center gap-2">
              <span className="font-mono text-gray-500 dark:text-gray-400">
                {r.recipient.slice(0, 6)}…{r.recipient.slice(-4)}
              </span>
              {r.error ? (
                <span className="text-red-600 dark:text-red-400">Failed: {r.error}</span>
              ) : (
                <span className="text-green-600 dark:text-green-400">
                  Sent (ID: {r.paymentId?.toString()})
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
