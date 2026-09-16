import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { getGoogleAuth } from '@/lib/google-auth';

export const runtime = 'nodejs';

/**
 * Streams a Drive file's bytes through our server using the service
 * account's credentials. This is required because the Drive folder is
 * only shared with the service account (not public), so a browser can't
 * fetch drive.google.com URLs directly. Supports Range requests so
 * <video> seeking / scrubbing works correctly.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const { fileId } = params;
  if (!fileId) {
    return NextResponse.json({ error: 'fileId manquant.' }, { status: 400 });
  }

  try {
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });

    const range = req.headers.get('range') ?? undefined;

    const fileRes = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      {
        responseType: 'stream',
        headers: range ? { Range: range } : undefined,
      }
    );

    const upstreamHeaders = fileRes.headers as Record<string, string>;
    const status = range && upstreamHeaders['content-range'] ? 206 : 200;

    const headers = new Headers();
    headers.set('Content-Type', upstreamHeaders['content-type'] ?? 'application/octet-stream');
    headers.set('Cache-Control', 'private, max-age=3600');
    headers.set('Accept-Ranges', 'bytes');
    if (upstreamHeaders['content-range']) {
      headers.set('Content-Range', upstreamHeaders['content-range']);
    }
    if (upstreamHeaders['content-length']) {
      headers.set('Content-Length', upstreamHeaders['content-length']);
    }

    const webStream = Readable.toWeb(
      fileRes.data as Readable
    ) as unknown as ReadableStream;

    return new NextResponse(webStream, { status, headers });
  } catch (err) {
    console.error('Drive file stream error:', err);
    return NextResponse.json(
      { error: "Impossible de charger ce fichier depuis Google Drive." },
      { status: 502 }
    );
  }
}
