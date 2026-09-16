import { Logo } from '@/components/Logo';

export function SummaryScreen({
  validated,
  rejected,
}: {
  validated: number;
  rejected: number;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center">
      <Logo />
      <h1 className="font-heading text-2xl font-bold text-asight-dark sm:text-3xl">
        Review terminée ✅ — {validated} validées, {rejected} à retravailler
      </h1>
      <p className="rounded-2xl bg-asight-lavande px-6 py-4 font-body text-asight-dark">
        Les résultats ont été envoyés.
      </p>
      <p className="font-body text-sm font-light text-asight-muted">
        Powered by ASight
      </p>
    </main>
  );
}
