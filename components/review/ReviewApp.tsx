'use client';

import { useEffect, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { ProgressBar } from '@/components/review/ProgressBar';
import { CreativeCard } from '@/components/review/CreativeCard';
import { RejectModal } from '@/components/review/RejectModal';
import { SummaryScreen } from '@/components/review/SummaryScreen';
import type { DriveCreative } from '@/lib/drive';

type Status = 'loading' | 'error' | 'empty' | 'reviewing' | 'done';

export function ReviewApp({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [creatives, setCreatives] = useState<DriveCreative[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [validatedCount, setValidatedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/drive?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setErrorMessage(data.error ?? 'Une erreur est survenue.');
          setStatus('error');
          return;
        }

        if (!data.creatives || data.creatives.length === 0) {
          setStatus('empty');
          return;
        }

        setCreatives(data.creatives);
        setStatus('reviewing');
      } catch {
        if (!cancelled) {
          setErrorMessage('Impossible de contacter le serveur.');
          setStatus('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const currentCreative = creatives[currentIndex];

  const advance = useCallback(() => {
    setSubmitError(null);
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next >= creatives.length) {
        setStatus('done');
      }
      return next;
    });
  }, [creatives.length]);

  async function submitDecision(status: 'Validé' | 'À retravailler', comment: string) {
    if (!currentCreative || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          fileId: currentCreative.id,
          fileName: currentCreative.name,
          status,
          comment,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error ?? "Échec de l'envoi. Réessayez.");
        setSubmitting(false);
        return;
      }

      if (status === 'Validé') {
        setValidatedCount((c) => c + 1);
      } else {
        setRejectedCount((c) => c + 1);
      }

      setRejectModalOpen(false);
      setSubmitting(false);
      advance();
    } catch {
      setSubmitError("Échec de l'envoi. Réessayez.");
      setSubmitting(false);
    }
  }

  function handleValidate() {
    submitDecision('Validé', '');
  }

  function handleRejectClick() {
    setSubmitError(null);
    setRejectModalOpen(true);
  }

  function handleRejectConfirm(comment: string) {
    submitDecision('À retravailler', comment);
  }

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <Logo />
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-asight-lavande border-t-asight-violet" />
        <p className="font-body text-asight-dark/60">Chargement des créatives…</p>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <Logo />
        <p className="max-w-md rounded-2xl bg-asight-red/10 px-6 py-4 font-body text-asight-red">
          {errorMessage}
        </p>
      </main>
    );
  }

  if (status === 'empty') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <Logo />
        <p className="max-w-md rounded-2xl bg-asight-lavande px-6 py-4 font-body text-asight-dark">
          Ce dossier ne contient aucune créative à valider pour le moment.
        </p>
      </main>
    );
  }

  if (status === 'done') {
    return <SummaryScreen validated={validatedCount} rejected={rejectedCount} />;
  }

  return (
    <main className="flex min-h-screen flex-col bg-white px-4 pb-10 pt-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <span className="font-body text-xs font-light text-asight-muted">
          Powered by ASight
        </span>
      </div>

      <div className="mx-auto mb-6 w-full max-w-lg">
        <ProgressBar current={currentIndex + 1} total={creatives.length} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <AnimatePresence mode="popLayout" initial={false}>
          {currentCreative && (
            <CreativeCard
              key={currentCreative.id}
              creative={currentCreative}
              onSwipeValidate={handleValidate}
              onSwipeReject={handleRejectClick}
              disabled={submitting}
            />
          )}
        </AnimatePresence>

        {submitError && (
          <p className="max-w-lg rounded-lg bg-asight-red/10 px-4 py-2 text-center font-body text-sm text-asight-red">
            {submitError}
          </p>
        )}

        <div className="flex w-full max-w-lg items-center justify-center gap-4">
          <button
            onClick={handleRejectClick}
            disabled={submitting}
            className="flex-1 rounded-full bg-asight-red px-6 py-4 font-body text-lg font-semibold text-white transition-transform hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            🔄 À retravailler
          </button>
          <button
            onClick={handleValidate}
            disabled={submitting}
            className="flex-1 rounded-full bg-asight-green px-6 py-4 font-body text-lg font-semibold text-asight-dark transition-transform hover:opacity-90 active:scale-95 disabled:opacity-50"
          >
            ✅ Valider
          </button>
        </div>
      </div>

      <RejectModal
        open={rejectModalOpen}
        submitting={submitting}
        onCancel={() => setRejectModalOpen(false)}
        onConfirm={handleRejectConfirm}
      />
    </main>
  );
}
