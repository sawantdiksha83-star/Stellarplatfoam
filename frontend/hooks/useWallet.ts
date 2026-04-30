'use client';

/**
 * useWallet — manages wallet connection state, balances, and XLM/USD rate.
 * Requirements: 1.1, 1.3, 1.4, 1.5, 11.1, 11.2, 13.3
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  isFreighterInstalled,
  getFreighterPublicKey,
  signTransactionFreighter,
} from '../lib/wallets/freighter';
import {
  getAlbedoPublicKey,
  signTransactionAlbedo,
} from '../lib/wallets/albedo';
import { fetchAccountBalances } from '../lib/stellar';
import type { SignFn } from '../lib/contracts';

export type WalletType = 'freighter' | 'albedo';

export interface Balance {
  asset: string;
  balance: string;
}

export interface WalletState {
  publicKey: string | null;
  walletType: WalletType | null;
  balances: Balance[];
  xlmUsdRate: number | null;
  isConnecting: boolean;
  isInitialized: boolean;
  error: string | null;
  connect: (walletType: WalletType) => Promise<void>;
  disconnect: () => void;
  signFn: SignFn | null;
}

const LS_PUBLIC_KEY = 'wallet_public_key';
const LS_WALLET_TYPE = 'wallet_type';
const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd';

function makeSignFn(walletType: WalletType): SignFn {
  if (walletType === 'freighter') return signTransactionFreighter;
  return signTransactionAlbedo;
}

export function useWallet(): WalletState {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [xlmUsdRate, setXlmUsdRate] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch balances for a given public key
  const loadBalances = useCallback(async (pk: string) => {
    try {
      const result = await fetchAccountBalances(pk);
      setBalances(result);
    } catch {
      setBalances([]);
    }
  }, []);

  // Fetch XLM/USD rate from CoinGecko; on error set null (Req 11.2)
  const loadXlmRate = useCallback(async () => {
    // E2E test mock support
    if (typeof window !== 'undefined' && (window as any).__mocks__?.xlmUsdRate !== undefined) {
      setXlmUsdRate((window as any).__mocks__.xlmUsdRate);
      return;
    }
    try {
      const res = await fetch(COINGECKO_URL);
      if (!res.ok) throw new Error('Rate fetch failed');
      const data = await res.json();
      setXlmUsdRate(data?.stellar?.usd ?? null);
    } catch {
      setXlmUsdRate(null);
    }
  }, []);

  // On mount: restore session from localStorage (Req 1.5, 13.3)
  useEffect(() => {
    const storedKey = localStorage.getItem(LS_PUBLIC_KEY);
    const storedType = localStorage.getItem(LS_WALLET_TYPE) as WalletType | null;
    if (storedKey && storedType) {
      setPublicKey(storedKey);
      setWalletType(storedType);
      loadBalances(storedKey);
    }
    loadXlmRate();
    setIsInitialized(true);
  }, [loadBalances, loadXlmRate]);

  const connect = useCallback(
    async (type: WalletType) => {
      setIsConnecting(true);
      setError(null);
      try {
        let pk: string;
        if (type === 'freighter') {
          const installed = await isFreighterInstalled();
          if (!installed) {
            throw new Error(
              'Freighter wallet extension is not installed. Please install it from https://freighter.app'
            );
          }
          pk = await getFreighterPublicKey();
        } else {
          pk = await getAlbedoPublicKey();
        }

        setPublicKey(pk);
        setWalletType(type);
        localStorage.setItem(LS_PUBLIC_KEY, pk);
        localStorage.setItem(LS_WALLET_TYPE, type);

        await loadBalances(pk);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Wallet connection failed');
      } finally {
        setIsConnecting(false);
      }
    },
    [loadBalances]
  );

  // Disconnect: clear all state and localStorage (Req 1.5)
  const disconnect = useCallback(() => {
    setPublicKey(null);
    setWalletType(null);
    setBalances([]);
    setError(null);
    localStorage.removeItem(LS_PUBLIC_KEY);
    localStorage.removeItem(LS_WALLET_TYPE);
  }, []);

  const signFn = useMemo(
    () => (walletType ? makeSignFn(walletType) : null),
    [walletType]
  );

  return {
    publicKey,
    walletType,
    balances,
    xlmUsdRate,
    isConnecting,
    isInitialized,
    error,
    connect,
    disconnect,
    signFn,
  };
}
