import { listSessions, type Session } from './sessions';
import {
  getClientRows,
  parseDecisionDate,
  STATUS_VALIDATED,
  STATUS_REJECTED,
  type SheetRow,
} from './sheets';
import type { ProductionStatus } from './production-status';
import { getSeenReadyCount } from './notifications';

export type BatchGlobalStatus = 'ready_to_send' | 'in_progress' | 'late';

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
  rows: SheetRow[];
  reworkRows: SheetRow[];
  production: {
    nonAssignee: number;
    assignee: number;
    enCours: number;
    prete: number;
    deadline: string | null;
    globalStatus: BatchGlobalStatus;
  };
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
  hasUnseenReady: boolean;
};

export type MemberTask = {
  clientName: string;
  batch: string; // "V2"
  fileName: string;
  creativeName: string;
  comment: string;
  driveLink: string;
  deadline: string;
  productionStatus: ProductionStatus | '';
  newVersionLink: string;
  history: { batch: string; comment: string }[];
};

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function batchNumberOf(label: string): number {
  const match = label.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function isPastDeadline(deadline: string | null): boolean {
  if (!deadline) return false;
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed.getTime() < today.getTime();
}

function computeProduction(reworkRows: SheetRow[]): BatchOverview['production'] {
  const nonAssignee = reworkRows.filter((r) => r.productionStatus === 'Non assignée').length;
  const assignee = reworkRows.filter((r) => r.productionStatus === 'Assignée').length;
  const enCours = reworkRows.filter((r) => r.productionStatus === 'En cours').length;
  const prete = reworkRows.filter((r) => r.productionStatus === 'Prête').length;
  const deadline = reworkRows.find((r) => r.deadline)?.deadline || null;

  let globalStatus: BatchGlobalStatus;
  if (reworkRows.length === 0 || prete === reworkRows.length) {
    globalStatus = 'ready_to_send';
  } else if (isPastDeadline(deadline)) {
    globalStatus = 'late';
  } else {
    globalStatus = 'in_progress';
  }

  return { nonAssignee, assignee, enCours, prete, deadline, globalStatus };
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
      const reworkRows = batchRows.filter((r) => r.status === STATUS_REJECTED);
      const validatedCount = batchRows.filter(
        (r) => r.status === STATUS_VALIDATED
      ).length;
      const rejectedCount = reworkRows.length;
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
        rows: batchRows,
        reworkRows,
        production: computeProduction(reworkRows),
      };
    });

    const totalCreatives = batches.reduce((sum, b) => sum + b.rows.length, 0);
    const totalValidated = batches.reduce(
      (sum, b) => sum + b.validatedCount,
      0
    );
    const totalPrete = batches.reduce((sum, b) => sum + b.production.prete, 0);
    const seenCount = await getSeenReadyCount(clientName);

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
      hasUnseenReady: totalPrete > seenCount,
    });
  }

  return overviews;
}

/**
 * All rework creatives assigned to a given creative team member, across
 * every client, with the prior-batch comment history for repeat files.
 */
export async function getMemberTasks(member: string): Promise<MemberTask[]> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) return [];

  const sessions = await listSessions();
  const clientNames = Array.from(new Set(sessions.map((s) => s.clientName)));

  const tasks: MemberTask[] = [];

  for (const clientName of clientNames) {
    const rows = await getClientRows(sheetId, clientName);
    const reworkRows = rows.filter((r) => r.status === STATUS_REJECTED);
    const assignedRows = reworkRows.filter((r) => r.assignedTo === member);

    for (const row of assignedRows) {
      const history = reworkRows
        .filter(
          (r) => r.fileName === row.fileName && batchNumberOf(r.batch) < batchNumberOf(row.batch)
        )
        .sort((a, b) => batchNumberOf(a.batch) - batchNumberOf(b.batch))
        .map((r) => ({ batch: r.batch, comment: r.comment }));

      tasks.push({
        clientName,
        batch: row.batch,
        fileName: row.fileName,
        creativeName: row.creativeName,
        comment: row.comment,
        driveLink: row.driveLink,
        deadline: row.deadline,
        productionStatus: row.productionStatus,
        newVersionLink: row.newVersionLink,
        history,
      });
    }
  }

  return tasks;
}
