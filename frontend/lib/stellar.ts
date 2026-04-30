import { SorobanRpc, Horizon } from '@stellar/stellar-sdk';

/**
 * Returns a SorobanRpc.Server instance pointed at the configured RPC URL.
 */
export function getServer(): SorobanRpc.Server {
  const rpcUrl = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
  return new SorobanRpc.Server(rpcUrl);
}

/**
 * Returns a Horizon.Server instance pointed at the configured Horizon URL.
 */
export function getHorizonServer(): Horizon.Server {
  return new Horizon.Server(process.env.NEXT_PUBLIC_HORIZON_URL!);
}

/**
 * Fetches all balances for a given Stellar public key.
 * @returns Array of { asset, balance } where asset is "XLM" or "CODE:ISSUER"
 */
export async function fetchAccountBalances(
  publicKey: string
): Promise<{ asset: string; balance: string }[]> {
  // E2E test mock support
  if (typeof window !== 'undefined' && (window as any).__mocks__?.fetchAccountBalances) {
    return (window as any).__mocks__.fetchAccountBalances(publicKey);
  }
  try {
    const server = getHorizonServer();
    const account = await server.loadAccount(publicKey);

    return account.balances.map((b) => {
      if (b.asset_type === 'native') {
        return { asset: 'XLM', balance: b.balance };
      }
      const nonNative = b as Horizon.HorizonApi.BalanceLineAsset;
      return {
        asset: `${nonNative.asset_code}:${nonNative.asset_issuer}`,
        balance: b.balance,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Fetches paginated transaction history for a given Stellar public key.
 * @param publicKey - The Stellar public key to query
 * @param cursor - Optional paging cursor; defaults to fetching from the latest
 * @returns { records, nextCursor } where nextCursor is the last record's paging_token or null
 */
export async function fetchTransactionHistory(
  publicKey: string,
  cursor?: string
): Promise<{ records: any[]; nextCursor: string | null }> {
  // E2E test mock support
  if (typeof window !== 'undefined' && (window as any).__mocks__?.fetchTransactionHistory) {
    return (window as any).__mocks__.fetchTransactionHistory(publicKey, cursor);
  }
  const server = getHorizonServer();
  const page = await server
    .transactions()
    .forAccount(publicKey)
    .cursor(cursor ?? 'now')
    .order('desc')
    .limit(20)
    .call();

  const records = page.records;
  const nextCursor =
    records.length > 0 ? records[records.length - 1].paging_token : null;

  return { records, nextCursor };
}

/**
 * Truncates a Stellar address to the first 4 and last 4 characters.
 * e.g. "GABCDEFG...WXYZ"
 */
export function truncateAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Converts stroops (1/10,000,000 XLM) to XLM as a string.
 * @param stroops - Amount in stroops
 * @returns XLM amount string with up to 7 decimal places
 */
export function stroopsToXlm(stroops: string | number | bigint): string {
  const value = BigInt(stroops);
  const divisor = BigInt(10_000_000);
  const whole = value / divisor;
  const remainder = value % divisor;
  const decimal = remainder.toString().padStart(7, '0');
  // Trim trailing zeros but keep at least one decimal place
  const trimmed = decimal.replace(/0+$/, '') || '0';
  return `${whole}.${trimmed}`;
}

/**
 * Converts XLM to stroops (1/10,000,000 XLM) as an integer string.
 * @param xlm - Amount in XLM
 * @returns Stroops amount as an integer string
 */
export function xlmToStroops(xlm: string | number): string {
  const [whole, decimal = ''] = String(xlm).split('.');
  const paddedDecimal = decimal.slice(0, 7).padEnd(7, '0');
  const stroops = BigInt(whole) * BigInt(10_000_000) + BigInt(paddedDecimal);
  return stroops.toString();
}
