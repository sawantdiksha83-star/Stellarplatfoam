'use client';

/**
 * EscrowForm — create a milestone-based escrow.
 * Requirements: 3.1, 3.2
 */

import { useState } from 'react';
import { createEscrow } from '../lib/contracts';
import { logAction } from '../lib/auditLog';
import type { Milestone, SignFn } from '../lib/contracts';

const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;
const ESCROW_CONTRACT_ID = process.env.NEXT_PUBLIC_ESCROW_CONTRACT_ID ?? '';

interface MilestoneInput {
  description: string;
  amount: string;
}

interface EscrowFormProps {
  publicKey: string;
  signFn: SignFn;
  token?: string;
  onSuccess?: (escrowId: bigint) => void;
}

export default function EscrowForm({
  publicKey,
  signFn,
  token = 'XLM',
  onSuccess,
}: EscrowFormProps) {
  const [freelancer, setFreelancer] = useState('');
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { description: '', amount: '' },
  ]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [escrowId, setEscrowId] = useState<bigint | null>(null);

  function updateMilestone(index: number, field: keyof MilestoneInput, value: string) {
    setMilestones((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  function addMilestone() {
    setMilestones((prev) => [...prev, { description: '', amount: '' }]);
  }

  function removeMilestone(index: number) {
    setMilestones((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!freelancer.trim()) {
      errors.freelancer = 'Freelancer address is required.';
    } else if (!STELLAR_ADDRESS_RE.test(freelancer.trim())) {
      errors.freelancer = 'Invalid Stellar address format.';
    }

    if (milestones.length === 0) {
      errors.milestones = 'At least one milestone is required.';
    }

    milestones.forEach((m, i) => {
      if (!m.description.trim()) {
        errors[`m_desc_${i}`] = 'Description is required.';
      }
      if (!m.amount.trim()) {
        errors[`m_amt_${i}`] = 'Amount is required.';
      } else {
        const parsed = Number(m.amount);
        if (isNaN(parsed) || parsed <= 0) {
          errors[`m_amt_${i}`] = 'Amount must be a positive number.';
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
    setSubmitError(null);

    const builtMilestones: Milestone[] = milestones.map((m, i) => ({
      id: i,
      amount: toI128(m.amount),
      description: m.description.trim(),
      released: false,
    }));

    const total = builtMilestones.reduce((sum, m) => sum + m.amount, BigInt(0));

    try {
      const id = await createEscrow(
        publicKey,
        freelancer.trim(),
        total,
        token,
        builtMilestones,
        signFn
      );

      await logAction('create_escrow', ESCROW_CONTRACT_ID, {
        client: publicKey,
        freelancer: freelancer.trim(),
        total: total.toString(),
        token,
        milestones: builtMilestones.map((m) => ({
          id: m.id,
          amount: m.amount.toString(),
          description: m.description,
        })),
      }, { escrowId: id.toString() }).catch(() => {});

      setEscrowId(id);
      setStatus('success');
      onSuccess?.(id);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Escrow creation failed';
      setSubmitError(message);
      setStatus('error');
    }
  }

  const isPending = status === 'pending';

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Freelancer address */}
      <div className="flex flex-col gap-1">
        <label htmlFor="ef-freelancer" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Freelancer address
        </label>
        <input
          id="ef-freelancer"
          type="text"
          value={freelancer}
          onChange={(e) => setFreelancer(e.target.value)}
          placeholder="G…"
          aria-invalid={!!fieldErrors.freelancer}
          aria-describedby={fieldErrors.freelancer ? 'ef-freelancer-error' : undefined}
          className={`rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            fieldErrors.freelancer ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
        />
        {fieldErrors.freelancer && (
          <p id="ef-freelancer-error" role="alert" className="text-xs text-red-600 dark:text-red-400">
            {fieldErrors.freelancer}
          </p>
        )}
      </div>

      {/* Milestones */}
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">Milestones</legend>

        {fieldErrors.milestones && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">
            {fieldErrors.milestones}
          </p>
        )}

        {milestones.map((m, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Milestone {i + 1}
              </span>
              {milestones.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMilestone(i)}
                  aria-label={`Remove milestone ${i + 1}`}
                  className="text-xs text-red-500 hover:text-red-700 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1">
              <label htmlFor={`ef-m-desc-${i}`} className="text-xs text-gray-600 dark:text-gray-400">
                Description
              </label>
              <input
                id={`ef-m-desc-${i}`}
                type="text"
                value={m.description}
                onChange={(e) => updateMilestone(i, 'description', e.target.value)}
                placeholder="Describe the deliverable"
                aria-invalid={!!fieldErrors[`m_desc_${i}`]}
                className={`rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  fieldErrors[`m_desc_${i}`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {fieldErrors[`m_desc_${i}`] && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                  {fieldErrors[`m_desc_${i}`]}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1">
              <label htmlFor={`ef-m-amt-${i}`} className="text-xs text-gray-600 dark:text-gray-400">
                Amount ({token})
              </label>
              <input
                id={`ef-m-amt-${i}`}
                type="number"
                min="0"
                step="any"
                value={m.amount}
                onChange={(e) => updateMilestone(i, 'amount', e.target.value)}
                placeholder="0.00"
                aria-invalid={!!fieldErrors[`m_amt_${i}`]}
                className={`rounded-lg border px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  fieldErrors[`m_amt_${i}`] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {fieldErrors[`m_amt_${i}`] && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                  {fieldErrors[`m_amt_${i}`]}
                </p>
              )}
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addMilestone}
          className="self-start text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          + Add milestone
        </button>
      </fieldset>

      {/* Total (computed) */}
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Total:{' '}
        <span className="font-semibold text-gray-900 dark:text-white">
          {milestones
            .reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0)
            .toFixed(7)
            .replace(/\.?0+$/, '')}{' '}
          {token}
        </span>
      </p>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2.5 transition-colors"
      >
        {isPending ? 'Creating escrow…' : 'Create Escrow'}
      </button>

      {status === 'success' && escrowId !== null && (
        <p role="status" className="text-sm text-green-600 dark:text-green-400">
          Escrow created (ID: {escrowId.toString()}).
        </p>
      )}
      {status === 'error' && submitError && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {submitError}
        </p>
      )}
    </form>
  );
}
