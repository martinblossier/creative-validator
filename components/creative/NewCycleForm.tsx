'use client';

import { useState, FormEvent } from 'react';

export function NewCycleForm({
  clientName,
  nextBatchNumber,
  onCreated,
}: {
  clientName: string;
  nextBatchNumber: number;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const res = await fetch('/api/creative/sessions', {
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

      setNewUrl(`${window.location.origin}/review/${data.session.token}`);
      setDriveFolderUrl('');
      onCreated();
    } catch {
      setError('Une erreur est survenue. Réessayez.');
    } finally {
      setCreating(false);
    }
  }

  function copyUrl() {
    if (!newUrl) return;
    navigator.clipboard.writeText(newUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setOpen(false);
    setNewUrl(null);
    setError(null);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-6 rounded-full border-2 border-asight-violet px-6 py-3 font-body font-semibold text-asight-violet transition-colors hover:bg-asight-lavande"
      >
        + Lancer un nouveau cycle
      </button>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-asight-lavande bg-white p-6 shadow-card">
      <h3 className="mb-1 font-heading text-lg font-bold text-asight-dark">
        Nouveau cycle pour {clientName}
      </h3>
      <p className="mb-4 font-body text-sm text-asight-dark/50">
        Ce cycle sera le V{nextBatchNumber}.
      </p>

      {newUrl ? (
        <div className="rounded-xl border-t-4 border-asight-violet bg-asight-lavande p-4">
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
          <button
            onClick={reset}
            className="mt-4 font-body text-sm font-semibold text-asight-dark/50 hover:text-asight-dark"
          >
            Fermer
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-body text-sm font-semibold text-asight-dark">
              Client
            </label>
            <input
              value={clientName}
              disabled
              className="rounded-lg border border-asight-muted bg-asight-lavande/50 px-4 py-3 font-body text-asight-dark/60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body text-sm font-semibold text-asight-dark">
              URL du nouveau dossier Drive
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

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={creating}
              className="rounded-full bg-asight-violet px-6 py-3 font-body font-semibold text-white transition-colors hover:bg-asight-violet-dark disabled:opacity-50"
            >
              {creating ? 'Création…' : 'Créer et générer le lien annonceur'}
            </button>
            <button
              type="button"
              onClick={reset}
              className="font-body text-sm font-semibold text-asight-dark/50 hover:text-asight-dark"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
