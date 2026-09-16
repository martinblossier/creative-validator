import { NextRequest, NextResponse } from 'next/server';
import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { createSession, listSessions } from '@/lib/sessions';
import { extractFolderId } from '@/lib/drive';
import { setClientMeta, type Frequency } from '@/lib/client-meta';

const FREQUENCIES: Frequency[] = ['weekly', 'monthly', 'bimonthly', 'quarterly'];

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
  // client reuse this same endpoint without re-asking for it. Checked against
  // existing sessions (not client-meta) so clients created before this field
  // existed aren't asked again on every new cycle.
  const isNewClient = !(await listSessions()).some((s) => s.clientName === clientName);
  if (isNewClient) {
    const recurrence = body?.recurrence;
    if (recurrence !== 'recurrent' && recurrence !== 'one_shot') {
      return NextResponse.json(
        { error: 'Merci de préciser si ce client est récurrent ou one shot.' },
        { status: 400 }
      );
    }

    if (recurrence === 'recurrent') {
      const frequency = body?.frequency;
      const referenceDate = typeof body?.referenceDate === 'string' ? body.referenceDate : '';
      if (!FREQUENCIES.includes(frequency) || !referenceDate) {
        return NextResponse.json(
          { error: 'Merci de préciser la fréquence et la date de référence pour un client récurrent.' },
          { status: 400 }
        );
      }
      await setClientMeta(clientName, { recurrence, frequency, referenceDate });
    } else {
      const value = Number(body?.value);
      if (!Number.isFinite(value) || value <= 0) {
        return NextResponse.json(
          { error: 'Merci de préciser la valeur associée pour un client one shot.' },
          { status: 400 }
        );
      }
      await setClientMeta(clientName, { recurrence, value });
    }
  }

  const session = await createSession(clientName, driveFolderId);
  return NextResponse.json({ session });
}
