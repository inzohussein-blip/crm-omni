/**
 * OMNI-CRM Global Middleware
 * - يطبق Device Fingerprinting على مسارات الداشبورد (App Routes)
 * - يترك الـ API routes تعمل مع قواعدها الخاصة
 */

import { NextRequest, NextResponse } from 'next/server';
import { hardwareIdMiddleware } from '@/lib/device-middleware';
import { decryptData } from '@/lib/security';

function getUserContext(request: NextRequest): { userId?: string; userType?: string } {
  // 1) Headers (مناسب للاختبارات و reverse proxies)
  const headerUserId = request.headers.get('x-user-id') || undefined;
  const headerUserType = request.headers.get('x-user-type') || undefined;
  if (headerUserId && headerUserType) return { userId: headerUserId, userType: headerUserType };

  // 2) Cookie omni_user: base64(JSON) أو encryptData(JSON)
  const cookie = request.cookies.get('omni_user')?.value;
  if (!cookie) return {};

  // base64(JSON)
  try {
    const json = Buffer.from(cookie, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    return { userId: parsed.userId, userType: parsed.userType };
  } catch {
    // encryptData(JSON)
    try {
      const parsed = JSON.parse(decryptData(cookie));
      return { userId: parsed.userId, userType: parsed.userType };
    } catch {
      return {};
    }
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // لا نطبّق على assets أو API أو auth صفحات عامة
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // تطبيق على جميع مسارات الداشبورد (هنا: كل الـ app routes)
  const { userId, userType } = getUserContext(request);
  const response = await hardwareIdMiddleware(request, userId, userType);
  if (response) return response;

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
