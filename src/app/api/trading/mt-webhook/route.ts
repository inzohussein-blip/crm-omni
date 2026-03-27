/**
 * OMNI-CRM MT Webhook Endpoint
 * Receives MT4/MT5 events (via mt-bridge or real MT Manager API)
 * Triggers account sync + IB commission distribution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleMTWebhook } from '@/lib/mt-bridge';
import { parseSecureRequest } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    // Supports encrypted payload: { encrypted: "..." }
    const payload = body?.encrypted ? (parseSecureRequest(body.encrypted) as any) : body;

    const event = payload?.event as string | undefined;
    const data = payload?.data;

    if (!event) {
      return NextResponse.json({ success: false, error: 'Missing event' }, { status: 400 });
    }

    await handleMTWebhook(event, data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('MT webhook error:', error);
    return NextResponse.json({ success: false, error: 'MT webhook failed' }, { status: 500 });
  }
}
