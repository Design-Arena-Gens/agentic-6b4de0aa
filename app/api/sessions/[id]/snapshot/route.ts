import { NextResponse } from 'next/server';
import { load, type CheerioAPI } from 'cheerio';
import { getSession } from '@/lib/session-store';
import { resolveTargetUrl } from '@/lib/url';

type Params = {
  params: {
    id: string;
  };
};

function extractForms($: CheerioAPI, baseUrl: string) {
  return $('form')
    .map((_, form) => {
      const id = $(form).attr('id') ?? `form-${_}`;
      const action = resolveTargetUrl(baseUrl, $(form).attr('action') ?? baseUrl);
      const method = ($(form).attr('method') ?? 'GET').toUpperCase();
      const fields: {
        name: string;
        type: string;
        label?: string;
        value?: string;
      }[] = [];

      $(form)
        .find('input, textarea, select')
        .each((__, element) => {
          const name = $(element).attr('name');
          if (!name) return;
          const type = $(element).prop('tagName')?.toLowerCase() === 'input' ? $(element).attr('type') ?? 'text' : $(element).prop('tagName')!.toLowerCase();
          const idAttr = $(element).attr('id');
          const explicitLabel = idAttr ? $(`label[for="${idAttr}"]`).first().text().trim() : undefined;
          const parentLabel = $(element).parents('label').first().text().trim() || undefined;
          const label = explicitLabel || parentLabel;
          const value = $(element).attr('value') ?? ($(element).text().trim() || undefined);
          fields.push({ name, type, label, value });
        });

      return {
        id,
        action,
        method,
        fields,
      };
    })
    .get();
}

function extractLinks($: CheerioAPI, baseUrl: string) {
  return $('a')
    .map((_, element) => {
      const href = $(element).attr('href');
      if (!href) return undefined;
      return {
        href: resolveTargetUrl(baseUrl, href),
        text: $(element).text().trim(),
      };
    })
    .get()
    .filter(Boolean)
    .slice(0, 200);
}

export async function GET(request: Request, { params }: Params) {
  const session = getSession(params.id);
  if (!session) {
    return NextResponse.json({ message: 'Session not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const target = searchParams.get('url') ?? undefined;
  const resolvedUrl = resolveTargetUrl(session.baseUrl, target);

  try {
    const response = await session.client.get(resolvedUrl, { responseType: 'text' });
    const html = typeof response.data === 'string' ? response.data : String(response.data);
    const $ = load(html);
    const title = $('title').first().text().trim() || null;

    const finalUrl = (response.request as any)?.res?.responseUrl ?? resolvedUrl;
    return NextResponse.json({
      url: finalUrl,
      status: response.status,
      statusText: response.statusText,
      title,
      headers: response.headers,
      html,
      forms: extractForms($, resolvedUrl),
      links: extractLinks($, resolvedUrl),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Failed to fetch snapshot',
      },
      { status: 500 }
    );
  }
}
