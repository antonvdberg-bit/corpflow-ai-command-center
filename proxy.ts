import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Ghost clients: hosts marked has_website false in CORPFLOW_GHOST_HOST_MAP get /log-stream.html for /.
 * Map shape: { "medspa.corpflowai.com": true } (JSON in env).
 */
export const config = {
  matcher: ['/', '/index.html'],
};

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname !== '/' && pathname !== '/index.html') {
    return NextResponse.next();
  }

  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase() ?? '';
  let isGhost = false;
  const ghostList = (process.env.CORPFLOW_GHOST_HOSTS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (host && ghostList.includes(host)) {
    isGhost = true;
  }
  if (!isGhost) {
    try {
      const raw = process.env.CORPFLOW_GHOST_HOST_MAP || '{}';
      const m = JSON.parse(raw) as Record<string, unknown>;
      if (m && typeof m === 'object' && m[host] === true) {
        isGhost = true;
      }
    } catch {
      /* fail closed: not ghost */
    }
  }

  if (!isGhost) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/log-stream.html';
  return NextResponse.rewrite(url);
}
