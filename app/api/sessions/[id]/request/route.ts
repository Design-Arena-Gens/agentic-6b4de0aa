import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/session-store';
import { resolveTargetUrl, safeParseJson } from '@/lib/url';
import type { Cookie } from 'tough-cookie';

type Params = {
  params: {
    id: string;
  };
};

const schema = z.object({
  method: z.string().default('GET'),
  url: z.string().optional(),
  headers: z.union([z.record(z.any()), z.string()]).optional(),
  body: z.any().optional(),
});

function normaliseHeaders(input: unknown): Record<string, string> | undefined {
  if (typeof input === 'string') {
    return safeParseJson<Record<string, string>>(input) ?? undefined;
  }
  if (input && typeof input === 'object') {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (value == null) continue;
      headers[key] = Array.isArray(value) ? value.map(String).join(', ') : String(value);
    }
    return headers;
  }
  return undefined;
}

function prepareBody(raw: unknown) {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const parsed = safeParseJson(trimmed);
    return parsed ?? trimmed;
  }
  return raw;
}

export async function POST(request: Request, { params }: Params) {
  const session = getSession(params.id);
  if (!session) {
    return NextResponse.json({ message: 'Session not found' }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.errors.map((issue) => issue.message).join(', ') }, { status: 400 });
  }

  const method = parsed.data.method.toUpperCase();
  const resolvedUrl = resolveTargetUrl(session.baseUrl, parsed.data.url);
  const headers = normaliseHeaders(parsed.data.headers);
  const body = prepareBody(parsed.data.body);

  try {
    const response = await session.client.request({
      method,
      url: resolvedUrl,
      headers,
      data: method === 'GET' || method === 'HEAD' ? undefined : body,
      validateStatus: () => true,
    });

    const rawData = response.data;
    let data: unknown = rawData;
    if (Buffer.isBuffer(rawData)) {
      data = {
        encoding: 'base64',
        data: Buffer.from(rawData).toString('base64'),
      };
    }

    const finalUrl = (response.request as any)?.res?.responseUrl ?? resolvedUrl;
    return NextResponse.json({
      url: finalUrl,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data,
      cookies: session.jar.getCookiesSync(resolvedUrl).map((cookie: Cookie) => cookie.toJSON()),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Request failed',
      },
      { status: 500 }
    );
  }
}
