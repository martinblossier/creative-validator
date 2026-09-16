'use client';

import { useState } from 'react';

export function DeleteClientModal({
  clientName,
  onClose,
  onDeleted,
}: {
  clientName: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [deleteSheet, setDeleteSheet] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText.trim() === clientName;

  async function handleDelete() {
    if (!canDelete || deleting) return;
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/creative/clients/${encodeURIComponent(clientName)}?deleteSheet=${deleteSheet}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Une erreur est survenue.');
        setDeleting(false);
        return;
      }
      onDeleted();
    } catch {
      setError('Une erreur est survenue. Réessayez.');
      setDeleting(false);
    }
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
          Supprimer {clientName}
        </h3>
        <p className="mb-4 font-body text-sm text-asight-dark/60">
          Ceci supprime définitivement tous les cycles, l&apos;historique de production et les
          lignes du Batch Tracker de ce client. Cette action est irréversible.
        </p>

        <label className="mb-4 flex items-start gap-2 rounded-lg bg-asight-red/5 p-3 font-body text-sm text-asight-dark">
          <input
            type="checkbox"
            checked={deleteSheet}
            onChange={(e) => setDeleteSheet(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Supprimer aussi l&apos;onglet Google Sheets de ce client (tout l&apos;historique de
            validation des créas — encore plus difficile à récupérer).
          </span>
        </label>

        <label className="mb-1.5 block font-body text-sm font-semibold text-asight-dark">
          Tape <span className="font-mono text-asight-red">{clientName}</span> pour confirmer
        </label>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={clientName}
          autoFocus
          className="mb-4 w-full rounded-lg border border-asight-muted bg-white px-4 py-3 font-body text-asight-dark outline-none focus:ring-2 focus:ring-asight-red"
        />

        {error && (
          <p className="mb-4 rounded-lg bg-asight-red/10 px-3 py-2 font-body text-sm text-asight-red">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            className="rounded-full bg-asight-red px-6 py-3 font-body font-semibold text-white transition-colors hover:brightness-90 disabled:opacity-40"
          >
            {deleting ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="font-body text-sm font-semibold text-asight-dark/50 hover:text-asight-dark"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
