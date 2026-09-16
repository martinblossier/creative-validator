import { kv } from '@vercel/kv';

export type Recurrence = 'recurrent' | 'one_shot';

export type ClientMeta = { recurrence: Recurrence };

const META_KEY = (clientName: string) => `creative:client_meta:${clientName}`;

export async function getClientMeta(clientName: string): Promise<ClientMeta | null> {
  return (await kv.get<ClientMeta>(META_KEY(clientName))) ?? null;
}

export async function setClientMeta(clientName: string, meta: ClientMeta): Promise<void> {
  await kv.set(META_KEY(clientName), meta);
}

export async function getAllClientMeta(
  clientNames: string[]
): Promise<Record<string, ClientMeta>> {
  const entries = await Promise.all(
    clientNames.map(async (name) => [name, await getClientMeta(name)] as const)
  );
  const result: Record<string, ClientMeta> = {};
  for (const [name, meta] of entries) {
    if (meta) result[name] = meta;
  }
  return result;
}
