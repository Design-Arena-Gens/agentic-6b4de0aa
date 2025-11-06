import { NextResponse } from 'next/server';
import { deleteSession, getSession } from '@/lib/session-store';

type Params = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: Params) {
  const session = getSession(params.id);
  if (!session) {
    return NextResponse.json({ message: 'Session not found' }, { status: 404 });
  }
  return NextResponse.json({ id: session.id, baseUrl: session.baseUrl, createdAt: session.createdAt });
}

export async function DELETE(_request: Request, { params }: Params) {
  deleteSession(params.id);
  return NextResponse.json({ ok: true });
}
