import { NextRequest, NextResponse } from 'next/server';
import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { setBatchDeadline } from '@/lib/sheets';

export async function POST(req: NextRequest) {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const clientName = typeof body?.clientName === 'string' ? body.clientName : '';
  const batch = typeof body?.batch === 'string' ? body.batch : '';
  const deadline = typeof body?.deadline === 'string' ? body.deadline : '';

  if (!clientName || !batch || !deadline) {
    return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    return NextResponse.json({ error: 'GOOGLE_SHEET_ID non configuré.' }, { status: 500 });
  }

  try {
    const count = await setBatchDeadline(sheetId, clientName, batch, deadline);
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    console.error('Sheets deadline update error:', err);
    return NextResponse.json(
      { error: "Impossible de mettre à jour Google Sheets." },
      { status: 502 }
    );
  }
}
