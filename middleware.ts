import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session_user')?.value;
  const { pathname } = request.nextUrl;

  const isProtectedPath = pathname.startsWith('/kurir') || pathname.startsWith('/pelanggan');
  const isAuthPath = pathname.startsWith('/login') || pathname.startsWith('/register');

  // If the URL has a "clear" query parameter, delete the session cookie and let the request proceed to /login
  if (request.nextUrl.searchParams.has('clear')) {
    const response = NextResponse.next();
    response.cookies.delete('session_user');
    return response;
  }

  if (isProtectedPath) {
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const user = JSON.parse(session);
      
      if (pathname.startsWith('/kurir') && user.role !== 'kurir') {
        return NextResponse.redirect(new URL('/pelanggan/dashboard', request.url));
      }
      if (pathname.startsWith('/pelanggan') && user.role === 'kurir') {
        return NextResponse.redirect(new URL('/kurir', request.url));
      }
    } catch (e) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session_user');
      return response;
    }
  }

  if (isAuthPath && session) {
    try {
      const user = JSON.parse(session);
      if (user.role === 'kurir') {
        return NextResponse.redirect(new URL('/kurir', request.url));
      } else {
        return NextResponse.redirect(new URL('/pelanggan/dashboard', request.url));
      }
    } catch (e) {
      // If parsing fails, delete cookie and let page render
      const response = NextResponse.next();
      response.cookies.delete('session_user');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/kurir/:path*', '/pelanggan/:path*', '/login', '/register'],
};
