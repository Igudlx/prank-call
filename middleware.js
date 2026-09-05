import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me'
);

export async function middleware(req) {
  const token = req.cookies.get('session')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  try {
    await jwtVerify(token, secretKey);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/app/:path*', '/choose-number'],
};
