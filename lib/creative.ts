import { listSessions, type Session } from './sessions';
import {
  getClientRows,
  parseDecisionDate,
  STATUS_VALIDATED,
  STATUS_REJECTED,
  type SheetRow,
} from './sheets';
import type { TrafficStatus } from './traffic-status';

export type BatchOverview = {
  token: string;
  clientName: string;
  batchNumber: number;
  batchLabel: string; // "V1" — internal key, matches Sheets rows. Never shown to users.
  displayName: string; // "Client - B1 - 16/09/2026"
  createdAt: string;
  totalCreatives: number;
  validatedCount: number;
  rejectedCount: number;
  isComplete: boolean; // true once every creative in the batch is validated
  assignedTo: string | null;
  status: TrafficStatus; // production status, driven by the Trafic créatif kanban
  archived: boolean;
  rows: SheetRow[];
  reworkRows: SheetRow[];
};

export type ClientOverview = {
  clientName: string;
  batches: BatchOverview[];
  kpis: {
    totalCreatives: number;
    validationRate: number; // 0..1
    cyclesCount: number;
    lastActivity: string | null; // ISO
  };
};

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export async function getClientsOverview(): Promise<ClientOverview[]> {
  const sessions = await listSessions();
  const sheetId = process.env.GOOGLE_SHEET_ID;

  const clientNames = Array.from(
    new Set(sessions.map((s) => s.clientName))
  ).sort((a, b) => a.localeCompare(b, 'fr'));

  const overviews: ClientOverview[] = [];

  for (const clientName of clientNames) {
    const clientSessions = sessions
      .filter((s) => s.clientName === clientName)
      .sort((a, b) => a.batchNumber - b.batchNumber);

    const rows = sheetId ? await getClientRows(sheetId, clientName) : [];

    const batches: BatchOverview[] = clientSessions.map((session: Session) => {
      const batchLabel = `V${session.batchNumber}`;
      const batchRows = rows.filter((r) => r.batch === batchLabel);
      const validatedCount = batchRows.filter(
        (r) => r.status === STATUS_VALIDATED
      ).length;
      const rejectedCount = batchRows.filter(
        (r) => r.status === STATUS_REJECTED
      ).length;
      const totalCreatives = session.totalCreatives ?? batchRows.length;

      return {
        token: session.token,
        clientName,
        batchNumber: session.batchNumber,
        batchLabel,
        displayName: `${clientName} - B${session.batchNumber} - ${formatShortDate(
          session.createdAt
        )}`,
        createdAt: session.createdAt,
        totalCreatives,
        validatedCount,
        rejectedCount,
        isComplete: totalCreatives > 0 && validatedCount === totalCreatives,
        assignedTo: session.assignedTo,
        status: session.status,
        archived: session.archived,
        rows: batchRows,
        reworkRows: batchRows.filter((r) => r.status === STATUS_REJECTED),
      };
    });

    const totalCreatives = batches.reduce((sum, b) => sum + b.rows.length, 0);
    const totalValidated = batches.reduce(
      (sum, b) => sum + b.validatedCount,
      0
    );

    let lastActivity: string | null = null;
    for (const row of rows) {
      const parsed = parseDecisionDate(row.decisionDate);
      if (
        parsed &&
        (!lastActivity || parsed.getTime() > new Date(lastActivity).getTime())
      ) {
        lastActivity = parsed.toISOString();
      }
    }
    if (!lastActivity && clientSessions.length > 0) {
      lastActivity = clientSessions[clientSessions.length - 1].createdAt;
    }

    overviews.push({
      clientName,
      batches,
      kpis: {
        totalCreatives,
        validationRate: totalCreatives > 0 ? totalValidated / totalCreatives : 0,
        cyclesCount: clientSessions.length,
        lastActivity,
      },
    });
  }

  return overviews;
}
