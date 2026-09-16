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

      <div className="mt-6 rounded-2xl border border-asight-lavande bg-white shadow-card">
        <table className="w-full table-fixed border-collapse font-body text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-asight-dark/40">
              <th className="w-[14%] px-2 py-3">Client</th>
              <th className="w-[9%] px-2 py-3">Statut</th>
              <th className="w-[7%] px-2 py-3">Projet</th>
              <th className="w-[7%] px-2 py-3">Total</th>
              <th className="w-[6%] px-2 py-3">Créas</th>
              <th className="w-[13%] px-2 py-3">Offre</th>
              <th className="w-[10%] px-2 py-3">Envoi</th>
              <th className="w-[5%] px-2 py-3">Stat.</th>
              <th className="w-[5%] px-2 py-3">Motion</th>
              <th className="w-[5%] px-2 py-3">UGC</th>
              <th className="w-[5%] px-2 py-3">Décli.</th>
              <th className="w-[9%] px-2 py-3">Facturation</th>
              <th className="w-[3%] px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-asight-lavande">
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      value={row.client}
                      onChange={(e) => updateLocal(row.id, { client: e.target.value })}
                      onBlur={(e) => saveField(row.id, { client: e.target.value })}
                      placeholder="Client"
                      className="w-full min-w-0 rounded-lg border border-asight-muted bg-asight-lavande/20 px-2 py-1.5 font-semibold text-asight-dark outline-none placeholder:font-normal placeholder:text-asight-dark/30 hover:border-asight-violet/50 focus:border-asight-violet focus:bg-white focus:ring-2 focus:ring-asight-violet/30"
                    />
                    {row.sourceToken && (
                      <span
                        title="Ligne créée automatiquement à la fin du batch"
                        className="flex-shrink-0 rounded-full bg-asight-violet/10 px-1.5 py-0.5 text-[10px] font-semibold text-asight-violet"
                      >
                        Auto
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <select
                    value={row.statut}
                    onChange={(e) => {
                      const statut = e.target.value as BatchTrackerStatus;
                      updateLocal(row.id, { statut });
                      saveField(row.id, { statut });
                    }}
                    className={`w-full rounded-full border-0 px-2 py-1 text-xs font-semibold outline-none focus:ring-2 focus:ring-asight-violet/30 ${STATUT_BADGE[row.statut]}`}
                  >
                    {STATUT_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    value={row.projet}
                    onChange={(e) => updateLocal(row.id, { projet: e.target.value })}
                    onBlur={(e) => saveField(row.id, { projet: e.target.value })}
                    placeholder="B1"
                    className="w-full rounded-lg border border-asight-muted bg-asight-lavande/20 px-2 py-1.5 text-asight-dark outline-none placeholder:text-asight-dark/30 hover:border-asight-violet/50 focus:border-asight-violet focus:bg-white focus:ring-2 focus:ring-asight-violet/30"
                  />
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={row.total}
                      onChange={(e) => updateLocal(row.id, { total: Number(e.target.value) })}
                      onBlur={(e) => saveField(row.id, { total: Number(e.target.value) })}
                      className="w-full min-w-0 rounded-lg border border-asight-muted bg-asight-lavande/20 px-2 py-1.5 text-asight-dark outline-none hover:border-asight-violet/50 focus:border-asight-violet focus:bg-white focus:ring-2 focus:ring-asight-violet/30"
                    />
                    <span className="text-xs text-asight-dark/40">€</span>
                  </div>
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    value={row.creasProduites}
                    onChange={(e) => updateLocal(row.id, { creasProduites: Number(e.target.value) })}
                    onBlur={(e) => saveField(row.id, { creasProduites: Number(e.target.value) })}
                    className="w-full rounded-lg border border-asight-muted bg-asight-lavande/20 px-2 py-1.5 text-asight-dark outline-none hover:border-asight-violet/50 focus:border-asight-violet focus:bg-white focus:ring-2 focus:ring-asight-violet/30"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    value={row.offre}
                    onChange={(e) => updateLocal(row.id, { offre: e.target.value })}
                    onBlur={(e) => saveField(row.id, { offre: e.target.value })}
                    placeholder="Offre"
                    className="w-full rounded-lg border border-asight-muted bg-asight-lavande/20 px-2 py-1.5 text-asight-dark outline-none placeholder:text-asight-dark/30 hover:border-asight-violet/50 focus:border-asight-violet focus:bg-white focus:ring-2 focus:ring-asight-violet/30"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="date"
                    value={row.dateEnvoiFinal}
                    onChange={(e) => {
                      updateLocal(row.id, { dateEnvoiFinal: e.target.value });
                      saveField(row.id, { dateEnvoiFinal: e.target.value });
                    }}
                    className="w-full rounded-lg border border-asight-muted bg-asight-lavande/20 px-1.5 py-1.5 text-xs text-asight-dark outline-none hover:border-asight-violet/50 focus:border-asight-violet focus:bg-white focus:ring-2 focus:ring-asight-violet/30"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    value={row.statique}
                    onChange={(e) => updateLocal(row.id, { statique: Number(e.target.value) })}
                    onBlur={(e) => saveField(row.id, { statique: Number(e.target.value) })}
                    className="w-full rounded-lg border border-asight-muted bg-asight-lavande/20 px-2 py-1.5 text-asight-dark outline-none hover:border-asight-violet/50 focus:border-asight-violet focus:bg-white focus:ring-2 focus:ring-asight-violet/30"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    value={row.motion}
                    onChange={(e) => updateLocal(row.id, { motion: Number(e.target.value) })}
                    onBlur={(e) => saveField(row.id, { motion: Number(e.target.value) })}
                    className="w-full rounded-lg border border-asight-muted bg-asight-lavande/20 px-2 py-1.5 text-asight-dark outline-none hover:border-asight-violet/50 focus:border-asight-violet focus:bg-white focus:ring-2 focus:ring-asight-violet/30"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    value={row.ugc}
                    onChange={(e) => updateLocal(row.id, { ugc: Number(e.target.value) })}
                    onBlur={(e) => saveField(row.id, { ugc: Number(e.target.value) })}
                    className="w-full rounded-lg border border-asight-muted bg-asight-lavande/20 px-2 py-1.5 text-asight-dark outline-none hover:border-asight-violet/50 focus:border-asight-violet focus:bg-white focus:ring-2 focus:ring-asight-violet/30"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    value={row.declinaisons}
                    onChange={(e) => updateLocal(row.id, { declinaisons: Number(e.target.value) })}
                    onBlur={(e) => saveField(row.id, { declinaisons: Number(e.target.value) })}
                    className="w-full rounded-lg border border-asight-muted bg-asight-lavande/20 px-2 py-1.5 text-asight-dark outline-none hover:border-asight-violet/50 focus:border-asight-violet focus:bg-white focus:ring-2 focus:ring-asight-violet/30"
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    value={row.facturation}
                    onChange={(e) => {
                      const facturation = e.target.value as BillingStatus;
                      updateLocal(row.id, { facturation });
                      saveField(row.id, { facturation });
                    }}
                    className={`w-full rounded-full border-0 px-2 py-1 text-xs font-semibold outline-none focus:ring-2 focus:ring-asight-violet/30 ${FACTURATION_BADGE[row.facturation]}`}
                  >
                    {FACTURATION_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2 text-center">
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
                <td className="px-2 py-3" colSpan={3}>
                  Total
                </td>
                <td className="px-2 py-3">{totalSum.toLocaleString('fr-FR')} €</td>
                <td className="px-2 py-3" colSpan={8} />
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
