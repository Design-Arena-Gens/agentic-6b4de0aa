'use client';

import { FormEvent, useMemo, useState } from 'react';

type Session = {
  id: string;
  baseUrl: string;
  createdAt: string;
};

type Snapshot = {
  url: string;
  status: number;
  statusText: string;
  title: string | null;
  links: { href: string; text: string }[];
  forms: {
    id: string;
    action: string;
    method: string;
    fields: { name: string; type: string; label?: string; value?: string }[];
  }[];
  html: string;
  headers: Record<string, string>;
};

type ApiError = {
  message: string;
  details?: unknown;
};

const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function Home() {
  const [baseUrl, setBaseUrl] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState('');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [requestResult, setRequestResult] = useState<unknown>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [requestPayload, setRequestPayload] = useState('');
  const [requestHeaders, setRequestHeaders] = useState('');
  const [requestMethod, setRequestMethod] = useState('GET');
  const [requestUrl, setRequestUrl] = useState('');

  const absoluteSnapshotUrl = useMemo(() => {
    if (!snapshotUrl) return session?.baseUrl ?? '';
    return snapshotUrl;
  }, [snapshotUrl, session?.baseUrl]);

  const handleCreateSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!baseUrl) return;

    try {
      setCreating(true);
      setGlobalError(null);
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as ApiError;
        throw new Error(payload.message ?? 'Failed to create session');
      }

      const payload = (await response.json()) as Session;
      setSession(payload);
      setSnapshot(null);
      setRequestResult(null);
      setRequestError(null);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Unexpected error');
    } finally {
      setCreating(false);
    }
  };

  const handleSnapshot = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;

    try {
      setLoadingSnapshot(true);
      setRequestResult(null);
      setRequestError(null);
      const query = new URLSearchParams();
      if (absoluteSnapshotUrl) {
        query.set('url', absoluteSnapshotUrl);
      }

      const response = await fetch(`/api/sessions/${session.id}/snapshot?${query.toString()}`);
      if (!response.ok) {
        const payload = (await response.json()) as ApiError;
        throw new Error(payload.message ?? 'Snapshot failed');
      }
      const payload = (await response.json()) as Snapshot;
      setSnapshot(payload);
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : 'Unexpected error');
    } finally {
      setLoadingSnapshot(false);
    }
  };

  const handleRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session) return;

    try {
      setRequestError(null);
      setRequestResult(null);
      const response = await fetch(`/api/sessions/${session.id}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: requestMethod,
          url: requestUrl || absoluteSnapshotUrl || session.baseUrl,
          headers: requestHeaders,
          body: requestPayload,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setRequestError((payload as ApiError).message ?? 'Request failed');
        return;
      }

      setRequestResult(payload);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Unexpected error');
    }
  };

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-2 text-center">
          <h1 className="text-4xl font-semibold">Universal Website API Gateway</h1>
          <p className="text-lg text-slate-300">
            Spin up isolated browsing sessions, inspect forms & links, and programmatically interact with any site via a unified API layer.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6 shadow-xl">
          <h2 className="text-xl font-semibold">1. Create session</h2>
          <form className="mt-4 flex flex-col gap-4 md:flex-row" onSubmit={handleCreateSession}>
            <input
              required
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-slate-100 focus:border-cyan-400 focus:outline-none"
              placeholder="https://target-website.com"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
            />
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-cyan-500 px-5 py-3 font-medium text-slate-900 transition hover:bg-cyan-400 disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create session'}
            </button>
          </form>
          {session && (
            <p className="mt-3 text-sm text-slate-300">
              Session ID: <span className="font-mono text-cyan-400">{session.id}</span>
            </p>
          )}
          {globalError && <p className="mt-3 text-sm text-red-400">{globalError}</p>}
        </section>

        {session && (
          <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
                <h2 className="text-xl font-semibold">2. Snapshot & inspect</h2>
                <form className="mt-4 flex flex-col gap-3" onSubmit={handleSnapshot}>
                  <label className="text-sm text-slate-300">
                    Page URL (optional — defaults to base URL)
                  </label>
                  <input
                    className="rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-slate-100 focus:border-cyan-400 focus:outline-none"
                    placeholder={session.baseUrl}
                    value={snapshotUrl}
                    onChange={(event) => setSnapshotUrl(event.target.value)}
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-500 px-4 py-3 font-medium text-slate-900 transition hover:bg-emerald-400 disabled:opacity-60"
                    disabled={loadingSnapshot}
                  >
                    {loadingSnapshot ? 'Loading…' : 'Capture snapshot'}
                  </button>
                </form>
                {snapshot && (
                  <div className="mt-6 space-y-4 text-sm text-slate-200">
                    <div>
                      <p className="font-semibold text-slate-100">URL</p>
                      <p className="break-all text-cyan-300">{snapshot.url}</p>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <p className="font-semibold text-slate-100">Status</p>
                        <p>
                          {snapshot.status} {snapshot.statusText}
                        </p>
                      </div>
                      {snapshot.title && (
                        <div>
                          <p className="font-semibold text-slate-100">Title</p>
                          <p>{snapshot.title}</p>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-100">Links</p>
                      <ul className="mt-2 max-h-48 space-y-1 overflow-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                        {snapshot.links.map((link) => (
                          <li key={`${link.href}-${link.text}`} className="flex flex-col">
                            <span className="text-xs uppercase tracking-wide text-slate-400">{link.text || 'untitled link'}</span>
                            <span className="break-all font-mono text-[13px] text-cyan-300">{link.href}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-100">Forms</p>
                      <div className="mt-2 space-y-3">
                        {snapshot.forms.length === 0 && <p className="text-slate-400">No forms detected.</p>}
                        {snapshot.forms.map((form) => (
                          <details key={form.id} className="rounded-lg border border-slate-800 bg-slate-950/80 p-3">
                            <summary className="cursor-pointer text-slate-200">
                              {form.method} {form.action}
                            </summary>
                            <div className="mt-3 space-y-2 text-slate-300">
                              {form.fields.map((field, index) => (
                                <div key={`${form.id}-field-${index}`}>
                                  <p className="text-xs uppercase tracking-wide text-slate-400">{field.label ?? field.name}</p>
                                  <p className="font-mono text-[13px] text-cyan-300">
                                    {field.type} {field.name}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold text-slate-100">Raw HTML</summary>
                      <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-slate-800 bg-black/70 p-4 text-xs text-slate-200">
                        {snapshot.html}
                      </pre>
                    </details>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
                <h2 className="text-xl font-semibold">3. Fire API requests</h2>
                <form className="mt-4 space-y-4" onSubmit={handleRequest}>
                  <div className="flex flex-col gap-3 md:flex-row">
                    <select
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-slate-100 focus:border-cyan-400 focus:outline-none md:w-32"
                      value={requestMethod}
                      onChange={(event) => setRequestMethod(event.target.value)}
                    >
                      {methods.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                    <input
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-slate-100 focus:border-cyan-400 focus:outline-none"
                      placeholder={absoluteSnapshotUrl || 'https://example.com/path'}
                      value={requestUrl}
                      onChange={(event) => setRequestUrl(event.target.value)}
                    />
                  </div>
                  <textarea
                    className="h-24 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 font-mono text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    placeholder='Optional JSON body'
                    value={requestPayload}
                    onChange={(event) => setRequestPayload(event.target.value)}
                  />
                  <textarea
                    className="h-24 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 font-mono text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    placeholder={'Optional headers (JSON object)'}
                    value={requestHeaders}
                    onChange={(event) => setRequestHeaders(event.target.value)}
                  />
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-violet-500 px-4 py-3 font-semibold text-slate-900 transition hover:bg-violet-400"
                  >
                    Send request
                  </button>
                </form>
                {requestError && <p className="mt-4 text-sm text-red-400">{requestError}</p>}
                {requestResult != null && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-100">Response payload</summary>
                    <pre className="mt-3 max-h-80 overflow-auto rounded-lg border border-slate-800 bg-black/70 p-4 text-xs text-slate-200">
                      {JSON.stringify(requestResult, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>

            <aside className="sticky top-16 h-max rounded-2xl border border-slate-700 bg-slate-900/50 p-6">
              <h2 className="text-xl font-semibold">API contract</h2>
              <p className="mt-3 text-sm text-slate-300">
                All endpoints expect and return JSON. Include the session ID header <code className="rounded bg-slate-800 px-1 py-0.5">X-Session-Id</code> when calling from your own HTTP client.
              </p>
              <div className="mt-4 space-y-4 text-xs text-slate-200">
                <div>
                  <p className="font-semibold text-slate-100">POST /api/sessions</p>
                  <pre className="mt-2 rounded-lg border border-slate-800 bg-black/70 p-3">{`{
  "baseUrl": "https://target-site.xyz"
}`}</pre>
                </div>
                <div>
                  <p className="font-semibold text-slate-100">GET /api/sessions/&lt;id&gt;/snapshot?url=…</p>
                  <pre className="mt-2 rounded-lg border border-slate-800 bg-black/70 p-3">{`{
  "url": "https://…",
  "forms": [],
  "links": []
}`}</pre>
                </div>
                <div>
                  <p className="font-semibold text-slate-100">POST /api/sessions/&lt;id&gt;/request</p>
                  <pre className="mt-2 rounded-lg border border-slate-800 bg-black/70 p-3">{`{
  "method": "POST",
  "url": "https://…",
  "headers": {"Content-Type": "application/json"},
  "body": {"key": "value"}
}`}</pre>
                </div>
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
