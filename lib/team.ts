// Plain constants, safe to import from client components.
export const TEAM_MEMBERS = ['Aïda', 'Louana', 'Lisa'] as const;
export type TeamMember = (typeof TEAM_MEMBERS)[number];
