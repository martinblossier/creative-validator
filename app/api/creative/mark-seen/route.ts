import { NextRequest, NextResponse } from 'next/server';
import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { markReadySeen } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const clientName = typeof body?.clientName === 'string' ? body.clientName : '';
  const count = typeof body?.count === 'number' ? body.count : null;

  if (!clientName || count === null) {
    return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
  }

  await markReadySeen(clientName, count);
  return NextResponse.json({ ok: true });
}
