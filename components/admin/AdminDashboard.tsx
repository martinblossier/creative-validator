'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@/lib/sessions';

function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
}

export function AdminDashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [clientName, setClientName] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadSessions = useCallback(async () => {
    const res = await fetch('/api/sessions');
    if (res.status === 401) {
      router.refresh();
      return;
    }
    const data = await res.json();
    setSessions(data.sessions ?? []);
  }, [router]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    setNewUrl(null);
    setCopied(false);

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, driveFolderUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Une erreur est survenue.');
        setCreating(false);
        return;
      }

      const url = `${window.location.origin}/review/${data.session.token}`;
      setNewUrl(url);
      setClientName('');
      setDriveFolderUrl('');
      await loadSessions();
    } catch {
      setError('Une erreur est survenue. Réessayez.');
    } finally {
      setCreating(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.refresh();
  }

  function copyUrl() {
    if (!newUrl) return;
    navigator.clipboard.writeText(newUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between bg-asight-violet px-6 py-4">
        <span className="font-heading text-xl font-bold text-white">ASight</span>
        <div className="flex items-center gap-4">
          <span className="font-body text-sm text-white/80">Panneau admin</span>
          <button
            onClick={handleLogout}
            className="rounded-full bg-white/15 px-4 py-1.5 font-body text-sm font-semibold text-white transition-colors hover:bg-white/25"
          >
            Déconnexion
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-6 font-heading text-2xl font-bold text-asight-dark">
          Nouvelle session client
        </h1>

        <form
          onSubmit={handleCreate}
          className="mb-10 flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-card"
        >
          <div className="flex flex-col gap-1.5">
            <label className="font-body text-sm font-semibold text-asight-dark">
              Nom du client
            </label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex : Même Pas Cap"
              required
              className="rounded-lg border border-asight-muted bg-white px-4 py-3 font-body text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body text-sm font-semibold text-asight-dark">
              Lien du dossier Google Drive
            </label>
            <input
              value={driveFolderUrl}
              onChange={(e) => setDriveFolderUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              required
              className="rounded-lg border border-asight-muted bg-white px-4 py-3 font-body text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-asight-red/10 px-3 py-2 font-body text-sm text-asight-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={creating}
            className="self-start rounded-full bg-asight-violet px-6 py-3 font-body font-semibold text-white transition-colors hover:bg-asight-violet-dark disabled:opacity-50"
          >
            {creating ? 'Création…' : 'Créer la session'}
          </button>
        </form>

        {newUrl && (
          <div className="mb-10 rounded-2xl border-t-4 border-asight-violet bg-asight-lavande p-6 shadow-card">
            <p className="mb-2 font-body text-sm font-semibold text-asight-dark">
              Lien à partager avec le client :
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="flex-1 break-all rounded-lg bg-white px-4 py-3 font-body text-sm text-asight-violet">
                {newUrl}
              </code>
              <button
                onClick={copyUrl}
                className="whitespace-nowrap rounded-full bg-asight-violet px-5 py-2.5 font-body text-sm font-semibold text-white transition-colors hover:bg-asight-violet-dark"
              >
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
          </div>
        )}

        <h2 className="mb-4 font-heading text-xl font-bold text-asight-dark">
          Sessions existantes
        </h2>

        {sessions === null && (
          <p className="font-body text-asight-dark/60">Chargement…</p>
        )}

        {sessions !== null && sessions.length === 0 && (
          <p className="font-body text-asight-dark/60">
            Aucune session pour le moment.
          </p>
        )}

        <ul className="flex flex-col gap-3">
          {sessions?.map((session) => (
            <li
              key={session.token}
              className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-heading font-bold text-asight-dark">
                  {session.clientName} - B{session.batchNumber} - {formatMonthYear(session.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-full bg-asight-lavande px-4 py-1.5 font-body text-sm font-semibold text-asight-violet">
                  {session.reviewedCount} / {session.totalCreatives ?? '?'}
                </span>
                <a
                  href={`/review/${session.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-asight-violet px-4 py-1.5 font-body text-sm font-semibold text-asight-violet transition-colors hover:bg-asight-lavande"
                >
                  Ouvrir
                </a>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
