import { NextRequest, NextResponse } from 'next/server';
import { getSession, setTotalCreatives } from '@/lib/sessions';
import { listFolderCreatives } from '@/lib/drive';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Token manquant.' }, { status: 400 });
  }

  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: 'Session introuvable ou expirée.' }, { status: 404 });
  }

  try {
    const creatives = await listFolderCreatives(session.driveFolderId);
    await setTotalCreatives(token, creatives.length);

    return NextResponse.json({
      clientName: session.clientName,
      creatives,
    });
  } catch (err) {
    console.error('Drive fetch error:', err);
    return NextResponse.json(
      {
        error:
          "Impossible de récupérer les créas depuis Google Drive. Vérifiez que le dossier est bien partagé avec le compte de service et qu'il contient des fichiers.",
      },
      { status: 502 }
    );
  }
}
