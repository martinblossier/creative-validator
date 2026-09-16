import { google, sheets_v4 } from 'googleapis';
import { getGoogleAuth } from './google-auth';
import { STATUS_VALIDATED, STATUS_REJECTED } from './status';
import { PRODUCTION_STATUSES, type ProductionStatus } from './production-status';

const HEADERS = [
  'Nom de la créa',
  'Nom du fichier',
  'Statut',
  'Commentaire',
  'Lien Drive',
  'Date de décision',
  'Batch',
  'Assigné à',
  'Statut production',
  'Lien nouvelle version',
  'Deadline',
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
  assignedTo: string;
  productionStatus: ProductionStatus | '';
  newVersionLink: string;
  deadline: string; // YYYY-MM-DD
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
    await ensureProductionColumnsHeader(sheets, spreadsheetId, tabName);
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
    range: `${tabName}!A1:K1`,
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
 * Non-destructive migration for tabs created before the production-tracking
 * columns existed: only labels H1:K1 if still blank. Never touches existing
 * data in A:G, so already-logged rows stay perfectly aligned.
 */
async function ensureProductionColumnsHeader(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabName: string
): Promise<void> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!H1:K1`,
  });
  const hasHeader = Boolean(res.data.values?.[0]?.[0]?.toString().trim());
  if (hasHeader) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!H1:K1`,
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS.slice(7)] },
  });
}

/**
 * Appends a review decision row to the client's tab, creating the tab
 * (with header row + conditional formatting) if needed. Rework rows start
 * production tracking at "Non assignée"; validated rows have no production
 * status since nothing needs to be reworked.
 */
export async function appendReviewRow(
  spreadsheetId: string,
  clientName: string,
  row: Pick<
    SheetRow,
    'creativeName' | 'fileName' | 'status' | 'comment' | 'driveLink' | 'decisionDate' | 'batch'
  >
): Promise<void> {
  const sheets = getSheetsClient();
  const tabName = sanitizeTabName(clientName);

  await ensureClientTab(sheets, spreadsheetId, tabName);

  const productionStatus: ProductionStatus | '' =
    row.status === STATUS_REJECTED ? 'Non assignée' : '';

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:K`,
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
          '',
          productionStatus,
          '',
          '',
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
      range: `${tabName}!A2:K`,
    });
    values = (res.data.values as string[][]) ?? [];
  } catch (err) {
    console.error(`Sheets read error for tab "${tabName}":`, err);
    return [];
  }

  return values
    .filter((r) => r[0])
    .map((r) => {
      const status = r[2] === STATUS_REJECTED ? STATUS_REJECTED : STATUS_VALIDATED;
      const rawProductionStatus = r[8]?.trim() ?? '';
      const productionStatus: ProductionStatus | '' = PRODUCTION_STATUSES.includes(
        rawProductionStatus as ProductionStatus
      )
        ? (rawProductionStatus as ProductionStatus)
        : status === STATUS_REJECTED
          ? 'Non assignée'
          : '';

      return {
        creativeName: r[0] ?? '',
        fileName: r[1] ?? '',
        status,
        comment: r[3] ?? '',
        driveLink: r[4] ?? '',
        decisionDate: r[5] ?? '',
        batch: r[6]?.trim() || 'V1',
        assignedTo: r[7] ?? '',
        productionStatus,
        newVersionLink: r[9] ?? '',
        deadline: r[10] ?? '',
      };
    });
}

/**
 * Updates the production-tracking columns (H:K) of a single row, identified
 * by file name + batch within the client's tab. Only the passed fields are
 * changed — existing values for the others are preserved.
 */
export async function updateReviewRow(
  spreadsheetId: string,
  clientName: string,
  match: { fileName: string; batch: string },
  patch: Partial<
    Pick<SheetRow, 'assignedTo' | 'productionStatus' | 'newVersionLink' | 'deadline'>
  >
): Promise<boolean> {
  const sheets = getSheetsClient();
  const tabName = sanitizeTabName(clientName);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A2:K`,
  });
  const values = (res.data.values as string[][]) ?? [];

  const rowIndex = values.findIndex(
    (r) => r[1] === match.fileName && (r[6]?.trim() || 'V1') === match.batch
  );
  if (rowIndex === -1) return false;

  const row = values[rowIndex];
  const rowNumber = rowIndex + 2;

  const merged = [
    patch.assignedTo ?? row[7] ?? '',
    patch.productionStatus ?? row[8] ?? '',
    patch.newVersionLink ?? row[9] ?? '',
    patch.deadline ?? row[10] ?? '',
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tabName}!H${rowNumber}:K${rowNumber}`,
    valueInputOption: 'RAW',
    requestBody: { values: [merged] },
  });

  return true;
}

/**
 * Applies a single deadline to every rework row ("À retravailler") of a
 * given batch in one client tab. Returns the number of rows updated.
 */
export async function setBatchDeadline(
  spreadsheetId: string,
  clientName: string,
  batch: string,
  deadline: string
): Promise<number> {
  const sheets = getSheetsClient();
  const tabName = sanitizeTabName(clientName);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tabName}!A2:K`,
  });
  const values = (res.data.values as string[][]) ?? [];

  const data: sheets_v4.Schema$ValueRange[] = [];
  values.forEach((row, i) => {
    const rowBatch = row[6]?.trim() || 'V1';
    if (rowBatch === batch && row[2] === STATUS_REJECTED) {
      data.push({ range: `${tabName}!K${i + 2}`, values: [[deadline]] });
    }
  });

  if (data.length === 0) return 0;

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: 'RAW', data },
  });

  return data.length;
}

/** Google Sheets tab names can't contain: : \ / ? * [ ] and must be <= 100 chars */
function sanitizeTabName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 100) || 'Client';
}

/**
 * Permanently deletes a client's tab (and every review row it holds).
 * No-ops if the tab doesn't exist. Irreversible.
 */
export async function deleteClientTab(spreadsheetId: string, clientName: string): Promise<boolean> {
  const sheets = getSheetsClient();
  const tabName = sanitizeTabName(clientName);

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const tab = spreadsheet.data.sheets?.find((s) => s.properties?.title === tabName);
  if (tab?.properties?.sheetId == null) return false;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ deleteSheet: { sheetId: tab.properties.sheetId } }],
    },
  });

  return true;
}
