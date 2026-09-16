'use client';

import { useState, FormEvent } from 'react';
import type { TeamRole } from '@/lib/team-store';

export function AddTeamMemberModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (name: string, role: TeamRole) => void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<TeamRole>('creative');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const res = await fetch('/api/creative/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), role }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Une erreur est survenue.');
        setCreating(false);
        return;
      }

      onAdded(name.trim(), role);
    } catch {
      setError('Une erreur est survenue. Réessayez.');
      setCreating(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-asight-dark/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-heading text-lg font-bold text-asight-dark">
          Ajouter une personne à l&apos;équipe créa
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-body text-sm font-semibold text-asight-dark">
              Prénom
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Sarah"
              required
              autoFocus
              className="rounded-lg border border-asight-muted bg-white px-4 py-3 font-body text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-body text-sm font-semibold text-asight-dark">
              Rôle
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TeamRole)}
              className="rounded-lg border border-asight-muted bg-white px-4 py-3 font-body text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet"
            >
              <option value="creative">Créatif·ve</option>
              <option value="traffic">Traffic Manager</option>
            </select>
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
              {creating ? 'Ajout…' : 'Ajouter'}
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
      </div>
    </div>
  );
}
