import { NextRequest, NextResponse } from 'next/server';
import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { deleteSessionsForClient } from '@/lib/sessions';
import { deleteClientMeta } from '@/lib/client-meta';
import { deleteSeenReady } from '@/lib/notifications';
import { deleteAgendaOverrides } from '@/lib/agenda-overrides';
import { deleteClientTab } from '@/lib/sheets';
import { deleteBatchTrackerRowsForClient } from '@/lib/batch-tracker';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { clientName: string } }
) {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const clientName = decodeURIComponent(params.clientName);
  if (!clientName) {
    return NextResponse.json({ error: 'Nom de client manquant.' }, { status: 400 });
  }

  const deleteSheet = req.nextUrl.searchParams.get('deleteSheet') === 'true';
  const sheetId = process.env.GOOGLE_SHEET_ID;

  const removedSessions = await deleteSessionsForClient(clientName);
  await deleteClientMeta(clientName);
  await deleteSeenReady(clientName);
  await deleteAgendaOverrides(clientName);

  let removedBatchTrackerRows = 0;
  let removedSheetTab = false;

  if (sheetId) {
    removedBatchTrackerRows = await deleteBatchTrackerRowsForClient(sheetId, clientName);
    if (deleteSheet) {
      removedSheetTab = await deleteClientTab(sheetId, clientName);
    }
  }

  return NextResponse.json({
    ok: true,
    removedSessions,
    removedBatchTrackerRows,
    removedSheetTab,
  });
}
