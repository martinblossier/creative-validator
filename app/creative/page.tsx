import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { CreativeLogin } from '@/components/creative/CreativeLogin';
import { CreativeRoleGate } from '@/components/creative/CreativeRoleGate';
import { getTeamMembers } from '@/lib/team-store';

export default async function CreativePage() {
  const authenticated = isCreativeAuthenticated();
  if (!authenticated) return <CreativeLogin />;

  const teamMembers = await getTeamMembers();
  return <CreativeRoleGate teamMembers={teamMembers} />;
}
