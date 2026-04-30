/**
 * IndexedDB-backed audit log for all user-initiated contract interactions.
 * Persists across browser sessions until explicitly cleared.
 * Requirements: 12.1, 12.2
 */

const DB_NAME = 'stellar-freelance';
const STORE_NAME = 'audit-log';
const DB_VERSION = 1;

export interface AuditEntry {
  id?: number;
  action: string;
  contractAddress: string;
  params: Record<string, unknown>;
  result: unknown;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// DB initialisation (lazy singleton)
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Write a timestamped audit entry to IndexedDB.
 * Requirements: 12.1
 */
export async function logAction(
  action: string,
  contractAddress: string,
  params: Record<string, unknown>,
  result: unknown
): Promise<void> {
  const db = await openDb();
  const entry: AuditEntry = {
    action,
    contractAddress,
    params,
    result,
    timestamp: new Date().toISOString(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Return all audit log entries, oldest first.
 * Requirements: 12.2
 */
export async function getAuditLog(): Promise<AuditEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as AuditEntry[]);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete all audit log entries.
 * Requirements: 12.2
 */
export async function clearAuditLog(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
