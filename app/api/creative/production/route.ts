import { NextRequest, NextResponse } from 'next/server';
import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { updateReviewRow } from '@/lib/sheets';
import { PRODUCTION_STATUSES } from '@/lib/production-status';

export async function POST(req: NextRequest) {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const clientName = typeof body?.clientName === 'string' ? body.clientName : '';
  const fileName = typeof body?.fileName === 'string' ? body.fileName : '';
  const batch = typeof body?.batch === 'string' ? body.batch : '';

  if (!clientName || !fileName || !batch) {
    return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    return NextResponse.json({ error: 'GOOGLE_SHEET_ID non configuré.' }, { status: 500 });
  }

  const patch: {
    assignedTo?: string;
    productionStatus?: (typeof PRODUCTION_STATUSES)[number];
    newVersionLink?: string;
  } = {};

  if ('assignedTo' in body) {
    patch.assignedTo = typeof body.assignedTo === 'string' ? body.assignedTo : '';
  }

  if ('productionStatus' in body) {
    if (!PRODUCTION_STATUSES.includes(body.productionStatus)) {
      return NextResponse.json({ error: 'Statut production invalide.' }, { status: 400 });
    }
    patch.productionStatus = body.productionStatus;
  }

  if ('newVersionLink' in body) {
    patch.newVersionLink = typeof body.newVersionLink === 'string' ? body.newVersionLink.trim() : '';
  }

  try {
    const updated = await updateReviewRow(sheetId, clientName, { fileName, batch }, patch);
    if (!updated) {
      return NextResponse.json({ error: 'Créa introuvable.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Sheets production update error:', err);
    return NextResponse.json(
      { error: "Impossible de mettre à jour Google Sheets." },
      { status: 502 }
    );
  }
}
