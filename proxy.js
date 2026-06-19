import { NextResponse } from "next/server";

export function proxy(request) {
  const response = NextResponse.next();
  const frameAncestors = process.env.ALLOWED_FRAME_ANCESTORS || "'self' https:";

  response.headers.set("Content-Security-Policy", `frame-ancestors ${frameAncestors}`);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");

  if (request.nextUrl.pathname.startsWith("/api/app-data")) {
    response.headers.set("Cache-Control", "no-store");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets).*)"]
};
