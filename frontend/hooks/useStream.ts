'use client';

/**
 * useStream — SSE connection to /api/events with exponential backoff reconnect.
 * Requirements: 8.1, 8.2, 8.3
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface StreamEvent {
  id: string;
  type: string;
  data: string;
  receivedAt: string;
}

export interface StreamState {
  events: StreamEvent[];
  connectionStatus: ConnectionStatus;
  clearEvents: () => void;
}

const SSE_URL = '/api/events';
const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

export function useStream(): StreamState {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');

  const esRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef(false);

  const clearEvents = useCallback(() => setEvents([]), []);

  const connect = useCallback(() => {
    if (unmountedRef.current) return;

    setConnectionStatus(retryCountRef.current === 0 ? 'connecting' : 'reconnecting');

    const es = new EventSource(SSE_URL);
    esRef.current = es;

    es.onopen = () => {
      if (unmountedRef.current) return;
      retryCountRef.current = 0;
      setConnectionStatus('connected');
    };

    es.onmessage = (e: MessageEvent) => {
      if (unmountedRef.current) return;
      const entry: StreamEvent = {
        id: e.lastEventId || crypto.randomUUID(),
        type: e.type,
        data: e.data,
        receivedAt: new Date().toISOString(),
      };
      setEvents((prev) => [...prev, entry]);
    };

    es.onerror = () => {
      if (unmountedRef.current) return;
      es.close();
      esRef.current = null;
      setConnectionStatus('reconnecting');

      // Exponential backoff: 1s, 2s, 4s, … capped at 30s
      const delay = Math.min(
        BASE_BACKOFF_MS * Math.pow(2, retryCountRef.current),
        MAX_BACKOFF_MS
      );
      retryCountRef.current += 1;

      retryTimerRef.current = setTimeout(() => {
        if (!unmountedRef.current) connect();
      }, delay);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      esRef.current?.close();
      esRef.current = null;
      setConnectionStatus('disconnected');
    };
  }, [connect]);

  return { events, connectionStatus, clearEvents };
}
