import { NextResponse } from 'next/server';

export function middleware(request) {
  const host = String(request.headers.get('host') || '')
    .toLowerCase()
    .replace(/:\d+$/, '');

  if (host === 'lux.corpflowai.com' || host === 'www.lux.corpflowai.com') {
    return NextResponse.rewrite(new URL('/rare-exclusive-home', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/',
};
