'use client';

import { useEffect, useState, useCallback } from 'react';
import type { BatchTrackerRow, BatchTrackerStatus, BillingStatus } from '@/lib/batch-tracker';

const STATUT_OPTIONS: BatchTrackerStatus[] = ['En cours', 'Terminé', 'En pause'];
const FACTURATION_OPTIONS: BillingStatus[] = ['Pas facturé', 'Facturé'];

const STATUT_BADGE: Record<BatchTrackerStatus, string> = {
  'En cours': 'bg-asight-muted/30 text-asight-dark',
  Terminé: 'bg-asight-green/30 text-asight-dark',
  'En pause': 'bg-asight-lavande text-asight-dark/60',
};

const FACTURATION_BADGE: Record<BillingStatus, string> = {
  'Pas facturé': 'bg-asight-lavande text-asight-dark/60',
  Facturé: 'bg-asight-green/30 text-asight-dark',
};

export function BatchTrackerView() {
  const [rows, setRows] = useState<BatchTrackerRow[] | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/creative/batch-tracker');
    const data = await res.json();
    setRows(data.rows ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function updateLocal(id: string, patch: Partial<BatchTrackerRow>) {
    setRows((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) : prev));
  }

  async function saveField(id: string, patch: Partial<BatchTrackerRow>) {
    await fetch(`/api/creative/batch-tracker/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
  }

  async function addRow() {
    const res = await fetch('/api/creative/batch-tracker', { method: 'POST' });
    const data = await res.json();
    if (data.row) setRows((prev) => (prev ? [...prev, data.row] : [data.row]));
  }

  async function deleteRow(id: string) {
    setRows((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
    await fetch(`/api/creative/batch-tracker/${id}`, { method: 'DELETE' });
  }

  if (rows === null) {
    return <p className="font-body text-asight-dark/60">Chargement…</p>;
  }

  const totalSum = rows.reduce((sum, r) => sum + r.total, 0);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-asight-dark">Batch Tracker</h1>
          <p className="font-body text-sm text-asight-dark/50">
            Suivi projets &amp; facturation, tous clients confondus.
          </p>
        </div>
        <button
          onClick={addRow}
          className="rounded-full border-2 border-dashed border-asight-violet px-4 py-2 font-body text-sm font-semibold text-asight-violet transition-colors hover:bg-asight-lavande"
        >
          + Nouvelle ligne
        </button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-asight-lavande bg-white shadow-card">
        <table className="w-full min-w-[1100px] border-collapse font-body text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-asight-dark/40">
              <th className="px-3 py-3">Client</th>
              <th className="px-3 py-3">Statut</th>
              <th className="px-3 py-3">Projet</th>
              <th className="px-3 py-3">Total</th>
              <th className="px-3 py-3">Créas produites</th>
              <th className="px-3 py-3">Offre</th>
              <th className="px-3 py-3">Date envoi final</th>
              <th className="px-3 py-3">Statique</th>
              <th className="px-3 py-3">Motion</th>
              <th className="px-3 py-3">UGC</th>
              <th className="px-3 py-3">Déclinaisons</th>
              <th className="px-3 py-3">Facturation</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-asight-lavande">
                <td className="px-3 py-2">
                  <input
                    value={row.client}
                    onChange={(e) => updateLocal(row.id, { client: e.target.value })}
                    onBlur={(e) => saveField(row.id, { client: e.target.value })}
                    className="w-32 rounded-lg border border-transparent bg-transparent px-2 py-1.5 font-semibold text-asight-dark outline-none focus:border-asight-muted focus:bg-white"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.statut}
                    onChange={(e) => {
                      const statut = e.target.value as BatchTrackerStatus;
                      updateLocal(row.id, { statut });
                      saveField(row.id, { statut });
                    }}
                    className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${STATUT_BADGE[row.statut]}`}
                  >
                    {STATUT_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.projet}
                    onChange={(e) => updateLocal(row.id, { projet: e.target.value })}
                    onBlur={(e) => saveField(row.id, { projet: e.target.value })}
                    className="w-24 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-asight-dark outline-none focus:border-asight-muted focus:bg-white"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={row.total}
                    onChange={(e) => updateLocal(row.id, { total: Number(e.target.value) })}
                    onBlur={(e) => saveField(row.id, { total: Number(e.target.value) })}
                    className="w-24 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-asight-dark outline-none focus:border-asight-muted focus:bg-white"
                  />
                  <span className="text-asight-dark/40"> €</span>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={row.creasProduites}
                    onChange={(e) => updateLocal(row.id, { creasProduites: Number(e.target.value) })}
                    onBlur={(e) => saveField(row.id, { creasProduites: Number(e.target.value) })}
                    className="w-20 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-asight-dark outline-none focus:border-asight-muted focus:bg-white"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    value={row.offre}
                    onChange={(e) => updateLocal(row.id, { offre: e.target.value })}
                    onBlur={(e) => saveField(row.id, { offre: e.target.value })}
                    className="w-40 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-asight-dark outline-none focus:border-asight-muted focus:bg-white"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="date"
                    value={row.dateEnvoiFinal}
                    onChange={(e) => {
                      updateLocal(row.id, { dateEnvoiFinal: e.target.value });
                      saveField(row.id, { dateEnvoiFinal: e.target.value });
                    }}
                    className="rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-asight-dark outline-none focus:border-asight-muted focus:bg-white"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={row.statique}
                    onChange={(e) => updateLocal(row.id, { statique: Number(e.target.value) })}
                    onBlur={(e) => saveField(row.id, { statique: Number(e.target.value) })}
                    className="w-16 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-asight-dark outline-none focus:border-asight-muted focus:bg-white"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={row.motion}
                    onChange={(e) => updateLocal(row.id, { motion: Number(e.target.value) })}
                    onBlur={(e) => saveField(row.id, { motion: Number(e.target.value) })}
                    className="w-16 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-asight-dark outline-none focus:border-asight-muted focus:bg-white"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={row.ugc}
                    onChange={(e) => updateLocal(row.id, { ugc: Number(e.target.value) })}
                    onBlur={(e) => saveField(row.id, { ugc: Number(e.target.value) })}
                    className="w-16 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-asight-dark outline-none focus:border-asight-muted focus:bg-white"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    value={row.declinaisons}
                    onChange={(e) => updateLocal(row.id, { declinaisons: Number(e.target.value) })}
                    onBlur={(e) => saveField(row.id, { declinaisons: Number(e.target.value) })}
                    className="w-16 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-asight-dark outline-none focus:border-asight-muted focus:bg-white"
                  />
                </td>
                <td className="px-3 py-2">
                  <select
                    value={row.facturation}
                    onChange={(e) => {
                      const facturation = e.target.value as BillingStatus;
                      updateLocal(row.id, { facturation });
                      saveField(row.id, { facturation });
                    }}
                    className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none ${FACTURATION_BADGE[row.facturation]}`}
                  >
                    {FACTURATION_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => deleteRow(row.id)}
                    title="Supprimer la ligne"
                    className="text-asight-dark/30 hover:text-asight-red"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-asight-lavande font-semibold text-asight-dark">
                <td className="px-3 py-3" colSpan={3}>
                  Total
                </td>
                <td className="px-3 py-3">{totalSum.toLocaleString('fr-FR')} €</td>
                <td className="px-3 py-3" colSpan={8} />
              </tr>
            </tfoot>
          )}
        </table>
        {rows.length === 0 && (
          <p className="px-4 py-8 text-center font-body text-sm text-asight-dark/40">
            Aucune ligne pour le moment.
          </p>
        )}
      </div>
    </div>
  );
}
