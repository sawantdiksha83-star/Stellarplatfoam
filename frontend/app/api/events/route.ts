/**
 * SSE API route — proxies Horizon transaction stream to the client.
 * Requirements: 8.1, 8.2
 */

import { NextRequest } from 'next/server';

export const runtime = 'edge';

const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get('address');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string, event?: string) => {
        let chunk = '';
        if (event) chunk += `event: ${event}\n`;
        chunk += `data: ${data}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      };

      if (!address) {
        send(JSON.stringify({ error: 'address query param required' }), 'error');
        controller.close();
        return;
      }

      const horizonStream = `${HORIZON_URL}/accounts/${address}/transactions?cursor=now`;

      try {
        const upstream = await fetch(horizonStream, {
          headers: { Accept: 'text/event-stream' },
          // @ts-expect-error — duplex required for streaming in some runtimes
          duplex: 'half',
        });

        if (!upstream.ok || !upstream.body) {
          send(JSON.stringify({ error: 'Failed to connect to Horizon' }), 'error');
          controller.close();
          return;
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();

        // Forward raw SSE chunks from Horizon to the client
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
          // Echo decoded text as a parsed event for easier client consumption
          const text = decoder.decode(value, { stream: true });
          const dataMatch = text.match(/^data:\s*(.+)$/m);
          if (dataMatch) {
            send(dataMatch[1].trim(), 'transaction');
          }
        }
      } catch {
        send(JSON.stringify({ error: 'Stream error' }), 'error');
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
