import { NextRequest, NextResponse } from 'next/server';
import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { updateBatchTrackerRow, deleteBatchTrackerRow } from '@/lib/batch-tracker';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    return NextResponse.json({ error: 'GOOGLE_SHEET_ID non configuré.' }, { status: 500 });
  }

  const patch = await req.json().catch(() => null);
  if (!patch) {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400 });
  }

  const ok = await updateBatchTrackerRow(sheetId, params.id, patch);
  if (!ok) {
    return NextResponse.json({ error: 'Ligne introuvable.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    return NextResponse.json({ error: 'GOOGLE_SHEET_ID non configuré.' }, { status: 500 });
  }

  const ok = await deleteBatchTrackerRow(sheetId, params.id);
  if (!ok) {
    return NextResponse.json({ error: 'Ligne introuvable.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
