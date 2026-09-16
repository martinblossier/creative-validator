'use client';

import { useState, FormEvent } from 'react';

function suggestedName(clientName: string, nextBatchNumber: number): string {
  const date = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `${clientName} - B${nextBatchNumber} - ${date}`;
}

export function NewCycleModal({
  clientName,
  nextBatchNumber,
  onClose,
  onCreated,
}: {
  clientName: string;
  nextBatchNumber: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [newPortalUrl, setNewPortalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedPortal, setCopiedPortal] = useState(false);

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
      setNewPortalUrl(`${window.location.origin}/portal/${data.session.token}`);
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

  function copyPortalUrl() {
    if (!newPortalUrl) return;
    navigator.clipboard.writeText(newPortalUrl);
    setCopiedPortal(true);
    setTimeout(() => setCopiedPortal(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-asight-dark/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 font-heading text-lg font-bold text-asight-dark">
          Nouveau cycle pour {clientName}
        </h3>
        <p className="mb-4 font-body text-sm text-asight-dark/50">
          Nom suggéré : <span className="font-semibold text-asight-dark/70">
            {suggestedName(clientName, nextBatchNumber)}
          </span>
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

            <p className="mb-2 mt-4 font-body text-sm font-semibold text-asight-dark">
              Portail client (vue d&apos;ensemble tous batchs) :
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="flex-1 break-all rounded-lg bg-white px-4 py-3 font-body text-sm text-asight-violet">
                {newPortalUrl}
              </code>
              <button
                onClick={copyPortalUrl}
                className="whitespace-nowrap rounded-full border-2 border-asight-violet px-5 py-2.5 font-body text-sm font-semibold text-asight-violet transition-colors hover:bg-white"
              >
                {copiedPortal ? 'Copié !' : 'Copier'}
              </button>
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full rounded-full bg-asight-violet px-6 py-3 font-body font-semibold text-white transition-colors hover:bg-asight-violet-dark"
            >
              Terminé
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-sm font-semibold text-asight-dark">
                URL du nouveau dossier Drive
              </label>
              <input
                value={driveFolderUrl}
                onChange={(e) => setDriveFolderUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                required
                autoFocus
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
                {creating ? 'Création…' : 'Créer et générer le lien'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="font-body text-sm font-semibold text-asight-dark/50 hover:text-asight-dark"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
