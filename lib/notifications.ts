import { kv } from '@vercel/kv';

const SEEN_KEY = (clientName: string) => `creative:seen_ready:${clientName}`;

/** Number of "Prête" creatives the traffic manager has already seen for this client. */
export async function getSeenReadyCount(clientName: string): Promise<number> {
  return (await kv.get<number>(SEEN_KEY(clientName))) ?? 0;
}

export async function markReadySeen(clientName: string, count: number): Promise<void> {
  await kv.set(SEEN_KEY(clientName), count);
}
