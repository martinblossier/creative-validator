'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { BatchPanel } from './BatchPanel';
import { NewCycleModal } from './NewCycleModal';
import { NewClientModal } from './NewClientModal';
import { DeleteClientModal } from './DeleteClientModal';
import { TrafficManagerView } from './TrafficManagerView';
import { BatchTrackerView } from './BatchTrackerView';
import { AgendaView } from './AgendaView';
import type { ClientOverview } from '@/lib/creative';
import type { TeamMember, TeamRole } from '@/lib/team-store';

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

type View = 'clients' | 'trafic' | 'tracker' | 'agenda';

const NAV_ITEMS: { view: View; label: string; icon: string }[] = [
  { view: 'clients', label: 'Clients', icon: '👥' },
  { view: 'trafic', label: 'Trafic créatif', icon: '🚦' },
  { view: 'tracker', label: 'Batch Tracker', icon: '🗂️' },
  { view: 'agenda', label: 'Agenda', icon: '🗓️' },
];

export function CreativeDashboard() {
  const router = useRouter();
  const [clients, setClients] = useState<ClientOverview[] | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedBatchToken, setSelectedBatchToken] = useState<string | null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newCycleOpen, setNewCycleOpen] = useState(false);
  const [deleteClientTarget, setDeleteClientTarget] = useState<string | null>(null);
  const [view, setView] = useState<View>('clients');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const load = useCallback(async () => {
    const res = await fetch('/api/creative/clients');
    if (res.status === 401) {
      router.refresh();
      return;
    }
    const data = await res.json();
    const loaded: ClientOverview[] = data.clients ?? [];
    setClients(loaded);
  }, [router]);

  const loadTeam = useCallback(async () => {
    const res = await fetch('/api/creative/team');
    if (res.status === 401) return;
    const data = await res.json();
    setTeamMembers(data.members ?? []);
  }, []);

  useEffect(() => {
    load();
    loadTeam();
  }, [load, loadTeam]);

  function handleTeamMemberAdded(name: string, role: TeamRole) {
    setTeamMembers((prev) => (prev.some((m) => m.name === name) ? prev : [...prev, { name, role }]));
  }

  async function handleLogout() {
    await fetch('/api/creative/login', { method: 'DELETE' });
    router.refresh();
  }

  function changeRole() {
    sessionStorage.removeItem('creative_role');
    sessionStorage.removeItem('creative_member');
    router.push('/creative');
  }

  function goToView(v: View) {
    setView(v);
    if (v === 'clients') setSelectedClient(null);
  }

  function handleClientDeleted() {
    setDeleteClientTarget(null);
    setSelectedClient(null);
    load();
  }

  async function handleClientCreated(clientName: string) {
    setNewClientOpen(false);
    await load();
    setSelectedClient(clientName);
    setView('clients');
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
      <aside className="hidden w-72 flex-shrink-0 flex-col border-r border-asight-lavande bg-gradient-to-b from-white to-asight-lavande/30 lg:flex">
        <div className="border-b border-asight-lavande px-5 py-5">
          <Logo />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="mb-6 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.view}>
                <button
                  onClick={() => goToView(item.view)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 font-body text-sm font-semibold transition-colors ${
                    view === item.view
                      ? 'bg-asight-violet text-white shadow-sm'
                      : 'text-asight-dark/70 hover:bg-asight-lavande'
                  }`}
                >
                  <span className="text-base leading-none">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={() => setNewClientOpen(true)}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-asight-violet px-3 py-2.5 font-body text-sm font-semibold text-white transition-colors hover:bg-asight-violet-dark"
          >
            <span className="text-base leading-none">+</span> Nouveau client
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
            {clients?.map((c) => {
              const active = view === 'clients' && c.clientName === selectedClient;
              return (
                <li key={c.clientName}>
                  <button
                    onClick={() => {
                      setSelectedClient(c.clientName);
                      setSelectedBatchToken(null);
                      setView('clients');
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left font-body text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-asight-violet text-white'
                        : 'text-asight-dark hover:bg-asight-lavande'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        active ? 'bg-white/20 text-white' : 'bg-asight-lavande text-asight-violet'
                      }`}
                    >
                      {c.clientName.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{c.clientName}</span>
                    {c.hasUnseenReady && (
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full bg-asight-red"
                        title="Nouvelles créas prêtes"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="flex flex-col gap-2 border-t border-asight-lavande p-4">
          <button
            onClick={changeRole}
            className="font-body text-xs font-semibold text-asight-dark/40 hover:text-asight-dark"
          >
            Changer de rôle
          </button>
          <button
            onClick={handleLogout}
            className="w-full rounded-full bg-asight-lavande px-4 py-2 font-body text-sm font-semibold text-asight-dark transition-colors hover:bg-asight-lavande-alt"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-white px-6 py-8 lg:px-10">
        <div className="mb-6 flex items-center justify-between lg:hidden">
          <Logo />
          <button
            onClick={handleLogout}
            className="rounded-full bg-asight-lavande px-4 py-2 font-body text-sm font-semibold text-asight-dark"
          >
            Déconnexion
          </button>
        </div>

        <div className="-mx-6 mb-6 overflow-x-auto px-6 lg:hidden">
          <div className="flex w-max gap-1 rounded-lg bg-asight-lavande/60 p-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.view}
                onClick={() => goToView(item.view)}
                className={`flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 font-body text-xs font-semibold transition-colors ${
                  view === item.view ? 'bg-white text-asight-dark shadow-sm' : 'text-asight-dark/50'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
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
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-asight-violet px-3 py-2.5 font-body text-sm font-semibold text-white transition-colors hover:bg-asight-violet-dark"
            >
              <span className="text-base leading-none">+</span> Nouveau client
            </button>
          </div>
        )}

        {(view === 'clients' || view === 'trafic') && clients === null && (
          <p className="font-body text-asight-dark/60">Chargement…</p>
        )}

        {(view === 'clients' || view === 'trafic') && clients !== null && clients.length === 0 && (
          <p className="font-body text-asight-dark/60">
            Aucun client pour le moment. Créez une session depuis le panneau admin.
          </p>
        )}

        {view === 'clients' && !client && clients && clients.length > 0 && (
          <div>
            <h1 className="mb-1 font-heading text-2xl font-bold text-asight-dark">Clients</h1>
            <p className="mb-6 font-body text-sm text-asight-dark/50">
              {clients.length} client{clients.length !== 1 ? 's' : ''} — cliquez sur un client pour
              voir ses batchs.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clients.map((c) => (
                <div
                  key={c.clientName}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedClient(c.clientName);
                    setSelectedBatchToken(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedClient(c.clientName);
                      setSelectedBatchToken(null);
                    }
                  }}
                  className="group relative flex cursor-pointer flex-col gap-3 rounded-2xl border border-asight-lavande bg-white p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteClientTarget(c.clientName);
                    }}
                    title="Supprimer ce client"
                    className="absolute right-3 top-3 rounded-full p-1 text-asight-dark/20 opacity-0 transition-opacity hover:bg-asight-red/10 hover:text-asight-red group-hover:opacity-100"
                  >
                    🗑
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-asight-lavande text-sm font-bold text-asight-violet">
                      {c.clientName.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate pr-5 font-heading font-bold text-asight-dark">
                        {c.clientName}
                      </p>
                      <p className="font-body text-xs text-asight-dark/50">
                        {c.kpis.cyclesCount} cycle{c.kpis.cyclesCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {c.hasUnseenReady && (
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full bg-asight-red"
                        title="Nouvelles créas prêtes"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between border-t border-asight-lavande pt-3">
                    <div>
                      <p className="font-body text-xs text-asight-dark/40">Validation</p>
                      <p className="font-heading font-bold text-asight-dark">
                        {Math.round(c.kpis.validationRate * 100)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-body text-xs text-asight-dark/40">Dernière activité</p>
                      <p className="font-body text-sm font-semibold text-asight-dark">
                        {c.kpis.lastActivity ? formatDate(c.kpis.lastActivity) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'trafic' && clients && clients.length > 0 && (
          <TrafficManagerView
            clients={clients}
            teamMembers={teamMembers}
            onRefresh={load}
            onTeamMemberAdded={handleTeamMemberAdded}
          />
        )}

        {view === 'tracker' && <BatchTrackerView />}

        {view === 'agenda' && <AgendaView />}

        {view === 'clients' && client && (
          <>
            <button
              onClick={() => setSelectedClient(null)}
              className="mb-3 font-body text-sm font-semibold text-asight-violet hover:underline"
            >
              ← Tous les clients
            </button>
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
              <div className="flex items-center gap-3">
                {sortedBatches.length > 0 && (
                  <a
                    href={`/portal/${sortedBatches[0].token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border-2 border-asight-violet px-5 py-2.5 font-body text-sm font-semibold text-asight-violet transition-colors hover:bg-asight-lavande"
                  >
                    Voir l&apos;espace client →
                  </a>
                )}
                <button
                  onClick={() => setNewCycleOpen(true)}
                  className="rounded-full bg-asight-violet px-5 py-2.5 font-body text-sm font-semibold text-white transition-colors hover:bg-asight-violet-dark"
                >
                  + Lancer un nouveau cycle
                </button>
                <button
                  onClick={() => setDeleteClientTarget(client.clientName)}
                  title="Supprimer ce client"
                  className="rounded-full p-2.5 text-asight-dark/30 transition-colors hover:bg-asight-red/10 hover:text-asight-red"
                >
                  🗑
                </button>
              </div>
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

      {deleteClientTarget && (
        <DeleteClientModal
          clientName={deleteClientTarget}
          onClose={() => setDeleteClientTarget(null)}
          onDeleted={handleClientDeleted}
        />
      )}
    </div>
  );
}
