'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { BatchPanel } from './BatchPanel';
import { NewCycleModal } from './NewCycleModal';
import { NewClientModal } from './NewClientModal';
import { TraficCreatif } from './TraficCreatif';
import type { ClientOverview, BatchOverview } from '@/lib/creative';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-asight-lavande/60 p-4">
      <p className="font-body text-xs font-semibold uppercase tracking-wide text-asight-dark/50">
        {label}
      </p>
      <p className="mt-1 font-heading text-xl font-bold text-asight-dark">{value}</p>
    </div>
  );
}

type View = 'clients' | 'trafic';

export function CreativeDashboard() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOverview[] | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedBatchToken, setSelectedBatchToken] = useState<string | null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newCycleOpen, setNewCycleOpen] = useState(false);
  const [view, setView] = useState<View>('clients');

  const load = useCallback(async () => {
    const res = await fetch('/api/creative/clients');
    if (res.status === 401) {
      router.refresh();
      return;
    }
    const data = await res.json();
    const loaded: ClientOverview[] = data.clients ?? [];
    setClients(loaded);
    setSelectedClient((prev) => prev ?? loaded[0]?.clientName ?? null);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogout() {
    await fetch('/api/creative/login', { method: 'DELETE' });
    router.refresh();
  }

  async function handleClientCreated(clientName: string) {
    setNewClientOpen(false);
    await load();
    setSelectedClient(clientName);
    setView('clients');
  }

  function handleBatchUpdated(
    token: string,
    patch: Partial<Pick<BatchOverview, 'assignedTo' | 'status'>>
  ) {
    setClients((prev) =>
      prev
        ? prev.map((c) => ({
            ...c,
            batches: c.batches.map((b) =>
              b.token === token ? { ...b, ...patch } : b
            ),
          }))
        : prev
    );
  }

  const client = clients?.find((c) => c.clientName === selectedClient) ?? null;
  const nextBatchNumber = client
    ? (client.batches[client.batches.length - 1]?.batchNumber ?? 0) + 1
    : 1;

  // Most recent batch first in the dropdown.
  const sortedBatches = useMemo(
    () => (client ? [...client.batches].reverse() : []),
    [client]
  );

  const selectedBatch =
    sortedBatches.find((b) => b.token === selectedBatchToken) ??
    sortedBatches[0] ??
    null;

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-asight-lavande bg-white lg:flex">
        <div className="border-b border-asight-lavande px-5 py-5">
          <Logo />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-4 flex gap-1 rounded-lg bg-asight-lavande/60 p-1">
            <button
              onClick={() => setView('clients')}
              className={`flex-1 rounded-md px-2 py-1.5 font-body text-xs font-semibold transition-colors ${
                view === 'clients'
                  ? 'bg-white text-asight-dark shadow-sm'
                  : 'text-asight-dark/50 hover:text-asight-dark'
              }`}
            >
              Clients
            </button>
            <button
              onClick={() => setView('trafic')}
              className={`flex-1 rounded-md px-2 py-1.5 font-body text-xs font-semibold transition-colors ${
                view === 'trafic'
                  ? 'bg-white text-asight-dark shadow-sm'
                  : 'text-asight-dark/50 hover:text-asight-dark'
              }`}
            >
              Trafic créatif
            </button>
          </div>

          <button
            onClick={() => setNewClientOpen(true)}
            className="mb-4 w-full rounded-lg border-2 border-dashed border-asight-violet px-3 py-2 font-body text-sm font-semibold text-asight-violet transition-colors hover:bg-asight-lavande"
          >
            + Nouveau client
          </button>
          <p className="mb-2 px-2 font-body text-xs font-semibold uppercase tracking-wide text-asight-dark/40">
            Clients
          </p>
          {clients === null && (
            <p className="px-2 font-body text-sm text-asight-dark/50">Chargement…</p>
          )}
          {clients?.length === 0 && (
            <p className="px-2 font-body text-sm text-asight-dark/50">Aucun client.</p>
          )}
          <ul className="flex flex-col gap-1">
            {clients?.map((c) => (
              <li key={c.clientName}>
                <button
                  onClick={() => {
                    setSelectedClient(c.clientName);
                    setSelectedBatchToken(null);
                    setView('clients');
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left font-body text-sm font-semibold transition-colors ${
                    view === 'clients' && c.clientName === selectedClient
                      ? 'bg-asight-violet text-white'
                      : 'text-asight-dark hover:bg-asight-lavande'
                  }`}
                >
                  {c.clientName}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-asight-lavande p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-full bg-asight-lavande px-4 py-2 font-body text-sm font-semibold text-asight-dark transition-colors hover:bg-asight-lavande-alt"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <Logo />
          <button
            onClick={handleLogout}
            className="rounded-full bg-asight-lavande px-4 py-2 font-body text-sm font-semibold text-asight-dark"
          >
            Déconnexion
          </button>
        </div>

        <div className="mb-6 flex gap-1 rounded-lg bg-asight-lavande/60 p-1 lg:hidden">
          <button
            onClick={() => setView('clients')}
            className={`flex-1 rounded-md px-2 py-1.5 font-body text-xs font-semibold transition-colors ${
              view === 'clients' ? 'bg-white text-asight-dark shadow-sm' : 'text-asight-dark/50'
            }`}
          >
            Clients
          </button>
          <button
            onClick={() => setView('trafic')}
            className={`flex-1 rounded-md px-2 py-1.5 font-body text-xs font-semibold transition-colors ${
              view === 'trafic' ? 'bg-white text-asight-dark shadow-sm' : 'text-asight-dark/50'
            }`}
          >
            Trafic créatif
          </button>
        </div>

        {view === 'clients' && (
          <div className="mb-6 flex flex-col gap-3 lg:hidden">
            {clients && clients.length > 0 && (
              <select
                value={selectedClient ?? ''}
                onChange={(e) => {
                  setSelectedClient(e.target.value);
                  setSelectedBatchToken(null);
                }}
                className="w-full rounded-lg border border-asight-muted px-4 py-2 font-body text-sm"
              >
                {clients.map((c) => (
                  <option key={c.clientName} value={c.clientName}>
                    {c.clientName}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setNewClientOpen(true)}
              className="w-full rounded-lg border-2 border-dashed border-asight-violet px-3 py-2 font-body text-sm font-semibold text-asight-violet transition-colors hover:bg-asight-lavande"
            >
              + Nouveau client
            </button>
          </div>
        )}

        {clients === null && (
          <p className="font-body text-asight-dark/60">Chargement…</p>
        )}

        {clients !== null && clients.length === 0 && (
          <p className="font-body text-asight-dark/60">
            Aucun client pour le moment. Créez une session depuis le panneau admin.
          </p>
        )}

        {view === 'trafic' && clients && clients.length > 0 && (
          <TraficCreatif
            clients={clients}
            onBatchUpdated={handleBatchUpdated}
            onSyncFailed={load}
          />
        )}

        {view === 'clients' && client && (
          <>
            <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-heading text-2xl font-bold text-asight-dark">
                  {client.clientName}
                </h1>
                <p className="font-body text-sm text-asight-dark/50">
                  {client.kpis.cyclesCount} round{client.kpis.cyclesCount !== 1 ? 's' : ''} de
                  validation
                </p>
              </div>
              <button
                onClick={() => setNewCycleOpen(true)}
                className="rounded-full border-2 border-asight-violet px-5 py-2.5 font-body text-sm font-semibold text-asight-violet transition-colors hover:bg-asight-lavande"
              >
                + Lancer un nouveau cycle
              </button>
            </div>

            <div className="mb-8 mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard label="Créas soumises" value={String(client.kpis.totalCreatives)} />
              <KpiCard
                label="Taux de validation"
                value={`${Math.round(client.kpis.validationRate * 100)}%`}
              />
              <KpiCard label="Cycles" value={String(client.kpis.cyclesCount)} />
              <KpiCard
                label="Dernière activité"
                value={client.kpis.lastActivity ? formatDate(client.kpis.lastActivity) : '—'}
              />
            </div>

            {sortedBatches.length === 0 ? (
              <p className="font-body text-asight-dark/60">
                Aucun cycle pour ce client pour le moment.
              </p>
            ) : (
              <>
                <div className="mb-4">
                  <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wide text-asight-dark/40">
                    Cycle
                  </label>
                  <select
                    value={selectedBatch?.token ?? ''}
                    onChange={(e) => setSelectedBatchToken(e.target.value)}
                    className="w-full max-w-md rounded-lg border border-asight-muted bg-white px-4 py-2.5 font-body text-sm text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet"
                  >
                    {sortedBatches.map((b) => (
                      <option key={b.token} value={b.token}>
                        {b.isComplete ? '✓ ' : '… '}
                        {b.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBatch && <BatchPanel batch={selectedBatch} />}
              </>
            )}
          </>
        )}
      </main>

      {newClientOpen && (
        <NewClientModal
          onClose={() => setNewClientOpen(false)}
          onCreated={handleClientCreated}
        />
      )}

      {newCycleOpen && client && (
        <NewCycleModal
          clientName={client.clientName}
          nextBatchNumber={nextBatchNumber}
          onClose={() => setNewCycleOpen(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}
