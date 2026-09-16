'use client';

import { useEffect, useState, useCallback } from 'react';
import type { AgendaEntry } from '@/lib/agenda';
import type { Frequency } from '@/lib/client-meta';

const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  bimonthly: 'Bimestriel',
  quarterly: 'Trimestriel',
};

const MONTH_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function AgendaView() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [entries, setEntries] = useState<AgendaEntry[] | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/creative/agenda?year=${year}`);
    const data = await res.json();
    setEntries(data.entries ?? []);
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveOverride(entry: AgendaEntry) {
    if (!editValue) return;
    await fetch('/api/creative/agenda/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: entry.clientName,
        originalDate: entry.originalDate,
        overrideDate: editValue,
      }),
    });
    setEditingKey(null);
    load();
  }

  if (entries === null) {
    return <p className="font-body text-asight-dark/60">Chargement…</p>;
  }

  const upcoming = entries.filter((e) => e.isUpcoming);

  const byMonth = new Map<number, AgendaEntry[]>();
  for (const e of entries) {
    const month = Number(e.date.split('-')[1]) - 1;
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month)!.push(e);
  }

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-asight-dark">Agenda</h1>
          <p className="font-body text-sm text-asight-dark/50">
            Dates prévues de production pour les clients récurrents.
          </p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg border border-asight-muted bg-white px-4 py-2 font-body text-sm text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet"
        >
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {upcoming.length > 0 && (
        <div className="mt-6 rounded-2xl border-t-4 border-asight-violet bg-asight-lavande p-4">
          <p className="mb-2 font-body text-sm font-bold text-asight-dark">
            🔔 À proposer dans les 10 prochains jours
          </p>
          <div className="flex flex-col gap-1">
            {upcoming.map((e) => (
              <p key={`${e.clientName}-${e.originalDate}`} className="font-body text-sm text-asight-dark">
                <span className="font-semibold">{e.clientName}</span> — {formatDate(e.date)}
              </p>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="mt-6 font-body text-asight-dark/60">
          Aucun client récurrent avec une cadence configurée pour le moment.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-6">
          {MONTH_LABELS.map((label, month) => {
            const monthEntries = byMonth.get(month);
            if (!monthEntries || monthEntries.length === 0) return null;

            return (
              <div key={month}>
                <h2 className="mb-2 font-heading text-sm font-bold uppercase tracking-wide text-asight-dark/50">
                  {label}
                </h2>
                <div className="flex flex-col gap-2">
                  {monthEntries.map((e) => {
                    const key = `${e.clientName}-${e.originalDate}`;
                    return (
                      <div
                        key={key}
                        className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
                          e.isUpcoming
                            ? 'border-asight-violet bg-asight-lavande/60'
                            : 'border-asight-lavande bg-white'
                        }`}
                      >
                        <span className="font-body text-sm font-bold text-asight-dark">
                          {e.clientName}
                        </span>
                        <span className="font-body text-sm text-asight-dark/70">
                          {formatDate(e.date)}
                        </span>
                        <span className="rounded-full bg-asight-lavande px-2.5 py-1 font-body text-xs font-semibold text-asight-dark/60">
                          {FREQUENCY_LABELS[e.frequency]}
                        </span>
                        {e.isOverridden && (
                          <span className="font-body text-xs text-asight-dark/40">
                            (ajusté manuellement)
                          </span>
                        )}

                        <div className="ml-auto">
                          {editingKey === key ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="date"
                                value={editValue}
                                onChange={(ev) => setEditValue(ev.target.value)}
                                autoFocus
                                className="rounded-lg border border-asight-muted px-2 py-1.5 font-body text-xs outline-none focus:ring-2 focus:ring-asight-violet"
                              />
                              <button
                                onClick={() => saveOverride(e)}
                                className="rounded-full bg-asight-violet px-3 py-1.5 font-body text-xs font-semibold text-white hover:bg-asight-violet-dark"
                              >
                                Enregistrer
                              </button>
                              <button
                                onClick={() => setEditingKey(null)}
                                className="font-body text-xs text-asight-dark/40 hover:text-asight-dark"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingKey(key);
                                setEditValue(e.date);
                              }}
                              className="font-body text-xs font-semibold text-asight-violet hover:underline"
                            >
                              Modifier la date
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
