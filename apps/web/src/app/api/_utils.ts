import { NextResponse } from "next/server";

// Reads cookie 'session' and forwards as X-Session header to FastAPI
export function withSessionHeaders(req: Request): HeadersInit {
  const headers = new Headers({ "content-type": "application/json" });
  // @ts-ignore - cookies not typed on Request in edge/runtime yet
  const cookie = req.headers.get('cookie') || '';
  const match = /(?:^|; )session=([^;]+)/.exec(cookie);
  if (match) headers.set('x-session', decodeURIComponent(match[1]));
  return headers;
}
