import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSession, listSessions } from '@/lib/session-store';

const schema = z.object({
  baseUrl: z.string().min(1, 'Base URL is required'),
});

export async function GET() {
  return NextResponse.json(listSessions());
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
      const message = parsed.error.errors.map((issue) => issue.message).join(', ');
      return NextResponse.json({ message }, { status: 400 });
    }

    const session = createSession(parsed.data.baseUrl);
    return NextResponse.json(
      {
        id: session.id,
        baseUrl: session.baseUrl,
        createdAt: session.createdAt,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    );
  }
}
