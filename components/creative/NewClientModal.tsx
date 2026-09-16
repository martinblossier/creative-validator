'use client';

import { useState, FormEvent } from 'react';
import type { Recurrence, Frequency } from '@/lib/client-meta';

const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  bimonthly: 'Bimestriel',
  quarterly: 'Trimestriel',
};

export function NewClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (clientName: string) => void;
}) {
  const [clientName, setClientName] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [recurrence, setRecurrence] = useState<Recurrence | ''>('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [referenceDate, setReferenceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [value, setValue] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!recurrence) {
      setError('Merci de préciser si ce client est récurrent ou one shot.');
      return;
    }

    if (recurrence === 'one_shot' && (!value || Number(value) <= 0)) {
      setError('Merci de préciser la valeur associée à ce projet.');
      return;
    }

    setCreating(true);

    try {
      const res = await fetch('/api/creative/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          driveFolderUrl,
          recurrence,
          ...(recurrence === 'recurrent' ? { frequency, referenceDate } : {}),
          ...(recurrence === 'one_shot' ? { value: Number(value) } : {}),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Une erreur est survenue.');
        setCreating(false);
        return;
      }

      setNewUrl(`${window.location.origin}/review/${data.session.token}`);
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
          Nouveau client
        </h3>
        <p className="mb-4 font-body text-sm text-asight-dark/50">
          Crée le premier cycle de validation (V1) pour un nouveau client.
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
              onClick={() => onCreated(clientName.trim())}
              className="mt-4 w-full rounded-full bg-asight-violet px-6 py-3 font-body font-semibold text-white transition-colors hover:bg-asight-violet-dark"
            >
              Terminé
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="font-body text-sm font-semibold text-asight-dark">
                Nom du client
              </label>
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex : Même Pas Cap"
                required
                autoFocus
                className="rounded-lg border border-asight-muted bg-white px-4 py-3 font-body text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-body text-sm font-semibold text-asight-dark">
                URL du dossier Drive
              </label>
              <input
                value={driveFolderUrl}
                onChange={(e) => setDriveFolderUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                required
                className="rounded-lg border border-asight-muted bg-white px-4 py-3 font-body text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-body text-sm font-semibold text-asight-dark">
                Type de client
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRecurrence('recurrent')}
                  className={`flex-1 rounded-lg border-2 px-4 py-3 font-body text-sm font-semibold transition-colors ${
                    recurrence === 'recurrent'
                      ? 'border-asight-violet bg-asight-lavande text-asight-violet'
                      : 'border-asight-muted text-asight-dark/60 hover:border-asight-violet/50'
                  }`}
                >
                  Récurrent
                </button>
                <button
                  type="button"
                  onClick={() => setRecurrence('one_shot')}
                  className={`flex-1 rounded-lg border-2 px-4 py-3 font-body text-sm font-semibold transition-colors ${
                    recurrence === 'one_shot'
                      ? 'border-asight-violet bg-asight-lavande text-asight-violet'
                      : 'border-asight-muted text-asight-dark/60 hover:border-asight-violet/50'
                  }`}
                >
                  One shot
                </button>
              </div>
            </div>

            {recurrence === 'recurrent' && (
              <div className="flex flex-col gap-3 rounded-lg bg-asight-lavande/40 p-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-body text-sm font-semibold text-asight-dark">
                    Fréquence
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as Frequency)}
                    className="rounded-lg border border-asight-muted bg-white px-4 py-3 font-body text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet"
                  >
                    {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                      <option key={f} value={f}>
                        {FREQUENCY_LABELS[f]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-body text-sm font-semibold text-asight-dark">
                    Date de référence
                  </label>
                  <input
                    type="date"
                    value={referenceDate}
                    onChange={(e) => setReferenceDate(e.target.value)}
                    required
                    className="rounded-lg border border-asight-muted bg-white px-4 py-3 font-body text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet"
                  />
                </div>
                <p className="font-body text-xs text-asight-dark/50">
                  Sert de point de départ pour projeter les prochaines dates de production dans
                  l&apos;agenda.
                </p>
              </div>
            )}

            {recurrence === 'one_shot' && (
              <div className="flex flex-col gap-1.5 rounded-lg bg-asight-lavande/40 p-3">
                <label className="font-body text-sm font-semibold text-asight-dark">
                  Valeur associée (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Ex : 3000"
                  required
                  className="rounded-lg border border-asight-muted bg-white px-4 py-3 font-body text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet"
                />
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-asight-red/10 px-3 py-2 font-body text-sm text-asight-red">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={
                  creating ||
                  !recurrence ||
                  (recurrence === 'one_shot' && (!value || Number(value) <= 0))
                }
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
