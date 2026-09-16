import { google, sheets_v4 } from 'googleapis';
import { getGoogleAuth } from './google-auth';
import { STATUS_VALIDATED, STATUS_REJECTED } from './status';

const HEADERS = [
  'Nom de la créa',
  'Nom du fichier',
  'Statut',
  'Commentaire',
  'Lien Drive',
  'Date de décision',
  'Batch',
];

export { STATUS_VALIDATED, STATUS_REJECTED };

export type SheetRow = {
  creativeName: string;
  fileName: string;
  status: typeof STATUS_VALIDATED | typeof STATUS_REJECTED;
  comment: string;
  driveLink: string;
  decisionDate: string; // DD/MM/YYYY HH:mm
  batch: string; // e.g. "V1"
};

/** Parses a "DD/MM/YYYY HH:mm" string back into a Date, or null if invalid. */
export function parseDecisionDate(value: string): Date | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, min] = match;
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
}

function getSheetsClient() {
  const auth = getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}

/** Formats a Date as DD/MM/YYYY HH:mm */
export function formatDecisionDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/**
 * Ensures a tab exists for the given client name. Creates it (with bold
 * headers + conditional formatting rules) if it doesn't exist yet.
 * Returns the numeric sheetId of the tab.
 */
async function ensureClientTab(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabName: string
): Promise<number> {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === tabName
  );

  if (existing?.properties?.sheetId != null) {
    await ensureBatchColumnHeader(sheets, spreadsheetId, tabName);
    return existing.properties.sheetId;
  }

  // Create the new tab
  const addSheetRes = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: tabName,
              gridProperties: { frozenRowCount: 1 },
            },
          },
        },
      ],
    },
  });

  const sheetId =
    addSheetRes.data.replies?.[0].addSheet?.properties?.sheetId;
  if (sheetId == null) {
    throw new Error(`Failed to create sheet tab "${tabName}"`);
  }

  // Write header row
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!A1:G1`,
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] },
  });

  // Bold headers + conditional formatting rules
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: HEADERS.length,
            },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true },
              },
            },
            fields: 'userEnteredFormat.textFormat.bold',
          },
        },
        {
          addConditionalFormatRule: {
            index: 0,
            rule: {
              ranges: [
                {
                  sheetId,
                  startRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: HEADERS.length,
                },
              ],
              booleanRule: {
                condition: {
                  type: 'CUSTOM_FORMULA',
                  values: [{ userEnteredValue: `=$C2="${STATUS_VALIDATED}"` }],
                },
                format: {
                  backgroundColor: hexToRgb('#9CF694'),
                },
              },
            },
          },
        },
        {
          addConditionalFormatRule: {
            index: 0,
            rule: {
              ranges: [
                {
                  sheetId,
                  startRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: HEADERS.length,
                },
              ],
              booleanRule: {
                condition: {
                  type: 'CUSTOM_FORMULA',
                  values: [{ userEnteredValue: `=$C2="${STATUS_REJECTED}"` }],
                },
                format: {
                  backgroundColor: hexToRgb('#FF4444'),
                  textFormat: { foregroundColor: hexToRgb('#FFFFFF') },
                },
              },
            },
          },
        },
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: HEADERS.length,
            },
          },
        },
      ],
    },
  });

  return sheetId;
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '');
  return {
    red: parseInt(clean.slice(0, 2), 16) / 255,
    green: parseInt(clean.slice(2, 4), 16) / 255,
    blue: parseInt(clean.slice(4, 6), 16) / 255,
  };
}

/**
 * Non-destructive migration for tabs created before the "Batch" column
 * existed: only labels column G if it's still blank. Never touches
 * existing data in A:F, so already-logged rows stay perfectly aligned.
 */
async function ensureBatchColumnHeader(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabName: string
): Promise<void> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!G1`,
  });
  const hasHeader = Boolean(res.data.values?.[0]?.[0]?.toString().trim());
  if (hasHeader) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!G1`,
    valueInputOption: 'RAW',
    requestBody: { values: [['Batch']] },
  });
}

/**
 * Appends a review decision row to the client's tab, creating the tab
 * (with header row + conditional formatting) if needed.
 */
export async function appendReviewRow(
  spreadsheetId: string,
  clientName: string,
  row: SheetRow
): Promise<void> {
  const sheets = getSheetsClient();
  const tabName = sanitizeTabName(clientName);

  await ensureClientTab(sheets, spreadsheetId, tabName);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:G`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [
        [
          row.creativeName,
          row.fileName,
          row.status,
          row.comment,
          row.driveLink,
          row.decisionDate,
          row.batch,
        ],
      ],
    },
  });
}

/**
 * Reads all logged review rows for a client's tab. Returns an empty array
 * if the tab doesn't exist yet (client with no reviewed creatives).
 */
export async function getClientRows(
  spreadsheetId: string,
  clientName: string
): Promise<SheetRow[]> {
  const sheets = getSheetsClient();
  const tabName = sanitizeTabName(clientName);

  let values: string[][];
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${tabName}!A2:G`,
    });
    values = (res.data.values as string[][]) ?? [];
  } catch (err) {
    console.error(`Sheets read error for tab "${tabName}":`, err);
    return [];
  }

  return values
    .filter((r) => r[0])
    .map((r) => ({
      creativeName: r[0] ?? '',
      fileName: r[1] ?? '',
      status:
        r[2] === STATUS_REJECTED ? STATUS_REJECTED : STATUS_VALIDATED,
      comment: r[3] ?? '',
      driveLink: r[4] ?? '',
      decisionDate: r[5] ?? '',
      batch: r[6]?.trim() || 'V1',
    }));
}

/** Google Sheets tab names can't contain: : \ / ? * [ ] and must be <= 100 chars */
function sanitizeTabName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 100) || 'Client';
}
