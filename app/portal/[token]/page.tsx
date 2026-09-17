import { getSession } from '@/lib/sessions';
import { getClientsOverview } from '@/lib/creative';
import { ClientPortal } from '@/components/portal/ClientPortal';
import { Logo } from '@/components/Logo';

// This page reads live KV/Sheets data directly (not through an API route with
// its own revalidate window), so it must never be served from Next's cache —
// otherwise clients can get stuck seeing stale data from an earlier deploy.
export const dynamic = 'force-dynamic';

export default async function PortalPage({ params }: { params: { token: string } }) {
  const session = await getSession(params.token);

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <Logo />
        <p className="max-w-md rounded-2xl bg-asight-red/10 px-6 py-4 font-body text-asight-red">
          Ce lien n&apos;est plus valide.
        </p>
      </main>
    );
  }

  const clients = await getClientsOverview();
  const client = clients.find((c) => c.clientName === session.clientName);

  if (!client) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center">
        <Logo />
        <p className="max-w-md rounded-2xl bg-asight-lavande px-6 py-4 font-body text-asight-dark">
          Aucune donnée disponible pour le moment.
        </p>
      </main>
    );
  }

  return <ClientPortal client={client} />;
}
