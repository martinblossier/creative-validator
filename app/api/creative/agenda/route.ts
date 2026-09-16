import { NextRequest, NextResponse } from 'next/server';
import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { getAgendaEntriesForYear } from '@/lib/agenda';

export const revalidate = 60;

export async function GET(req: NextRequest) {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const yearParam = req.nextUrl.searchParams.get('year');
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();

  const entries = await getAgendaEntriesForYear(year);
  return NextResponse.json({ entries });
}
