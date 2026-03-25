import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** 認証チェックをスキップするパス */
const PUBLIC_PATHS = ['/login', '/api/auth']

/**
 * better-auth がセッションCookieに使用するキー名
 * デフォルト: "better-auth.session_token"
 */
const SESSION_COOKIE_NAME = 'better-auth.session_token'

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 静的ファイル・パブリックパスはスルー
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Edge Runtime で動作するCookieベースの存在チェック
  // 実際のセッション検証はサーバーコンポーネント / APIルートで行う
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public assets (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
