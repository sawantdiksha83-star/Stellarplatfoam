'use client';

/**
 * usePayment — manages payment submission state with retry support.
 * Requirements: 2.7, 12.1
 */

import { useState, useCallback } from 'react';
import { sendPayment } from '../lib/contracts';
import { logAction } from '../lib/auditLog';
import type { SignFn } from '../lib/contracts';

export type PaymentStatus = 'idle' | 'pending' | 'success' | 'error';

export interface PaymentParams {
  from: string;
  to: string;
  amount: bigint;
  token: string;
  signFn: SignFn;
}

export interface PaymentState {
  status: PaymentStatus;
  error: string | null;
  paymentId: bigint | null;
  submit: (params: PaymentParams) => Promise<void>;
  retry: () => Promise<void>;
}

const PAYMENT_CONTRACT_ID = process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ID ?? '';

export function usePayment(): PaymentState {
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<bigint | null>(null);
  const [lastParams, setLastParams] = useState<PaymentParams | null>(null);

  const execute = useCallback(async (params: PaymentParams) => {
    setStatus('pending');
    setError(null);
    setLastParams(params);

    try {
      const id = await sendPayment(
        params.from,
        params.to,
        params.amount,
        params.token,
        params.signFn
      );

      await logAction('send_payment', PAYMENT_CONTRACT_ID, {
        from: params.from,
        to: params.to,
        amount: params.amount.toString(),
        token: params.token,
      }, { paymentId: id.toString() });

      setPaymentId(id);
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      setStatus('error');

      await logAction('send_payment', PAYMENT_CONTRACT_ID, {
        from: params.from,
        to: params.to,
        amount: params.amount.toString(),
        token: params.token,
      }, { error: message }).catch(() => {});
    }
  }, []);

  const submit = useCallback(
    (params: PaymentParams) => execute(params),
    [execute]
  );

  // Retry resubmits the last attempted params (Req 2.7)
  const retry = useCallback(async () => {
    if (!lastParams) return;
    await execute(lastParams);
  }, [execute, lastParams]);

  return { status, error, paymentId, submit, retry };
}
