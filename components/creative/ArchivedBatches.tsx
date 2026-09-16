'use client';

import { useState } from 'react';
import type { BatchOverview } from '@/lib/creative';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function ArchivedBatches({
  batches,
  onBatchUpdated,
  onSyncFailed,
}: {
  batches: BatchOverview[];
  onBatchUpdated: (token: string, patch: Partial<Pick<BatchOverview, 'archived'>>) => void;
  onSyncFailed: () => void;
}) {
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  async function unarchive(token: string) {
    onBatchUpdated(token, { archived: false });
    setPendingToken(token);
    try {
      const res = await fetch('/api/creative/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, archived: false }),
      });
      if (!res.ok) onSyncFailed();
    } catch {
      onSyncFailed();
    } finally {
      setPendingToken(null);
    }
  }

  if (batches.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-asight-muted px-4 py-6 text-center font-body text-sm text-asight-dark/40">
        Aucun batch archivé.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {batches.map((batch) => (
        <div
          key={batch.token}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-asight-lavande bg-white px-4 py-3"
        >
          <span className="rounded-full bg-asight-lavande px-2.5 py-1 font-body text-xs font-semibold text-asight-violet">
            {batch.clientName}
          </span>
          <p className="flex-1 font-body text-sm font-semibold text-asight-dark">
            {batch.displayName}
          </p>
          <p className="font-body text-xs text-asight-dark/40">
            {formatDate(batch.createdAt)}
          </p>
          <button
            onClick={() => unarchive(batch.token)}
            disabled={pendingToken === batch.token}
            className="rounded-full border border-asight-violet px-3 py-1.5 font-body text-xs font-semibold text-asight-violet transition-colors hover:bg-asight-lavande disabled:opacity-50"
          >
            Désarchiver
          </button>
        </div>
      ))}
    </div>
  );
}
