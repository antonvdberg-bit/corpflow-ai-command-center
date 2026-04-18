import { NextResponse } from 'next/server';

/**
 * Lux root is served via `vercel.json` host-scoped rewrites → `/lux-landing-static.html`
 * to avoid Next.js Edge middleware invocation failures (`MIDDLEWARE_INVOCATION_FAILED` on `/`
 * when rewriting from middleware on some Next/Vercel builds).
 *
 * Keep this file for future host logic; matcher is empty so no Edge middleware runs on `/`.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
