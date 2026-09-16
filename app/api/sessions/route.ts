import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { createSession, listSessions } from '@/lib/sessions';
import { extractFolderId } from '@/lib/drive';

export async function GET() {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const sessions = await listSessions();
  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated()) {
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

  const session = await createSession(clientName, driveFolderId);
  return NextResponse.json({ session });
}
