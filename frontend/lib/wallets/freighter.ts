/**
 * Freighter browser extension wallet adapter.
 * Uses the official @stellar/freighter-api package.
 */

import {
  isConnected,
  requestAccess,
  signTransaction,
} from '@stellar/freighter-api';

/**
 * Returns true if the Freighter browser extension is installed.
 */
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const result = await isConnected();
    if (result.error) return false;
    return result.isConnected;
  } catch {
    return false;
  }
}

/**
 * Requests the user's public key from the Freighter extension.
 * This will trigger the permission popup if not already granted.
 */
export async function getFreighterPublicKey(): Promise<string> {
  const connectedResult = await isConnected();
  if (connectedResult.error || !connectedResult.isConnected) {
    throw new Error(
      'Freighter wallet extension is not installed. Please install it from https://freighter.app'
    );
  }

  // Request access - this will trigger the permission popup
  const accessResult = await requestAccess();
  if (accessResult.error) {
    throw new Error(accessResult.error.message || 'Failed to get permission from Freighter');
  }

  if (!accessResult.address) {
    throw new Error('No address returned from Freighter');
  }

  return accessResult.address;
}

/**
 * Signs a Stellar transaction XDR using the Freighter extension.
 */
export async function signTransactionFreighter(
  xdr: string,
  network: string
): Promise<string> {
  const connectedResult = await isConnected();
  if (connectedResult.error || !connectedResult.isConnected) {
    throw new Error(
      'Freighter wallet extension is not installed. Please install it from https://freighter.app'
    );
  }

  const signResult = await signTransaction(xdr, {
    networkPassphrase: network,
  });

  if (signResult.error) {
    throw new Error(signResult.error.message || 'Failed to sign transaction');
  }

  return signResult.signedTxXdr;
}
