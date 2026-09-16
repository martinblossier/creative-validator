import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center">
      <Logo />
      <h1 className="font-heading text-3xl font-bold text-asight-dark">
        Creative Validator
      </h1>
      <p className="max-w-md font-body text-asight-dark/70">
        Outil de validation de créatives publicitaires pour les clients d’ASight.
      </p>
      <Link
        href="/admin"
        className="rounded-full bg-asight-violet px-8 py-3 font-body font-semibold text-white transition-colors hover:bg-asight-violet-dark"
      >
        Accéder à l’espace admin
      </Link>
    </main>
  );
}
