import { google, sheets_v4 } from 'googleapis';
import { nanoid } from 'nanoid';
import { getGoogleAuth } from './google-auth';

const TAB_NAME = 'Batch Tracker';
const HEADERS = [
  'ID',
  'Client',
  'Statut',
  'Projet',
  'Total',
  'Créas produites',
  'Offre',
  'Date envoi final',
  'Statique',
  'Motion',
  'UGC',
  'Déclinaisons',
  'Facturation',
  'Source Token',
];

export type BatchTrackerStatus = 'En cours' | 'Terminé' | 'En pause';
export type BillingStatus = 'Facturé' | 'Pas facturé';

export type BatchTrackerRow = {
  id: string;
  client: string;
  statut: BatchTrackerStatus;
  projet: string;
  total: number;
  creasProduites: number;
  offre: string;
  dateEnvoiFinal: string; // YYYY-MM-DD
  statique: number;
  motion: number;
  ugc: number;
  declinaisons: number;
  facturation: BillingStatus;
  /** Session token this row was auto-created from, if any — prevents duplicate auto-rows. */
  sourceToken: string;
};

function getSheetsClient() {
  const auth = getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}

async function ensureTrackerTab(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<number | null> {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = spreadsheet.data.sheets?.find((s) => s.properties?.title === TAB_NAME);
  if (existing?.properties?.sheetId != null) return existing.properties.sheetId;

  const addSheetRes = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        { addSheet: { properties: { title: TAB_NAME, gridProperties: { frozenRowCount: 1 } } } },
      ],
    },
  });
  const sheetId = addSheetRes.data.replies?.[0].addSheet?.properties?.sheetId ?? null;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TAB_NAME}!A1:N1`,
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] },
  });

  if (sheetId != null) {
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
              cell: { userEnteredFormat: { textFormat: { bold: true } } },
              fields: 'userEnteredFormat.textFormat.bold',
            },
          },
        ],
      },
    });
  }

  return sheetId;
}

function rowToValues(row: BatchTrackerRow): string[] {
  return [
    row.id,
    row.client,
    row.statut,
    row.projet,
    String(row.total),
    String(row.creasProduites),
    row.offre,
    row.dateEnvoiFinal,
    String(row.statique),
    String(row.motion),
    String(row.ugc),
    String(row.declinaisons),
    row.facturation,
    row.sourceToken,
  ];
}

function valuesToRow(values: string[]): BatchTrackerRow {
  return {
    id: values[0] ?? '',
    client: values[1] ?? '',
    statut: (values[2] as BatchTrackerStatus) || 'En cours',
    projet: values[3] ?? '',
    total: Number(values[4]) || 0,
    creasProduites: Number(values[5]) || 0,
    offre: values[6] ?? '',
    dateEnvoiFinal: values[7] ?? '',
    statique: Number(values[8]) || 0,
    motion: Number(values[9]) || 0,
    ugc: Number(values[10]) || 0,
    declinaisons: Number(values[11]) || 0,
    facturation: (values[12] as BillingStatus) || 'Pas facturé',
    sourceToken: values[13] ?? '',
  };
}

export async function getBatchTrackerRows(spreadsheetId: string): Promise<BatchTrackerRow[]> {
  const sheets = getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TAB_NAME}!A2:N`,
    });
    const values = (res.data.values as string[][]) ?? [];
    return values.filter((r) => r[0]).map(valuesToRow);
  } catch {
    return [];
  }
}

export async function addBatchTrackerRow(
  spreadsheetId: string,
  row: Omit<BatchTrackerRow, 'id'>
): Promise<BatchTrackerRow> {
  const sheets = getSheetsClient();
  await ensureTrackerTab(sheets, spreadsheetId);

  const fullRow: BatchTrackerRow = { ...row, id: nanoid(8) };
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TAB_NAME}!A:N`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowToValues(fullRow)] },
  });

  return fullRow;
}

export async function updateBatchTrackerRow(
  spreadsheetId: string,
  id: string,
  patch: Partial<Omit<BatchTrackerRow, 'id'>>
): Promise<boolean> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB_NAME}!A2:N`,
  });
  const values = (res.data.values as string[][]) ?? [];
  const rowIndex = values.findIndex((r) => r[0] === id);
  if (rowIndex === -1) return false;

  const merged: BatchTrackerRow = { ...valuesToRow(values[rowIndex]), ...patch, id };
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TAB_NAME}!A${rowIndex + 2}:N${rowIndex + 2}`,
    valueInputOption: 'RAW',
    requestBody: { values: [rowToValues(merged)] },
  });

  return true;
}

/**
 * Auto-creates a "Terminé" row for a fully-validated batch, pre-filled with
 * the final creative count — skipped if a row for this session token
 * already exists, so it only ever runs once per batch.
 */
export async function autoCreateBatchTrackerRow(
  spreadsheetId: string,
  params: { sourceToken: string; client: string; creasProduites: number; total?: number }
): Promise<BatchTrackerRow | null> {
  const existing = await getBatchTrackerRows(spreadsheetId);
  if (existing.some((r) => r.sourceToken === params.sourceToken)) return null;

  return addBatchTrackerRow(spreadsheetId, {
    client: params.client,
    statut: 'Terminé',
    projet: `B${existing.length + 1}`,
    total: params.total ?? 0,
    creasProduites: params.creasProduites,
    offre: '',
    dateEnvoiFinal: '',
    statique: 0,
    motion: 0,
    ugc: 0,
    declinaisons: 0,
    facturation: 'Pas facturé',
    sourceToken: params.sourceToken,
  });
}

/** Deletes every Batch Tracker row for a given client. Returns how many were removed. */
export async function deleteBatchTrackerRowsForClient(
  spreadsheetId: string,
  client: string
): Promise<number> {
  const rows = await getBatchTrackerRows(spreadsheetId);
  const matching = rows.filter((r) => r.client === client);
  for (const row of matching) {
    await deleteBatchTrackerRow(spreadsheetId, row.id);
  }
  return matching.length;
}

export async function deleteBatchTrackerRow(spreadsheetId: string, id: string): Promise<boolean> {
  const sheets = getSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const tab = spreadsheet.data.sheets?.find((s) => s.properties?.title === TAB_NAME);
  const sheetId = tab?.properties?.sheetId;
  if (sheetId == null) return false;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TAB_NAME}!A2:A`,
  });
  const values = (res.data.values as string[][]) ?? [];
  const rowIndex = values.findIndex((r) => r[0] === id);
  if (rowIndex === -1) return false;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex + 1,
              endIndex: rowIndex + 2,
            },
          },
        },
      ],
    },
  });

  return true;
}
