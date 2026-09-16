'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { BatchCard } from './BatchCard';
import { NewCycleForm } from './NewCycleForm';
import type { ClientOverview } from '@/lib/creative';

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

export function CreativeDashboard() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOverview[] | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

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

  const client = clients?.find((c) => c.clientName === selectedClient) ?? null;
  const nextBatchNumber = client
    ? (client.batches[client.batches.length - 1]?.batchNumber ?? 0) + 1
    : 1;

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-asight-lavande bg-white lg:flex">
        <div className="border-b border-asight-lavande px-5 py-5">
          <Logo />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
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
                  onClick={() => setSelectedClient(c.clientName)}
                  className={`w-full rounded-lg px-3 py-2 text-left font-body text-sm font-semibold transition-colors ${
                    c.clientName === selectedClient
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

        {clients && clients.length > 0 && (
          <select
            value={selectedClient ?? ''}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="mb-6 w-full rounded-lg border border-asight-muted px-4 py-2 font-body text-sm lg:hidden"
          >
            {clients.map((c) => (
              <option key={c.clientName} value={c.clientName}>
                {c.clientName}
              </option>
            ))}
          </select>
        )}

        {clients === null && (
          <p className="font-body text-asight-dark/60">Chargement…</p>
        )}

        {clients !== null && clients.length === 0 && (
          <p className="font-body text-asight-dark/60">
            Aucun client pour le moment. Créez une session depuis le panneau admin.
          </p>
        )}

        {client && (
          <>
            <h1 className="mb-1 font-heading text-2xl font-bold text-asight-dark">
              {client.clientName}
            </h1>
            <p className="mb-6 font-body text-sm text-asight-dark/50">
              {client.kpis.cyclesCount} round{client.kpis.cyclesCount !== 1 ? 's' : ''} de
              validation
            </p>

            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
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

            <div className="flex flex-col gap-4">
              {client.batches.map((batch) => (
                <BatchCard key={batch.token} batch={batch} />
              ))}
            </div>

            <NewCycleForm
              clientName={client.clientName}
              nextBatchNumber={nextBatchNumber}
              onCreated={load}
            />
          </>
        )}
      </main>
    </div>
  );
}
