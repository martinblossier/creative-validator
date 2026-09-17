import { kv } from './kv';

export type Recurrence = 'recurrent' | 'one_shot';
export type Frequency = 'weekly' | 'monthly' | 'bimonthly' | 'quarterly';

export type ClientMeta = {
  recurrence: Recurrence;
  frequency?: Frequency; // set only when recurrence === 'recurrent'
  referenceDate?: string; // YYYY-MM-DD, anchor date for the recurrence cadence
  mrr?: number; // €, set only when recurrence === 'recurrent'
  value?: number; // €, set only when recurrence === 'one_shot'
};

const META_KEY = (clientName: string) => `creative:client_meta:${clientName}`;

export async function getClientMeta(clientName: string): Promise<ClientMeta | null> {
  return (await kv.get<ClientMeta>(META_KEY(clientName))) ?? null;
}

export async function setClientMeta(clientName: string, meta: ClientMeta): Promise<void> {
  await kv.set(META_KEY(clientName), meta);
}

export async function deleteClientMeta(clientName: string): Promise<void> {
  await kv.del(META_KEY(clientName));
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
