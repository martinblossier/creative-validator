import { NextRequest, NextResponse } from 'next/server';
import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { setAgendaOverride } from '@/lib/agenda-overrides';

export async function POST(req: NextRequest) {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const clientName = typeof body?.clientName === 'string' ? body.clientName : '';
  const originalDate = typeof body?.originalDate === 'string' ? body.originalDate : '';
  const overrideDate = typeof body?.overrideDate === 'string' ? body.overrideDate : '';

  if (!clientName || !originalDate || !overrideDate) {
    return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
  }

  await setAgendaOverride(clientName, originalDate, overrideDate);
  return NextResponse.json({ ok: true });
}
