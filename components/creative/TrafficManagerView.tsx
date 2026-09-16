'use client';

import { useState } from 'react';
import { AddTeamMemberModal } from './AddTeamMemberModal';
import { NewCycleModal } from './NewCycleModal';
import { STATUS_REJECTED } from '@/lib/status';
import { PRODUCTION_STATUSES, type ProductionStatus } from '@/lib/production-status';
import type { ClientOverview, BatchGlobalStatus, BatchOverview } from '@/lib/creative';
import type { TeamMember, TeamRole } from '@/lib/team-store';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isPastDeadline(deadline: string): boolean {
  if (!deadline) return false;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
}

const GLOBAL_STATUS_BADGE: Record<BatchGlobalStatus, { label: string; className: string }> = {
  ready_to_send: { label: '🟢 Prêt à envoyer', className: 'bg-asight-green/20 text-asight-dark' },
  in_progress: { label: '🟡 En cours', className: 'bg-amber-100 text-amber-800' },
  late: { label: '🔴 En retard', className: 'bg-asight-red/10 text-asight-red' },
};

const PRODUCTION_BADGE: Record<ProductionStatus, string> = {
  'Non assignée': 'bg-asight-lavande text-asight-dark/60',
  Assignée: 'bg-asight-muted/30 text-asight-dark',
  'En cours': 'bg-amber-100 text-amber-800',
  Prête: 'bg-asight-green/30 text-asight-dark',
};

function getHistory(
  client: ClientOverview,
  fileName: string,
  currentBatchNumber: number
): { batch: string; comment: string }[] {
  const history: { batch: string; comment: string }[] = [];
  for (const b of client.batches) {
    if (b.batchNumber >= currentBatchNumber) continue;
    const match = b.rows.find((r) => r.fileName === fileName && r.status === STATUS_REJECTED);
    if (match) history.push({ batch: b.batchLabel, comment: match.comment });
  }
  return history;
}

