import { kv } from '@vercel/kv';

const KEY = (clientName: string, date: string) => `creative:agenda_notified:${clientName}:${date}`;

export async function wasReminderSent(clientName: string, date: string): Promise<boolean> {
  return Boolean(await kv.get(KEY(clientName, date)));
}

/** Expires after 30 days — plenty for a one-off reminder, keeps KV tidy. */
export async function markReminderSent(clientName: string, date: string): Promise<void> {
  await kv.set(KEY(clientName, date), true, { ex: 60 * 60 * 24 * 30 });
}
