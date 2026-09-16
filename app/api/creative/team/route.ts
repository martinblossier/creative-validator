import { NextRequest, NextResponse } from 'next/server';
import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { getTeamMembers, addTeamMember, type TeamRole } from '@/lib/team-store';

export async function GET() {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const members = await getTeamMembers();
  return NextResponse.json({ members });
}

export async function POST(req: NextRequest) {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const role: TeamRole = body?.role === 'traffic' ? 'traffic' : 'creative';

  if (!name) {
    return NextResponse.json({ error: 'Nom requis.' }, { status: 400 });
  }

  const members = await addTeamMember(name, role);
  return NextResponse.json({ members });
}
