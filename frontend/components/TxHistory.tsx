'use client';

/**
 * TxHistory — paginated, filterable transaction history table with CSV export.
 * Requirements: 7.1, 7.2, 7.3
 */

import { useState, useMemo, useCallback } from 'react';
import { truncateAddress } from '../lib/stellar';

export interface TxRecord {
  paymentId: string;
  sender: string;
  recipient: string;
  amount: string;
  asset: string;
  status: string;
}

interface TxHistoryProps {
  records: TxRecord[];
  pageSize?: number;
}

const PAGE_SIZE_DEFAULT = 20;

export default function TxHistory({ records, pageSize = PAGE_SIZE_DEFAULT }: TxHistoryProps) {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);

  // Filter within 500ms — synchronous filter on state change satisfies the requirement
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        r.paymentId.toLowerCase().includes(q) ||
        r.sender.toLowerCase().includes(q) ||
        r.recipient.toLowerCase().includes(q) ||
        r.asset.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [records, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
    setPage(0);
  }, []);

  function exportCsv() {
    const header = ['Payment ID', 'Sender', 'Recipient', 'Amount', 'Asset', 'Status'];
    const rows = filtered.map((r) => [
      r.paymentId,
      r.sender,
      r.recipient,
      r.amount,
      r.asset,
      r.status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        <input
          type="search"
          value={filter}
          onChange={handleFilterChange}
          placeholder="Filter by ID, address, asset, status…"
          aria-label="Filter transactions"
          className="input w-full sm:w-72"
        />
        <button
          type="button"
          onClick={exportCsv}
          className="px-4 py-2 rounded-xl border-2 border-indigo-500 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all transform hover:scale-105 text-sm font-medium whitespace-nowrap"
        >
          📥 Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 text-gray-700 dark:text-gray-300 text-xs uppercase tracking-wide">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-semibold">Payment ID</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">Sender</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">Recipient</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Amount</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">Asset</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-400 dark:text-gray-500">No transactions found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.paymentId} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {r.paymentId}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                      <span title={r.sender}>{truncateAddress(r.sender)}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                      <span title={r.recipient}>{truncateAddress(r.recipient)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-200">
                      {r.amount}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{r.asset}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">
            Page {currentPage + 1} of {totalPages} <span className="text-gray-400">({filtered.length} results)</span>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all transform hover:scale-105 disabled:transform-none font-medium"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 transition-all transform hover:scale-105 disabled:transform-none font-medium"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const classes =
    s === 'confirmed'
      ? 'badge-success'
      : s === 'sent'
      ? 'badge'
      : s === 'failed'
      ? 'badge-error'
      : 'badge';

  return (
    <span className={`${classes}`}>
      {s === 'confirmed' && '✓ '}
      {s === 'failed' && '✗ '}
      {status}
    </span>
  );
}
