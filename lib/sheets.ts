import { google, sheets_v4 } from 'googleapis';
import { getGoogleAuth } from './google-auth';

const HEADERS = [
  'Nom de la créa',
  'Nom du fichier',
  'Statut',
  'Commentaire',
  'Lien Drive',
  'Date de décision',
];

export const STATUS_VALIDATED = 'Validé';
export const STATUS_REJECTED = 'À retravailler';

export type SheetRow = {
  creativeName: string;
  fileName: string;
  status: typeof STATUS_VALIDATED | typeof STATUS_REJECTED;
  comment: string;
  driveLink: string;
  decisionDate: string; // DD/MM/YYYY HH:mm
};

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
    range: `${tabName}!A1:F1`,
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
    range: `${tabName}!A:F`,
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
        ],
      ],
    },
  });
}

/** Google Sheets tab names can't contain: : \ / ? * [ ] and must be <= 100 chars */
function sanitizeTabName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 100) || 'Client';
}
