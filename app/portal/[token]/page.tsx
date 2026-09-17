import { getSession } from '@/lib/sessions';
import { getClientsOverview } from '@/lib/creative';
import { ClientPortal } from '@/components/portal/ClientPortal';
import { Logo } from '@/components/Logo';

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { debug?: string };
}) {
  const session = await getSession(params.token);

  if (searchParams.debug) {
    const clients = session ? await getClientsOverview() : [];
    return (
      <pre style={{ whiteSpace: 'pre-wrap', padding: 20 }}>
        {JSON.stringify(
          {
            paramsToken: params.token,
            session,
            clientNames: clients.map((c) => c.clientName),
            matchFound: session ? clients.some((c) => c.clientName === session.clientName) : null,
          },
          null,
          2
        )}
      </pre>
    );
  }

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
