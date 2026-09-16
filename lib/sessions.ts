import { kv } from '@vercel/kv';
import { nanoid } from 'nanoid';

export type Session = {
  token: string;
  clientName: string;
  driveFolderId: string;
  createdAt: string; // ISO timestamp
  totalCreatives: number | null;
  reviewedCount: number;
  batchNumber: number;
  assignedTo: string | null;
};

const SESSION_KEY = (token: string) => `session:${token}`;
const SESSION_INDEX_KEY = 'sessions:index';

/** Legacy sessions created before batch/assignment tracking existed get defaults. */
function normalizeSession(session: Session): Session {
  return {
    ...session,
    batchNumber: session.batchNumber ?? 1,
    assignedTo: session.assignedTo ?? null,
  };
}

export async function createSession(
  clientName: string,
  driveFolderId: string
): Promise<Session> {
  const token = nanoid(12);
  const existingForClient = (await listSessions()).filter(
    (s) => s.clientName === clientName
  );
  const batchNumber = existingForClient.length + 1;

  const session: Session = {
    token,
    clientName,
    driveFolderId,
    createdAt: new Date().toISOString(),
    totalCreatives: null,
    reviewedCount: 0,
    batchNumber,
    assignedTo: null,
  };

  await kv.set(SESSION_KEY(token), session);
  await kv.sadd(SESSION_INDEX_KEY, token);

  return session;
}

export async function getSession(token: string): Promise<Session | null> {
  const session = await kv.get<Session>(SESSION_KEY(token));
  return session ? normalizeSession(session) : null;
}

export async function listSessions(): Promise<Session[]> {
  const tokens = await kv.smembers(SESSION_INDEX_KEY);
  if (!tokens || tokens.length === 0) return [];

  const sessions = await Promise.all(
    tokens.map((token) => kv.get<Session>(SESSION_KEY(token)))
  );

  return sessions
    .filter((s): s is Session => s != null)
    .map(normalizeSession)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export async function updateSession(
  token: string,
  partial: Partial<Session>
): Promise<Session | null> {
  const existing = await getSession(token);
  if (!existing) return null;

  const updated: Session = { ...existing, ...partial };
  await kv.set(SESSION_KEY(token), updated);
  return updated;
}

export async function setTotalCreatives(
  token: string,
  total: number
): Promise<void> {
  const existing = await getSession(token);
  if (!existing || existing.totalCreatives === total) return;
  await updateSession(token, { totalCreatives: total });
}

export async function incrementReviewedCount(token: string): Promise<void> {
  const existing = await getSession(token);
  if (!existing) return;
  await updateSession(token, { reviewedCount: existing.reviewedCount + 1 });
}
