// TODO: run `npm install albedo-link` to enable Albedo wallet support

/**
 * Albedo web-based wallet adapter.
 * Albedo communicates via a popup window using the albedo.id service.
 * Install the `albedo-link` package to enable full support.
 * When `window.albedo` is injected (e.g. in tests), it is used directly.
 */

class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

function getAlbedo(): any | null {
  if (typeof window !== 'undefined' && (window as any).albedo) {
    return (window as any).albedo;
  }
  return null;
}

/**
 * Requests the user's public key via the Albedo web wallet.
 * Uses window.albedo if available, otherwise throws NotImplementedError.
 * @throws {NotImplementedError} until albedo-link is installed and integrated
 */
export async function getAlbedoPublicKey(): Promise<string> {
  const albedo = getAlbedo();
  if (albedo) {
    const result = await albedo.publicKey({});
    return result.pubkey;
  }
  throw new NotImplementedError(
    'Albedo wallet is not available. Run `npm install albedo-link` to enable Albedo support.'
  );
}

/**
 * Signs a Stellar transaction XDR using the Albedo web wallet.
 * Uses window.albedo if available, otherwise throws NotImplementedError.
 * @param xdr - The base64-encoded XDR of the transaction to sign
 * @param network - The Stellar network passphrase
 * @throws {NotImplementedError} until albedo-link is installed and integrated
 */
export async function signTransactionAlbedo(
  xdr: string,
  network: string
): Promise<string> {
  const albedo = getAlbedo();
  if (albedo) {
    const result = await albedo.tx({ xdr, network_passphrase: network, submit: false });
    return result.signed_envelope_xdr;
  }
  // Suppress unused parameter warnings until implementation is complete
  void xdr;
  void network;
  throw new NotImplementedError(
    'Albedo wallet is not available. Run `npm install albedo-link` to enable Albedo support.'
  );
}
