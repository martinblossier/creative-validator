import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { CreativeLogin } from '@/components/creative/CreativeLogin';
import { CreativeBoard } from '@/components/creative/CreativeBoard';

export default function CreativeBoardPage({
  searchParams,
}: {
  searchParams: { member?: string };
}) {
  const authenticated = isCreativeAuthenticated();
  if (!authenticated) return <CreativeLogin />;

  const member = searchParams.member ?? '';
  if (!member) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <p className="font-body text-asight-dark/60">
          Aucun membre sélectionné.{' '}
          <a href="/creative" className="font-semibold text-asight-violet hover:underline">
            Retour
          </a>
        </p>
      </main>
    );
  }

  return <CreativeBoard member={member} />;
}
