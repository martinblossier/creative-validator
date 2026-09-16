import { google } from 'googleapis';

/**
 * Builds a single Google Auth client (JWT) from the service account key
 * stored in GOOGLE_SERVICE_ACCOUNT_KEY. The same service account is used
 * for both the Drive API and the Sheets API.
 */
export function getGoogleAuth() {
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!rawKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable');
  }

  let credentials: { client_email: string; private_key: string };
  try {
    credentials = JSON.parse(rawKey);
  } catch {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. Paste the full service account key as a single-line JSON string.'
    );
  }

  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });
}
