import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { getGoogleAuth } from '@/lib/google-auth';
import { isCreativeAuthenticated } from '@/lib/creative-auth';

export const runtime = 'nodejs';

/**
 * Streams a Drive file's bytes as a forced download through our server
 * using the service account's credentials — the browser never sees a
 * drive.google.com URL, and files stay private to the service account.
 */
export async function GET(req: NextRequest) {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const fileId = req.nextUrl.searchParams.get('fileId');
  const fileName = req.nextUrl.searchParams.get('fileName') ?? 'creative';
  if (!fileId) {
    return NextResponse.json({ error: 'fileId manquant.' }, { status: 400 });
  }

  try {
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });

    const fileRes = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );

    const upstreamHeaders = fileRes.headers as Record<string, string>;
    const safeName = fileName.replace(/["\r\n]/g, '');

    const headers = new Headers();
    headers.set('Content-Type', upstreamHeaders['content-type'] ?? 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${safeName}"`);
    if (upstreamHeaders['content-length']) {
      headers.set('Content-Length', upstreamHeaders['content-length']);
    }

    const webStream = Readable.toWeb(fileRes.data as Readable) as unknown as ReadableStream;

    return new NextResponse(webStream, { status: 200, headers });
  } catch (err) {
    console.error('Drive download error:', err);
    return NextResponse.json(
      { error: "Impossible de télécharger ce fichier depuis Google Drive." },
      { status: 502 }
    );
  }
}
