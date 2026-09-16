import { NextRequest, NextResponse } from 'next/server';
import { getEntriesDueInDays } from '@/lib/agenda';
import { wasReminderSent, markReminderSent } from '@/lib/agenda-notified';
import { notifySlack } from '@/lib/slack';

export const dynamic = 'force-dynamic';

const REMINDER_DAYS = 10;

/**
 * Runs daily (see vercel.json crons). Vercel automatically sends
 * `Authorization: Bearer $CRON_SECRET` when that env var is set — we check
 * it defensively so the endpoint can't be triggered by a random request.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
    }
  }

  const dueEntries = await getEntriesDueInDays(REMINDER_DAYS);
  let notified = 0;

  for (const entry of dueEntries) {
    if (await wasReminderSent(entry.clientName, entry.date)) continue;

    await notifySlack(
      `🗓️ *${entry.clientName}* : le prochain batch récurrent devrait être produit le *${entry.date}* (dans ${REMINDER_DAYS} jours).\n` +
        `→ Pense à proposer le prochain cycle (V1) au client.`
    );
    await markReminderSent(entry.clientName, entry.date);
    notified += 1;
  }

  return NextResponse.json({ ok: true, checked: dueEntries.length, notified });
}
