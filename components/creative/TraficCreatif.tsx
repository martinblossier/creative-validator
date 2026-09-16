'use client';

import { useState } from 'react';
import { TEAM_MEMBERS } from '@/lib/team';
import type { ClientOverview } from '@/lib/creative';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function TraficCreatif({
  clients,
  onAssigned,
}: {
  clients: ClientOverview[];
  onAssigned: (token: string, assignedTo: string | null) => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [errorToken, setErrorToken] = useState<string | null>(null);

  const pendingBatches = clients
    .flatMap((c) => c.batches)
    .filter((b) => !b.isComplete)
    .sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  async function handleAssign(token: string, value: string) {
    const assignedTo = value === '' ? null : value;
    setPending(token);
    setErrorToken(null);
    try {
      const res = await fetch('/api/creative/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, assignedTo }),
      });
      if (!res.ok) {
        setErrorToken(token);
        return;
      }
      onAssigned(token, assignedTo);
    } catch {
      setErrorToken(token);
    } finally {
      setPending(null);
    }
  }

  return (
    <div>
      <h1 className="mb-1 font-heading text-2xl font-bold text-asight-dark">
        Trafic créatif
      </h1>
      <p className="mb-6 font-body text-sm text-asight-dark/50">
        {pendingBatches.length} batch{pendingBatches.length !== 1 ? 's' : ''} à
        traiter, tous clients confondus.
      </p>

      {pendingBatches.length === 0 ? (
        <p className="font-body text-asight-dark/60">
          Tous les batchs sont validés à 100% 🎉
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {pendingBatches.map((batch) => (
            <div
              key={batch.token}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-l-4 border-asight-lavande border-l-asight-muted bg-white p-4 shadow-card"
            >
              <span
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-asight-lavande text-sm font-bold text-asight-dark/40"
                title="Validation en cours"
              >
                …
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm font-bold text-asight-dark">
                  {batch.displayName}
                </p>
                <p className="font-body text-xs text-asight-dark/50">
                  {batch.validatedCount}/{batch.totalCreatives} validée
                  {batch.validatedCount !== 1 ? 's' : ''} — {batch.rejectedCount} à
                  retravailler — créé le {formatDate(batch.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="font-body text-xs font-semibold uppercase tracking-wide text-asight-dark/40">
                  Assigné à
                </label>
                <select
                  value={batch.assignedTo ?? ''}
                  onChange={(e) => handleAssign(batch.token, e.target.value)}
                  disabled={pending === batch.token}
                  className="rounded-lg border border-asight-muted bg-white px-3 py-2 font-body text-sm text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet disabled:opacity-50"
                >
                  <option value="">Non assigné</option>
                  {TEAM_MEMBERS.map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>
              </div>

              {errorToken === batch.token && (
                <p className="w-full font-body text-xs text-asight-red">
                  Impossible d&apos;assigner ce batch. Réessayez.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
