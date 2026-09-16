import { NextRequest, NextResponse } from 'next/server';
import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { updateSession, type Session } from '@/lib/sessions';
import { getTeamMembers } from '@/lib/team-store';
import { TRAFFIC_STATUSES } from '@/lib/traffic-status';

export async function POST(req: NextRequest) {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';

  if (!token) {
    return NextResponse.json({ error: 'Token requis.' }, { status: 400 });
  }

  const patch: Partial<Session> = {};

  if ('assignedTo' in (body ?? {})) {
    const assignedTo = body.assignedTo === null ? null : body.assignedTo;
    if (assignedTo !== null) {
      const members = await getTeamMembers();
      if (!members.includes(assignedTo)) {
        return NextResponse.json({ error: 'Membre invalide.' }, { status: 400 });
      }
    }
    patch.assignedTo = assignedTo;
  }

  if ('status' in (body ?? {})) {
    if (!TRAFFIC_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
    }
    patch.status = body.status;
  }

  if ('archived' in (body ?? {})) {
    if (typeof body.archived !== 'boolean') {
      return NextResponse.json({ error: 'Valeur d\'archivage invalide.' }, { status: 400 });
    }
    patch.archived = body.archived;
  }

  const session = await updateSession(token, patch);
  if (!session) {
    return NextResponse.json({ error: 'Cycle introuvable.' }, { status: 404 });
  }

  return NextResponse.json({ session });
}
