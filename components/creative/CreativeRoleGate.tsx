'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { CreativeDashboard } from './CreativeDashboard';
import type { TeamMember } from '@/lib/team-store';

const ROLE_KEY = 'creative_role';
const MEMBER_KEY = 'creative_member';

export function CreativeRoleGate({ teamMembers }: { teamMembers: TeamMember[] }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<'traffic' | 'creative' | null>(null);
  const [selectedName, setSelectedName] = useState('');

  const creativeMembers = teamMembers.filter((m) => m.role === 'creative');

  useEffect(() => {
    const savedRole = sessionStorage.getItem(ROLE_KEY);
    const savedMember = sessionStorage.getItem(MEMBER_KEY);

    if (savedRole === 'traffic') {
      setRole('traffic');
      setReady(true);
      return;
    }
    if (savedRole === 'creative' && savedMember) {
      router.replace(`/creative/board?member=${encodeURIComponent(savedMember)}`);
      return;
    }
    setReady(true);
  }, [router]);

  function chooseTraffic() {
    sessionStorage.setItem(ROLE_KEY, 'traffic');
    setRole('traffic');
  }

  function chooseCreative() {
    if (!selectedName) return;
    sessionStorage.setItem(ROLE_KEY, 'creative');
    sessionStorage.setItem(MEMBER_KEY, selectedName);
    router.push(`/creative/board?member=${encodeURIComponent(selectedName)}`);
  }

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-asight-lavande border-t-asight-violet" />
      </main>
    );
  }

  if (role === 'traffic') {
    return <CreativeDashboard />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6">
      <Logo />
      <h1 className="font-heading text-xl font-bold text-asight-dark">Qui êtes-vous ?</h1>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <button
          onClick={chooseTraffic}
          className="rounded-2xl border-2 border-asight-violet bg-white px-6 py-4 font-body font-semibold text-asight-violet transition-colors hover:bg-asight-lavande"
        >
          Je suis Traffic Manager
        </button>

        <div className="rounded-2xl border border-asight-lavande bg-white p-4">
          <p className="mb-3 text-center font-body font-semibold text-asight-dark">
            Je suis Créatif·ve
          </p>
          <select
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
            className="mb-3 w-full rounded-lg border border-asight-muted bg-white px-4 py-3 font-body text-asight-dark outline-none focus:ring-2 focus:ring-asight-violet"
          >
            <option value="">Sélectionner mon prénom</option>
            {creativeMembers.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            onClick={chooseCreative}
            disabled={!selectedName}
            className="w-full rounded-full bg-asight-violet px-6 py-3 font-body font-semibold text-white transition-colors hover:bg-asight-violet-dark disabled:opacity-50"
          >
            Continuer
          </button>
        </div>
      </div>
    </main>
  );
}
