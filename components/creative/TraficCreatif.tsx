'use client';

import { useState } from 'react';
import { KanbanBoard } from './KanbanBoard';
import { ArchivedBatches } from './ArchivedBatches';
import { AddTeamMemberModal } from './AddTeamMemberModal';
import type { ClientOverview, BatchOverview } from '@/lib/creative';

function pillClass(active: boolean): string {
  return `rounded-full px-4 py-1.5 font-body text-sm font-semibold transition-colors ${
    active
      ? 'bg-asight-violet text-white'
      : 'bg-asight-lavande/60 text-asight-dark hover:bg-asight-lavande'
  }`;
}

export function TraficCreatif({
  clients,
  teamMembers,
  onBatchUpdated,
  onSyncFailed,
  onTeamMemberAdded,
}: {
  clients: ClientOverview[];
  teamMembers: string[];
  onBatchUpdated: (
    token: string,
    patch: Partial<Pick<BatchOverview, 'assignedTo' | 'status' | 'archived'>>
  ) => void;
  onSyncFailed: () => void;
  onTeamMemberAdded: (name: string) => void;
}) {
  const [tab, setTab] = useState<string>('tous');
  const [showArchived, setShowArchived] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const allBatches = clients.flatMap((c) => c.batches);
  const activeBatches = allBatches.filter((b) => !b.archived);
  const archivedBatches = allBatches.filter((b) => b.archived);

  const scopedBatches =
    tab === 'tous' ? activeBatches : activeBatches.filter((b) => b.assignedTo === tab);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-asight-dark">
            Trafic créatif
          </h1>
          <p className="font-body text-sm text-asight-dark/50">
            {activeBatches.length} batch{activeBatches.length !== 1 ? 's' : ''} actif
            {activeBatches.length !== 1 ? 's' : ''}, tous clients confondus. Glissez une
            carte pour changer son statut.
          </p>
        </div>
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="rounded-full border-2 border-asight-muted px-4 py-2 font-body text-sm font-semibold text-asight-dark/60 transition-colors hover:bg-asight-lavande"
        >
          {showArchived ? 'Voir le tableau' : `Archives (${archivedBatches.length})`}
        </button>
      </div>

      <div className="mb-6 mt-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setTab('tous')} className={pillClass(tab === 'tous')}>
          Tous
        </button>
        {teamMembers.map((member) => (
          <button key={member} onClick={() => setTab(member)} className={pillClass(tab === member)}>
            {member}
          </button>
        ))}
        <button
          onClick={() => setAddMemberOpen(true)}
          className="rounded-full border-2 border-dashed border-asight-violet px-4 py-1.5 font-body text-sm font-semibold text-asight-violet transition-colors hover:bg-asight-lavande"
        >
          + Personne
        </button>
      </div>

      {showArchived ? (
        <ArchivedBatches
          batches={archivedBatches}
          onBatchUpdated={onBatchUpdated}
          onSyncFailed={onSyncFailed}
        />
      ) : (
        <KanbanBoard
          batches={scopedBatches}
          teamMembers={teamMembers}
          onBatchUpdated={onBatchUpdated}
          onSyncFailed={onSyncFailed}
          emptyMessage={tab === 'tous' ? 'Aucun batch' : `Aucun batch pour ${tab}`}
        />
      )}

      {addMemberOpen && (
        <AddTeamMemberModal
          onClose={() => setAddMemberOpen(false)}
          onAdded={(name) => {
            onTeamMemberAdded(name);
            setAddMemberOpen(false);
            setTab(name);
          }}
        />
      )}
    </div>
  );
}
