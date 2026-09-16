import { NextRequest, NextResponse } from 'next/server';
import { getSession, incrementReviewedCount } from '@/lib/sessions';
import {
  appendReviewRow,
  formatDecisionDate,
  getClientRows,
  STATUS_VALIDATED,
  STATUS_REJECTED,
} from '@/lib/sheets';
import { notifySlack } from '@/lib/slack';
import { autoCreateBatchTrackerRow } from '@/lib/batch-tracker';
import { getClientMeta } from '@/lib/client-meta';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';
  const fileId = typeof body?.fileId === 'string' ? body.fileId : '';
  const fileName = typeof body?.fileName === 'string' ? body.fileName : '';
  const status = body?.status;
  const comment = typeof body?.comment === 'string' ? body.comment.trim() : '';

  if (!token || !fileId || !fileName) {
    return NextResponse.json({ error: 'Champs requis manquants.' }, { status: 400 });
  }

  if (status !== STATUS_VALIDATED && status !== STATUS_REJECTED) {
    return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
  }

  if (status === STATUS_REJECTED && !comment) {
    return NextResponse.json(
      { error: 'Un commentaire est requis pour "À retravailler".' },
      { status: 400 }
    );
  }

  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: 'Session introuvable ou expirée.' }, { status: 404 });
  }

  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    return NextResponse.json({ error: 'GOOGLE_SHEET_ID non configuré.' }, { status: 500 });
  }

  const dotIndex = fileName.lastIndexOf('.');
  const creativeName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;

  try {
    await appendReviewRow(sheetId, session.clientName, {
      creativeName,
      fileName,
      status,
      comment: status === STATUS_VALIDATED ? '' : comment,
      driveLink: `https://drive.google.com/file/d/${fileId}/view`,
      decisionDate: formatDecisionDate(new Date()),
      batch: `V${session.batchNumber}`,
    });

    await incrementReviewedCount(token);

    const reviewedSoFar = session.reviewedCount + 1;
    const batchComplete =
      session.totalCreatives !== null && reviewedSoFar >= session.totalCreatives;

    if (batchComplete) {
      const batchLabel = `V${session.batchNumber}`;
      const rows = await getClientRows(sheetId, session.clientName);
      const batchRows = rows.filter((r) => r.batch === batchLabel);
      const validated = batchRows.filter((r) => r.status === STATUS_VALIDATED).length;
      const rejected = batchRows.filter((r) => r.status === STATUS_REJECTED).length;

      const attributionLine =
        rejected > 0
          ? `\n→ ${rejected} créa${rejected !== 1 ? 's' : ''} à attribuer dans le Trafic créatif.`
          : '';

      await notifySlack(
        `📋 *${session.clientName}* a terminé la validation du batch *${batchLabel}*\n` +
          `✅ ${validated} validée${validated !== 1 ? 's' : ''} · 🔄 ${rejected} à retravailler${attributionLine}`
      );

      const meta = await getClientMeta(session.clientName);
      await autoCreateBatchTrackerRow(sheetId, {
        sourceToken: session.token,
        client: session.clientName,
        creasProduites: batchRows.length,
        total:
          meta?.recurrence === 'one_shot'
            ? meta.value
            : meta?.recurrence === 'recurrent'
              ? meta.mrr
              : undefined,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Sheets append error:', err);
    return NextResponse.json(
      { error: "Impossible d'enregistrer la décision dans Google Sheets." },
      { status: 502 }
    );
  }
}
