import { kv } from '@vercel/kv';

const TEAM_KEY = 'creative:team_members';
const DEFAULT_TEAM = ['Aïda', 'Louana', 'Lisa'];

export async function getTeamMembers(): Promise<string[]> {
  const members = await kv.get<string[]>(TEAM_KEY);
  if (!members || members.length === 0) {
    await kv.set(TEAM_KEY, DEFAULT_TEAM);
    return DEFAULT_TEAM;
  }
  return members;
}

export async function addTeamMember(name: string): Promise<string[]> {
  const members = await getTeamMembers();
  if (members.includes(name)) return members;
  const updated = [...members, name];
  await kv.set(TEAM_KEY, updated);
  return updated;
}