export function TrafficManagerView({
  clients,
  teamMembers,
  onRefresh,
  onTeamMemberAdded,
}: {
  clients: ClientOverview[];
  teamMembers: TeamMember[];
  onRefresh: () => void;
  onTeamMemberAdded: (name: string, role: TeamRole) => void;
}) {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedBatchLabel, setSelectedBatchLabel] = useState<string | null>(null);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newCycleOpen, setNewCycleOpen] = useState(false);
  const [openHistory, setOpenHistory] = useState<Set<string>>(new Set());
  const [deadlineInput, setDeadlineInput] = useState('');
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [savingLinkFor, setSavingLinkFor] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState('');

  const creativeMembers = teamMembers.filter((m) => m.role === 'creative');
  const client = clients.find((c) => c.clientName === selectedClient) ?? null;

  async function openClient(c: ClientOverview) {
    setSelectedClient(c.clientName);
    setSelectedBatchLabel(null);
    const totalPrete = c.batches.reduce((sum, b) => sum + b.production.prete, 0);
    if (c.hasUnseenReady) {
      await fetch('/api/creative/mark-seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName: c.clientName, count: totalPrete }),
      });
      onRefresh();
    }
  }

  async function patchRow(
    batch: BatchOverview,
    fileName: string,
    patch: { assignedTo?: string; productionStatus?: ProductionStatus; newVersionLink?: string }
  ) {
    const key = `${batch.token}:${fileName}`;
    setPendingKey(key);
    try {
      await fetch('/api/creative/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: batch.clientName,
          fileName,
          batch: batch.batchLabel,
          ...patch,
        }),
      });
      onRefresh();
    } finally {
      setPendingKey(null);
    }
  }

  async function applyDeadline(batch: BatchOverview) {
    if (!deadlineInput) return;
    await fetch('/api/creative/deadline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: batch.clientName,
        batch: batch.batchLabel,
        deadline: deadlineInput,
      }),
    });
    onRefresh();
  }

  function toggleHistory(key: string) {
    setOpenHistory((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // --- Global dashboard (no client selected) ---
  if (!client) {
    return (
      <div>
        <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold text-asight-dark">
              Trafic créatif
            </h1>
            <p className="font-body text-sm text-asight-dark/50">
              Vue d&apos;ensemble des créas à retravailler, tous clients confondus.
            </p>
          </div>
          <button
            onClick={() => setAddMemberOpen(true)}
            className="rounded-full border-2 border-dashed border-asight-violet px-4 py-2 font-body text-sm font-semibold text-asight-violet transition-colors hover:bg-asight-lavande"
          >
            + Personne
          </button>
        </div>

        {clients.length === 0 ? (
          <p className="mt-6 font-body text-asight-dark/60">Aucun client pour le moment.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse font-body text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-asight-dark/40">
                  <th className="pb-2 pr-4">Client</th>
                  <th className="pb-2 pr-4">Batch</th>
                  <th className="pb-2 pr-4">Créas</th>
                  <th className="pb-2 pr-4">Validées</th>
                  <th className="pb-2 pr-4">À retravailler</th>
                  <th className="pb-2 pr-4">Non assignées</th>
                  <th className="pb-2 pr-4">En cours</th>
                  <th className="pb-2 pr-4">Prêtes</th>
                  <th className="pb-2 pr-4">Deadline</th>
                  <th className="pb-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const latest = c.batches[c.batches.length - 1];
                  const badge = latest ? GLOBAL_STATUS_BADGE[latest.production.globalStatus] : null;
                  return (
                    <tr
                      key={c.clientName}
                      onClick={() => openClient(c)}
                      className="cursor-pointer border-t border-asight-lavande hover:bg-asight-lavande/40"
                    >
                      <td className="py-3 pr-4 font-semibold text-asight-dark">
                        <span className="inline-flex items-center gap-2">
                          {c.clientName}
                          {c.hasUnseenReady && (
                            <span className="h-2 w-2 rounded-full bg-asight-red" title="Nouvelles créas prêtes" />
                          )}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-asight-dark/70">{latest?.batchLabel ?? '—'}</td>
                      <td className="py-3 pr-4 text-asight-dark/70">{latest?.totalCreatives ?? 0}</td>
                      <td className="py-3 pr-4 text-asight-dark/70">{latest?.validatedCount ?? 0}</td>
                      <td className="py-3 pr-4 text-asight-dark/70">{latest?.rejectedCount ?? 0}</td>
                      <td className="py-3 pr-4 text-asight-dark/70">{latest?.production.nonAssignee ?? 0}</td>
                      <td className="py-3 pr-4 text-asight-dark/70">{latest?.production.enCours ?? 0}</td>
                      <td className="py-3 pr-4 text-asight-dark/70">{latest?.production.prete ?? 0}</td>
                      <td className="py-3 pr-4 text-asight-dark/70">
                        {formatDate(latest?.production.deadline ?? null)}
                      </td>
                      <td className="py-3">
                        {badge && (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {addMemberOpen && (
          <AddTeamMemberModal
            onClose={() => setAddMemberOpen(false)}
            onAdded={(name, role) => {
              onTeamMemberAdded(name, role);
              setAddMemberOpen(false);
            }}
          />
        )}
      </div>
    );
  }

  // --- Client detail (batch tabs + rework table) ---
  const batches = client.batches;
  const selectedBatch =
    batches.find((b) => b.batchLabel === selectedBatchLabel) ?? batches[batches.length - 1];
  const isLatestBatch =
    selectedBatch && selectedBatch.batchNumber === batches[batches.length - 1]?.batchNumber;
  const canGenerateNext =
    isLatestBatch &&
    selectedBatch &&
    selectedBatch.reworkRows.length > 0 &&
    selectedBatch.production.prete === selectedBatch.reworkRows.length;
  const nextBatchNumber = (batches[batches.length - 1]?.batchNumber ?? 0) + 1;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={() => setSelectedClient(null)}
            className="mb-1 font-body text-sm font-semibold text-asight-violet hover:underline"
          >
            ← Tous les clients
          </button>
          <h1 className="font-heading text-2xl font-bold text-asight-dark">{client.clientName}</h1>
        </div>
        {canGenerateNext && (
          <button
            onClick={() => setNewCycleOpen(true)}
            className="rounded-full bg-asight-violet px-5 py-2.5 font-body text-sm font-semibold text-white transition-colors hover:bg-asight-violet-dark"
          >
            🚀 Générer lien V{nextBatchNumber}
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {batches.map((b) => (
          <button
            key={b.batchLabel}
            onClick={() => {
              setSelectedBatchLabel(b.batchLabel);
              setDeadlineInput('');
            }}
            className={`rounded-full px-4 py-1.5 font-body text-sm font-semibold transition-colors ${
              selectedBatch?.batchLabel === b.batchLabel
                ? 'bg-asight-violet text-white'
                : 'bg-asight-lavande/60 text-asight-dark hover:bg-asight-lavande'
            }`}
          >
            {b.batchLabel}
          </button>
        ))}
      </div>

      {selectedBatch && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl bg-asight-lavande/40 px-4 py-3">
            <label className="font-body text-sm font-semibold text-asight-dark">
              Deadline pour {selectedBatch.batchLabel}
            </label>
            <input
              type="date"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="rounded-lg border border-asight-muted bg-white px-3 py-1.5 font-body text-sm text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet"
            />
            <button
              onClick={() => applyDeadline(selectedBatch)}
              disabled={!deadlineInput}
              className="rounded-full border-2 border-asight-violet px-4 py-1.5 font-body text-sm font-semibold text-asight-violet transition-colors hover:bg-asight-lavande disabled:opacity-50"
            >
              Appliquer à tout le batch
            </button>
          </div>

          {selectedBatch.reworkRows.length === 0 ? (
            <p className="font-body text-asight-dark/60">
              Aucune créa à retravailler pour ce batch.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-asight-lavande bg-white shadow-card">
              <table className="w-full min-w-[900px] border-collapse font-body text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-asight-dark/40">
                    <th className="px-4 py-3">Créa</th>
                    <th className="px-4 py-3">Commentaire annonceur</th>
                    <th className="px-4 py-3">Assigné à</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Nouvelle version</th>
                    <th className="px-4 py-3">Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBatch.reworkRows.map((row) => {
                    const rowKey = `${selectedBatch.token}:${row.fileName}`;
                    const history = getHistory(client, row.fileName, selectedBatch.batchNumber);
                    const historyOpen = openHistory.has(rowKey);
                    const late = isPastDeadline(row.deadline) && row.productionStatus !== 'Prête';

                    return (
                      <tr key={rowKey} className="border-t border-asight-lavande align-top">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-asight-dark">{row.creativeName}</p>
                          <a
                            href={row.driveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-body text-xs text-asight-violet hover:underline"
                          >
                            Ouvrir sur Drive
                          </a>
                          {history.length > 0 && (
                            <div className="mt-1">
                              <button
                                onClick={() => toggleHistory(rowKey)}
                                className="font-body text-xs font-semibold text-asight-dark/40 hover:text-asight-dark"
                              >
                                {historyOpen ? 'Masquer' : 'Voir'} l&apos;historique ({history.length})
                              </button>
                              {historyOpen && (
                                <div className="mt-1 flex flex-col gap-1 border-l-2 border-asight-lavande pl-2">
                                  {history.map((h, i) => (
                                    <p key={i} className="font-body text-xs text-asight-dark/40">
                                      <span className="font-semibold">{h.batch} :</span> {h.comment}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="max-w-xs px-4 py-3 text-asight-dark/70">{row.comment}</td>
                        <td className="px-4 py-3">
                          <select
                            value={row.assignedTo}
                            onChange={(e) =>
                              patchRow(selectedBatch, row.fileName, {
                                assignedTo: e.target.value,
                                productionStatus:
                                  e.target.value && row.productionStatus === 'Non assignée'
                                    ? 'Assignée'
                                    : row.productionStatus || 'Non assignée',
                              })
                            }
                            disabled={pendingKey === rowKey}
                            className="rounded-lg border border-asight-muted bg-white px-2 py-1.5 font-body text-xs text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet disabled:opacity-50"
                          >
                            <option value="">Non assigné</option>
                            {creativeMembers.map((m) => (
                              <option key={m.name} value={m.name}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRODUCTION_BADGE[row.productionStatus || 'Non assignée']}`}
                          >
                            {row.productionStatus || 'Non assignée'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {row.newVersionLink ? (
                            <a
                              href={row.newVersionLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-body text-xs font-semibold text-asight-violet hover:underline"
                            >
                              Voir
                            </a>
                          ) : (
                            <span className="font-body text-xs text-asight-dark/30">—</span>
                          )}
                        </td>
                        <td className={`px-4 py-3 font-body text-xs ${late ? 'font-bold text-asight-red' : 'text-asight-dark/50'}`}>
                          {formatDate(row.deadline || null)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {addMemberOpen && (
        <AddTeamMemberModal
          onClose={() => setAddMemberOpen(false)}
          onAdded={(name, role) => {
            onTeamMemberAdded(name, role);
            setAddMemberOpen(false);
          }}
        />
      )}

      {newCycleOpen && (
        <NewCycleModal
          clientName={client.clientName}
          nextBatchNumber={nextBatchNumber}
          onClose={() => setNewCycleOpen(false)}
          onCreated={onRefresh}
        />
      )}
    </div>
  );
}
