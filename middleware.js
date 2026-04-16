import { NextResponse } from 'next/server';

/**
 * Official Luxe Mauritius marketing hosts (tenant `luxe-maurice`).
 * `lux.corpflowai.com` — primary production hostname (docs + ops).
 * `luxe.corpflowai.com` — optional alias (same app; add in Vercel Domains + `tenant_hostnames`).
 *
 * Some Vercel / Next deployments return platform `404 NOT_FOUND` on `/` even while `/api/*` works.
 * Rewriting `/` → the static Lux landing avoids an empty root and matches the Change Console playbook
 * (`/lux-landing-static` parity).
 */
const LUX_ROOT_REWRITE_HOSTS = new Set([
  'lux.corpflowai.com',
  'www.lux.corpflowai.com',
  'luxe.corpflowai.com',
  'www.luxe.corpflowai.com',
]);

export function middleware(request) {
  const rawHost = request.headers.get('host') || '';
  const host = rawHost.split(',')[0].trim().split(':')[0].toLowerCase();
  const { pathname } = request.nextUrl;

  if (pathname === '/' && LUX_ROOT_REWRITE_HOSTS.has(host)) {
    const url = request.nextUrl.clone();
    url.pathname = '/lux-landing-static.html';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
