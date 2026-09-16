'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';

export function CreativeLogin() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/creative/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Mot de passe incorrect.');
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError('Une erreur est survenue. Réessayez.');
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-card">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-1 text-center font-heading text-xl font-bold text-asight-dark">
          Back-office créa
        </h1>
        <p className="mb-6 text-center font-body text-sm text-asight-dark/60">
          Entrez le mot de passe pour accéder au suivi des créas.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full rounded-lg border border-asight-muted bg-white px-4 py-3 font-body text-asight-dark outline-none transition-shadow focus:ring-2 focus:ring-asight-violet"
          />

          {error && (
            <p className="rounded-lg bg-asight-red/10 px-3 py-2 font-body text-sm text-asight-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-full bg-asight-violet px-6 py-3 font-body font-semibold text-white transition-colors hover:bg-asight-violet-dark disabled:opacity-50"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </main>
  );
}
