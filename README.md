# Universal Website API Gateway

A Next.js application that spins up cookie-aware browsing sessions so you can interrogate and automate any website through a clean JSON API. Create a session, capture DOM snapshots, inspect links and forms, then fire arbitrary HTTP requests that persist cookies across calls — all from the included UI or your own HTTP client.

## Features

- 🔐 Isolated sessions with automatic cookie jar management
- 🧠 Intelligent URL resolution for relative and absolute targets
- 🧾 Snapshot endpoint that returns HTML, metadata, detected forms, and crawlable links
- 🚀 Unified request endpoint for GET/POST/PUT/PATCH/DELETE with custom headers and JSON/text bodies
- 🧰 React control panel for exploring responses and quickly prototyping API flows
- 🌗 Tailwind-powered dark UI ready for production deployment on Vercel

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to launch the control panel.

### Production build

```bash
npm run build
npm start
```

## API Overview

All endpoints live under `/api` and speak JSON.

### `POST /api/sessions`

Create (or reuse) a session that tracks cookies for the target origin.

```json
{
  "baseUrl": "https://target-site.example"
}
```

### `GET /api/sessions/{id}/snapshot?url=...`

Fetches a page, returning response metadata, HTML, detected forms, and normalized links.

### `POST /api/sessions/{id}/request`

Proxy a request through the session, maintaining cookies and returning response headers plus body.

```json
{
  "method": "POST",
  "url": "https://target-site.example/api",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "foo": "bar"
  }
}
```

## Deployment

The project ships ready for Vercel. After running the local production build check, deploy with:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-6b4de0aa
```

## Notes

- Sessions are stored in-memory; scale horizontally by replacing `lib/session-store.ts` with a shared persistence layer (Redis, Upstash, etc.).
- Binary responses are returned as base64 so they can be rehydrated safely on the client.
- Respect target site terms of service and robots/automation policies when driving automation.
