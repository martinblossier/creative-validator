'use client';

import { STATUS_REJECTED, STATUS_VALIDATED } from '@/lib/status';
import type { BatchOverview } from '@/lib/creative';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function isVideoFile(fileName: string): boolean {
  return /\.(mp4|mov|webm)$/i.test(fileName);
}

export function BatchPanel({ batch }: { batch: BatchOverview }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-asight-lavande bg-white shadow-card">
      <div
        className={`flex flex-wrap items-center gap-3 border-l-4 px-5 py-4 ${
          batch.isComplete ? 'border-l-asight-green' : 'border-l-asight-muted'
        }`}
      >
        <span
          className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            batch.isComplete
              ? 'bg-asight-green text-asight-dark'
              : 'bg-asight-lavande text-asight-dark/40'
          }`}
          title={batch.isComplete ? 'Batch validé à 100%' : 'Validation en cours'}
        >
          {batch.isComplete ? '✓' : '…'}
        </span>
        <span className="font-heading text-base font-bold text-asight-dark">
          {batch.displayName}
        </span>
        <span className="font-body text-sm text-asight-dark">
          {batch.rows.length} créa{batch.rows.length !== 1 ? 's' : ''} —{' '}
          {batch.validatedCount} validée{batch.validatedCount !== 1 ? 's' : ''} /{' '}
          {batch.rejectedCount} à retravailler
        </span>
        <span className="font-body text-xs text-asight-dark/40">
          {formatDate(batch.createdAt)}
        </span>
      </div>

      <div className="border-t border-asight-lavande px-5 py-4">
        {batch.rows.length === 0 ? (
          <p className="font-body text-sm text-asight-dark/50">
            Aucune créa évaluée pour ce cycle pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-body text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-asight-dark/40">
                  <th className="pb-2 pr-4">Nom de la créa</th>
                  <th className="pb-2 pr-4">Statut</th>
                  <th className="pb-2 pr-4">Commentaire</th>
                  <th className="pb-2">Lien Drive</th>
                </tr>
              </thead>
              <tbody>
                {batch.rows.map((row, i) => (
                  <tr
                    key={`${row.fileName}-${i}`}
                    className={
                      row.status === STATUS_REJECTED
                        ? 'bg-asight-red/10'
                        : 'bg-asight-green/20'
                    }
                  >
                    <td className="py-2 pr-4 text-asight-dark">{row.creativeName}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          row.status === STATUS_REJECTED
                            ? 'bg-asight-red text-white'
                            : 'bg-asight-green text-asight-dark'
                        }`}
                      >
                        {row.status === STATUS_VALIDATED ? 'Validé' : row.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-asight-dark/70">
                      {row.comment || '—'}
                    </td>
                    <td className="py-2">
                      <a
                        href={row.driveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-asight-violet hover:underline"
                      >
                        Ouvrir
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {batch.reworkRows.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 font-heading text-sm font-bold text-asight-dark">
              Créas à retravailler
            </h3>
            <div className="flex flex-col gap-3">
              {batch.reworkRows.map((row, i) => (
                <div
                  key={`${row.fileName}-rework-${i}`}
                  className="flex items-start gap-3 rounded-xl border border-asight-lavande bg-white p-3"
                >
                  <span className="text-2xl leading-none">
                    {isVideoFile(row.fileName) ? '🎬' : '🖼️'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-sm font-semibold text-asight-dark">
                      {row.fileName}
                    </p>
                    <p className="mt-1 rounded-lg border border-asight-violet bg-asight-lavande px-3 py-2 font-body text-sm text-asight-dark">
                      {row.comment}
                    </p>
                    <a
                      href={row.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block font-body text-xs font-semibold text-asight-violet hover:underline"
                    >
                      Voir sur Drive
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
