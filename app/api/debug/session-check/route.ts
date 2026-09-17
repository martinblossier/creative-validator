import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? 'rrCtVnJsolhl';

  // Via @vercel/kv (uses cache: "default" internally, which may be memoized
  // by Next's Data Cache across requests/deployments)
  const viaKvLib = await kv.smembers('sessions:index');

  // Raw REST call to Upstash bypassing @vercel/kv entirely, forcing no-store
  const url = process.env.KV_REST_API_URL;
  const token_ = process.env.KV_REST_API_TOKEN;
  let viaRawFetch: unknown = null;
  if (url && token_) {
    const res = await fetch(`${url}/smembers/sessions:index`, {
      headers: { Authorization: `Bearer ${token_}` },
      cache: 'no-store',
    });
    viaRawFetch = await res.json();
  }

  return NextResponse.json({
    tokenChecked: token,
    viaKvLib,
    viaRawFetch,
    timestamp: new Date().toISOString(),
  });
}
