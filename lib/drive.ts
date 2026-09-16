import { google } from 'googleapis';
import { getGoogleAuth } from './google-auth';

export type DriveCreative = {
  id: string;
  name: string;
  mimeType: string;
  kind: 'image' | 'video';
  viewUrl: string;
  streamUrl: string;
};

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
]);

const VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime', // .mov
  'video/webm',
]);

/**
 * Extracts a Google Drive folder ID from any common folder URL format,
 * or returns the input as-is if it already looks like a raw folder ID.
 */
export function extractFolderId(input: string): string | null {
  const trimmed = input.trim();

  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/, // https://drive.google.com/drive/folders/<id>
    /[?&]id=([a-zA-Z0-9_-]+)/, // https://drive.google.com/open?id=<id>
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  // Looks like a bare folder ID already (no slashes/protocol)
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Lists all image/video files directly inside a Drive folder (no
 * subfolders), sorted alphabetically by file name.
 */
export async function listFolderCreatives(
  folderId: string
): Promise<DriveCreative[]> {
  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  const allowedMimeTypes = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES];
  const mimeQuery = allowedMimeTypes
    .map((mime) => `mimeType = '${mime}'`)
    .join(' or ');

  const files: DriveCreative[] = [];
  let pageToken: string | undefined;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false and (${mimeQuery})`,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: 200,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    for (const file of res.data.files ?? []) {
      if (!file.id || !file.name || !file.mimeType) continue;
      const kind: 'image' | 'video' = IMAGE_MIME_TYPES.has(file.mimeType)
        ? 'image'
        : 'video';

      files.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        kind,
        viewUrl: `https://drive.google.com/file/d/${file.id}/view`,
        streamUrl: `/api/drive/file/${file.id}`,
      });
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  files.sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));

  return files;
}
