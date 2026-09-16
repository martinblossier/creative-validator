import { NextRequest, NextResponse } from 'next/server';
import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { updateSession } from '@/lib/sessions';
import { TEAM_MEMBERS } from '@/lib/team';

export async function POST(req: NextRequest) {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';
  const assignedTo = body?.assignedTo === null ? null : body?.assignedTo;

  if (!token) {
    return NextResponse.json({ error: 'Token requis.' }, { status: 400 });
  }

  if (assignedTo !== null && !TEAM_MEMBERS.includes(assignedTo)) {
    return NextResponse.json({ error: 'Membre invalide.' }, { status: 400 });
  }

  const session = await updateSession(token, { assignedTo });
  if (!session) {
    return NextResponse.json({ error: 'Cycle introuvable.' }, { status: 404 });
  }

  return NextResponse.json({ session });
}
