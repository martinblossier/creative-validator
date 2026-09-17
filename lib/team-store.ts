import { kv } from './kv';

export type TeamRole = 'traffic' | 'creative';

export type TeamMember = {
  name: string;
  role: TeamRole;
};

const TEAM_KEY = 'creative:team';
const DEFAULT_TEAM: TeamMember[] = [
  { name: 'Aïda', role: 'creative' },
  { name: 'Louana', role: 'creative' },
  { name: 'Lisa', role: 'creative' },
];

export async function getTeamMembers(): Promise<TeamMember[]> {
  const members = await kv.get<TeamMember[]>(TEAM_KEY);
  if (!members || members.length === 0) {
    await kv.set(TEAM_KEY, DEFAULT_TEAM);
    return DEFAULT_TEAM;
  }
  return members;
}

export async function addTeamMember(
  name: string,
  role: TeamRole
): Promise<TeamMember[]> {
  const members = await getTeamMembers();
  if (members.some((m) => m.name === name)) return members;
  const updated = [...members, { name, role }];
  await kv.set(TEAM_KEY, updated);
  return updated;
}
