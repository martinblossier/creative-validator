import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getSession, listSessions } from '@/lib/sessions';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 });

  const rawDirect = await kv.get(`session:${token}`);
  const isInIndex = await kv.sismember('sessions:index', token);
  const session = await getSession(token); // triggers self-heal
  const isInIndexAfter = await kv.sismember('sessions:index', token);
  const allSessions = await listSessions();

  return NextResponse.json({
    rawDirect,
    isInIndexBefore: isInIndex,
    sessionViaGetSession: session,
    isInIndexAfter,
    allSessionsClientNames: allSessions.map((s) => ({ token: s.token, clientName: s.clientName })),
  });
}
