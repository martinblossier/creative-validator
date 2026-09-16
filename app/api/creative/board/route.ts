import { NextRequest, NextResponse } from 'next/server';
import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { getMemberTasks } from '@/lib/creative';

export const revalidate = 60;

export async function GET(req: NextRequest) {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const member = req.nextUrl.searchParams.get('member');
  if (!member) {
    return NextResponse.json({ error: 'Membre manquant.' }, { status: 400 });
  }

  const tasks = await getMemberTasks(member);
  return NextResponse.json({ tasks });
}
