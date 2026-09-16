import { NextRequest, NextResponse } from 'next/server';
import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { getBatchTrackerRows, addBatchTrackerRow } from '@/lib/batch-tracker';

export const revalidate = 60;

export async function GET() {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    return NextResponse.json({ error: 'GOOGLE_SHEET_ID non configuré.' }, { status: 500 });
  }

  const rows = await getBatchTrackerRows(sheetId);
  return NextResponse.json({ rows });
}

export async function POST() {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    return NextResponse.json({ error: 'GOOGLE_SHEET_ID non configuré.' }, { status: 500 });
  }

  const row = await addBatchTrackerRow(sheetId, {
    client: '',
    statut: 'En cours',
    projet: '',
    total: 0,
    creasProduites: 0,
    offre: '',
    dateEnvoiFinal: '',
    statique: 0,
    motion: 0,
    ugc: 0,
    declinaisons: 0,
    facturation: 'Pas facturé',
    sourceToken: '',
  });

  return NextResponse.json({ row });
}
