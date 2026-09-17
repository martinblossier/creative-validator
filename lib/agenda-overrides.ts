import { kv } from './kv';

const KEY = (clientName: string) => `creative:agenda_overrides:${clientName}`;

/** Manual date overrides for projected occurrences, keyed by the original computed date. */
export async function getAgendaOverrides(clientName: string): Promise<Record<string, string>> {
  return (await kv.get<Record<string, string>>(KEY(clientName))) ?? {};
}

export async function setAgendaOverride(
  clientName: string,
  originalDate: string,
  overrideDate: string
): Promise<void> {
  const current = await getAgendaOverrides(clientName);
  current[originalDate] = overrideDate;
  await kv.set(KEY(clientName), current);
}

export async function deleteAgendaOverrides(clientName: string): Promise<void> {
  await kv.del(KEY(clientName));
}
