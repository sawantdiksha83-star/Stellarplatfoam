'use client';

/**
 * ActivityFeed — renders live contract events from useStream.
 * Shows a reconnecting indicator when the SSE connection is not active.
 * Requirements: 8.2, 8.3
 */

import { useStream } from '../hooks/useStream';
import type { StreamEvent, ConnectionStatus } from '../hooks/useStream';

function StatusDot({ status }: { status: ConnectionStatus }) {
  const label =
    status === 'connected'
      ? 'Connected'
      : status === 'connecting'
      ? 'Connecting…'
      : status === 'reconnecting'
      ? 'Reconnecting…'
      : 'Disconnected';

  const dotClass =
    status === 'connected'
      ? 'bg-green-500'
      : status === 'reconnecting' || status === 'connecting'
      ? 'bg-yellow-400 animate-pulse'
      : 'bg-red-500';

  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
      <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function EventRow({ event }: { event: StreamEvent }) {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(event.data);
  } catch {
    // not JSON — display raw
  }

  return (
    <li className="flex flex-col gap-0.5 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors rounded-lg px-2 -mx-2">
      <div className="flex items-center justify-between gap-2">
        <span className="badge text-xs">
          {event.type}
        </span>
        <time
          dateTime={event.receivedAt}
          className="text-xs text-gray-400 dark:text-gray-500 shrink-0"
        >
          {new Date(event.receivedAt).toLocaleTimeString()}
        </time>
      </div>
      <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-all bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 mt-1">
        {parsed ? JSON.stringify(parsed, null, 2) : event.data}
      </pre>
    </li>
  );
}

interface ActivityFeedProps {
  /** Max number of events to display (newest first) */
  maxEvents?: number;
}

export default function ActivityFeed({ maxEvents = 50 }: ActivityFeedProps) {
  const { events, connectionStatus, clearEvents } = useStream();

  const displayed = events.slice(-maxEvents).reverse();

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 border border-cyan-200 dark:border-cyan-800">
        <StatusDot status={connectionStatus} />
        {events.length > 0 && (
          <button
            type="button"
            onClick={clearEvents}
            className="px-3 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all transform hover:scale-105"
          >
            🗑️ Clear
          </button>
        )}
      </div>

      {/* Reconnecting banner */}
      {(connectionStatus === 'reconnecting' || connectionStatus === 'disconnected') && (
        <div
          role="status"
          className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-2 animate-fade-in-up"
        >
          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {connectionStatus === 'reconnecting'
            ? 'Connection lost — attempting to reconnect…'
            : 'Disconnected from event stream.'}
        </div>
      )}

      {/* Event list */}
      {displayed.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-100 to-teal-100 dark:from-cyan-900/30 dark:to-teal-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-cyan-500 dark:text-cyan-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Waiting for events…
          </p>
        </div>
      ) : (
        <div className="card p-4">
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {displayed.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
