import { NextResponse, type NextRequest } from "next/server";
import {
  getPrimaryHostname,
  getRedirectHostnames,
  getSiteOrigin,
  isLocalHostname,
} from "@/lib/domains";

function resolveHostname(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-host");
  const host = forwarded?.split(",")[0]?.trim() || request.headers.get("host");
  return host?.split(":")[0]?.toLowerCase() ?? null;
}

export function middleware(request: NextRequest) {
  const hostname = resolveHostname(request);
  if (!hostname || isLocalHostname(hostname)) {
    return NextResponse.next();
  }

  const primaryHost = getPrimaryHostname();
  if (hostname === primaryHost) {
    return NextResponse.next();
  }

  const redirectHosts = getRedirectHostnames();
  if (!redirectHosts.has(hostname)) {
    return NextResponse.next();
  }

  const primaryOrigin = getSiteOrigin();
  const destination = new URL(request.nextUrl.pathname + request.nextUrl.search, primaryOrigin);

  return NextResponse.redirect(destination, 301);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
