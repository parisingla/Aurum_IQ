/**
 * Same-origin bridge to the FastAPI backend service.
 *
 * On Vercel the backend runs as a private Vercel Service and the `BACKEND_URL`
 * service binding carries its per-deployment URL into Next.js server code. The
 * browser talks to this same-origin route only, so the backend URL is never
 * public and no CORS configuration is needed anywhere.
 *
 * Fallback for plain local dev (no Vercel CLI): without `BACKEND_URL` the
 * handler forwards to a FastAPI instance on 127.0.0.1:8000, so `npm run dev`
 * plus the local backend (backend/run.py) exercise the live path end to end.
 *
 * In the data-access layer set NEXT_PUBLIC_API_BASE_URL=/api/backend: every
 * documented GET/POST /api/... call then becomes /api/backend/api/..., and
 * this handler re-prefixes the remainder onto the backend URL verbatim —
 * method, headers, query string and request body pass through unchanged.
 */

import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BridgeContext {
  params: Promise<{ path: string[] }>;
}

const LOCAL_FALLBACK = "http://127.0.0.1:8000";

const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD", "OPTIONS"]);

async function forward(request: NextRequest, context: BridgeContext): Promise<Response> {
  const { path } = await context.params;
  const configured = process.env.BACKEND_URL?.replace(/\/+$/, "");
  const base = configured || LOCAL_FALLBACK;
  const search = new URL(request.url).search;
  const target = `${base}/${path.map(encodeURIComponent).join("/")}${search}`;

  if (!configured) {
    console.warn(
      `[api/backend] BACKEND_URL is not set; falling back to ${LOCAL_FALLBACK}.`,
    );
  }

  const headers = new Headers();
  for (const [name, value] of request.headers.entries()) {
    if (name === "host" || name === "connection" || name === "content-length") continue;
    if (name.startsWith("x-vercel-") || name.startsWith("x-nextjs-")) continue;
    headers.set(name, value);
  }
  if (!headers.has("accept")) headers.set("accept", "application/json");

  const method = request.method.toUpperCase();
  const body = METHODS_WITHOUT_BODY.has(method) ? undefined : await request.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(target, { method, headers, body });
  } catch (error) {
    console.error(`[api/backend] ${method} /api/backend/${path.join("/")} failed:`, error);
    return Response.json(
      { error: "Backend service unreachable." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  // Relay the upstream response, dropping hop-by-hop headers. Node fetch
  // decompresses automatically, so content-encoding would lie about the body.
  const responseHeaders = new Headers();
  for (const [name, value] of upstream.headers.entries()) {
    if (name === "transfer-encoding" || name === "connection" || name === "content-encoding") continue;
    responseHeaders.append(name, value);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const HEAD = forward;
export const OPTIONS = forward;
