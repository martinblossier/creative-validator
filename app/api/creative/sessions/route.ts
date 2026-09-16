import { NextRequest, NextResponse } from 'next/server';
import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { createSession } from '@/lib/sessions';
import { extractFolderId } from '@/lib/drive';
import { getClientMeta, setClientMeta } from '@/lib/client-meta';

export async function POST(req: NextRequest) {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const clientName = typeof body?.clientName === 'string' ? body.clientName.trim() : '';
  const driveFolderUrl = typeof body?.driveFolderUrl === 'string' ? body.driveFolderUrl.trim() : '';

  if (!clientName || !driveFolderUrl) {
    return NextResponse.json(
      { error: 'Le nom du client et le lien du dossier Drive sont requis.' },
      { status: 400 }
    );
  }

  const driveFolderId = extractFolderId(driveFolderUrl);
  if (!driveFolderId) {
    return NextResponse.json(
      { error: "Impossible d'extraire un identifiant de dossier Drive valide depuis ce lien." },
      { status: 400 }
    );
  }

  // Recurrence is a one-time, client-level choice: only required (and only
  // written) the first time we see this client — later cycles for the same
  // client reuse this same endpoint without re-asking for it.
  const existingMeta = await getClientMeta(clientName);
  if (!existingMeta) {
    const recurrence = body?.recurrence;
    if (recurrence !== 'recurrent' && recurrence !== 'one_shot') {
      return NextResponse.json(
        { error: 'Merci de préciser si ce client est récurrent ou one shot.' },
        { status: 400 }
      );
    }
    await setClientMeta(clientName, { recurrence });
  }

  const session = await createSession(clientName, driveFolderId);
  return NextResponse.json({ session });
}
