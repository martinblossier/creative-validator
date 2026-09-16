import { NextResponse } from 'next/server';
import { isCreativeAuthenticated } from '@/lib/creative-auth';
import { getClientsOverview } from '@/lib/creative';

export const revalidate = 60;

export async function GET() {
  if (!isCreativeAuthenticated()) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const clients = await getClientsOverview();
  return NextResponse.json({ clients });
}
