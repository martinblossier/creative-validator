'use client';

import { useState } from 'react';
import {
  TRAFFIC_STATUSES,
  TRAFFIC_STATUS_LABELS,
  type TrafficStatus,
} from '@/lib/traffic-status';
import type { BatchOverview } from '@/lib/creative';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const COLUMN_DOT: Record<TrafficStatus, string> = {
  a_commencer: 'bg-asight-dark/30',
  en_cours: 'bg-asight-violet',
  termine: 'bg-asight-green',
};

export function KanbanBoard({
  batches,
  teamMembers,
  onBatchUpdated,
  onSyncFailed,
  emptyMessage = 'Aucun batch',
}: {
  batches: BatchOverview[];
  teamMembers: string[];
  onBatchUpdated: (
    token: string,
    patch: Partial<Pick<BatchOverview, 'assignedTo' | 'status' | 'archived'>>
  ) => void;
  onSyncFailed: () => void;
  emptyMessage?: string;
}) {
  const [draggingToken, setDraggingToken] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TrafficStatus | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  async function patchBatch(
    token: string,
    patch: Partial<Pick<BatchOverview, 'assignedTo' | 'status' | 'archived'>>
  ) {
    onBatchUpdated(token, patch);
    setPendingToken(token);
    try {
      const res = await fetch('/api/creative/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...patch }),
      });
      if (!res.ok) onSyncFailed();
    } catch {
      onSyncFailed();
    } finally {
      setPendingToken(null);
    }
  }

  function handleDrop(e: React.DragEvent, status: TrafficStatus) {
    e.preventDefault();
    setDragOverColumn(null);
    const token = e.dataTransfer.getData('text/plain');
    const batch = batches.find((b) => b.token === token);
    if (!batch || batch.status === status) return;
    patchBatch(token, { status });
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {TRAFFIC_STATUSES.map((status) => {
        const columnBatches = batches
          .filter((b) => b.status === status)
          .sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(status);
            }}
            onDragLeave={() =>
              setDragOverColumn((current) => (current === status ? null : current))
            }
            onDrop={(e) => handleDrop(e, status)}
            className={`flex min-h-[16rem] flex-col gap-3 rounded-2xl p-3 transition-colors ${
              dragOverColumn === status ? 'bg-asight-lavande' : 'bg-asight-lavande/40'
            }`}
          >
            <div className="flex items-center gap-2 px-1">
              <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 shadow-card">
                <span className={`h-2 w-2 rounded-full ${COLUMN_DOT[status]}`} />
                <span className="font-body text-sm font-semibold text-asight-dark">
                  {TRAFFIC_STATUS_LABELS[status]}
                </span>
              </span>
              <span className="font-body text-sm font-semibold text-asight-dark/40">
                {columnBatches.length}
              </span>
            </div>

            {columnBatches.length === 0 && (
              <p className="rounded-xl border border-dashed border-asight-muted px-3 py-6 text-center font-body text-xs text-asight-dark/40">
                {emptyMessage}
              </p>
            )}

            {columnBatches.map((batch) => (
              <div
                key={batch.token}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', batch.token);
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggingToken(batch.token);
                }}
                onDragEnd={() => setDraggingToken(null)}
                className={`group relative cursor-grab rounded-2xl border border-asight-lavande bg-white p-4 shadow-card transition-opacity active:cursor-grabbing ${
                  draggingToken === batch.token ? 'opacity-40' : ''
                }`}
              >
                <button
                  onClick={() => patchBatch(batch.token, { archived: true })}
                  title="Archiver ce batch"
                  className="absolute right-3 top-3 rounded-full p-1 text-asight-dark/30 opacity-0 transition-opacity hover:bg-asight-lavande hover:text-asight-dark group-hover:opacity-100"
                >
                  🗄
                </button>

                <span className="mb-2 inline-block rounded-full bg-asight-lavande px-2.5 py-1 font-body text-xs font-semibold text-asight-violet">
                  {batch.clientName}
                </span>
                <p className="mb-1 pr-6 font-body text-sm font-bold text-asight-dark">
                  {batch.displayName}
                </p>
                <p className="mb-3 font-body text-xs text-asight-dark/50">
                  {batch.validatedCount}/{batch.totalCreatives} validée
                  {batch.validatedCount !== 1 ? 's' : ''} — créé le{' '}
                  {formatDate(batch.createdAt)}
                </p>
                <select
                  value={batch.assignedTo ?? ''}
                  draggable={false}
                  onMouseDown={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    patchBatch(batch.token, {
                      assignedTo: e.target.value === '' ? null : e.target.value,
                    })
                  }
                  disabled={pendingToken === batch.token}
                  className="w-full rounded-lg border border-asight-muted bg-asight-lavande/40 px-2 py-1.5 font-body text-xs text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet disabled:opacity-50"
                >
                  <option value="">Non assigné</option>
                  {teamMembers.map((member) => (
                    <option key={member} value={member}>
                      {member}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
