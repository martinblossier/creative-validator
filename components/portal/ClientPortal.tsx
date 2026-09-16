import { STATUS_REJECTED } from '@/lib/status';
import { Logo } from '@/components/Logo';
import type { ClientOverview } from '@/lib/creative';

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

const PRODUCTION_LABEL: Record<string, string> = {
  'Non assignée': 'En attente de prise en charge',
  Assignée: 'En attente de prise en charge',
  'En cours': 'En cours de retouche',
};

export function ClientPortal({ client }: { client: ClientOverview }) {
  const batches = client.batches; // ascending by batchNumber
  const latest = batches[batches.length - 1] ?? null;
  // A batch that hasn't been opened yet has totalCreatives === 0 (Drive not
  // scanned) — it still needs the client's action, so only treat a batch as
  // "done" once we positively know every creative in it has been decided.
  const isFullyReviewed = Boolean(
    latest && latest.totalCreatives > 0 && latest.rows.length >= latest.totalCreatives
  );
  const needsClientAction = Boolean(latest) && !isFullyReviewed;
  const progressPct =
    latest && latest.totalCreatives > 0
      ? Math.round((latest.rows.length / latest.totalCreatives) * 100)
      : 0;

  const inProgress = batches.flatMap((b) =>
    b.reworkRows
      .filter((r) => r.productionStatus && r.productionStatus !== 'Prête')
      .map((r) => ({ ...r, batchLabel: b.batchLabel }))
  );

  return (
    <main className="min-h-screen bg-white">
      <div className="bg-gradient-to-br from-asight-violet to-asight-violet-dark px-6 py-14 text-center">
        <Logo variant="white" />
        <h1 className="mt-6 font-heading text-3xl font-bold text-white sm:text-4xl">
          Bienvenue, {client.clientName}
        </h1>
        <p className="mt-1 font-body text-white/70">Portail client</p>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
        {needsClientAction && latest && (
          <section>
            <h2 className="mb-3 font-heading text-sm font-bold uppercase tracking-wide text-asight-dark/50">
              Batch en attente de votre validation
            </h2>
            <a
              href={`/review/${latest.token}`}
              className="flex flex-col gap-4 rounded-2xl border border-asight-lavande bg-white p-5 shadow-card transition-shadow hover:shadow-lg sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-heading text-lg font-bold text-asight-dark">{latest.batchLabel}</p>
                <p className="font-body text-sm text-asight-dark/50">
                  {latest.totalCreatives > 0
                    ? `${latest.rows.length} / ${latest.totalCreatives} créas décidées`
                    : 'Nouvelles créas à découvrir'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {latest.totalCreatives > 0 && (
                  <>
                    <div className="h-2 w-32 overflow-hidden rounded-full bg-asight-lavande">
                      <div
                        className="h-full rounded-full bg-asight-violet"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="font-body text-sm font-semibold text-asight-dark">
                      {progressPct}%
                    </span>
                  </>
                )}
                <span className="whitespace-nowrap rounded-full bg-asight-violet px-4 py-2 font-body text-sm font-semibold text-white">
                  Valider →
                </span>
              </div>
            </a>
          </section>
        )}

        <section>
          <h2 className="mb-3 font-heading text-sm font-bold uppercase tracking-wide text-asight-dark/50">
            En cours de traitement chez ASight ({inProgress.length})
          </h2>
          {inProgress.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-asight-muted px-4 py-6 text-center font-body text-sm text-asight-dark/40">
              Rien en cours de retouche pour le moment.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {inProgress.map((row, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-asight-lavande bg-white px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-xl">{isVideoFile(row.fileName) ? '🎬' : '🖼️'}</span>
                    <div className="min-w-0">
                      <p className="truncate font-body text-sm font-semibold text-asight-dark">
                        {row.creativeName}
                      </p>
                      <p className="font-body text-xs text-asight-dark/40">{row.batchLabel}</p>
                    </div>
                  </div>
                  <span className="whitespace-nowrap rounded-full bg-asight-lavande px-3 py-1 font-body text-xs font-semibold text-asight-dark/60">
                    {PRODUCTION_LABEL[row.productionStatus] ?? 'En attente de prise en charge'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <details className="group rounded-2xl border border-asight-lavande bg-white open:shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-heading text-sm font-bold uppercase tracking-wide text-asight-dark/50">
              Historique des batchs ({batches.length})
              <span className="font-body text-xs text-asight-dark/30 transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="flex flex-col gap-6 border-t border-asight-lavande px-5 py-5">
              {batches.length === 0 && (
                <p className="font-body text-sm text-asight-dark/40">Aucun batch pour le moment.</p>
              )}
              {[...batches].reverse().map((batch) => (
                <div key={batch.token}>
                  <p className="mb-2 font-body text-sm font-bold text-asight-dark">
                    {batch.batchLabel} — {formatDate(batch.createdAt)}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {batch.rows.length === 0 ? (
                      <p className="font-body text-xs text-asight-dark/40">
                        Aucune créa décidée pour ce batch.
                      </p>
                    ) : (
                      batch.rows.map((row, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-asight-lavande/30 px-3 py-2"
                        >
                          <span className="font-body text-sm text-asight-dark">
                            {row.creativeName}
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                row.status === STATUS_REJECTED
                                  ? 'bg-asight-red/10 text-asight-red'
                                  : 'bg-asight-green/30 text-asight-dark'
                              }`}
                            >
                              {row.status}
                            </span>
                            <a
                              href={row.driveLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-body text-xs font-semibold text-asight-violet hover:underline"
                            >
                              Ouvrir
                            </a>
                            {row.newVersionLink && (
                              <a
                                href={row.newVersionLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-body text-xs font-semibold text-asight-violet hover:underline"
                              >
                                Nouvelle version
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
