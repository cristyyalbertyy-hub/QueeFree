import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { STAFF_COOKIE, getStaffJwtKey } from "@/lib/staff-session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/staff/login" || pathname.startsWith("/staff/login/")) {
    return NextResponse.next();
  }
  if (
    pathname.startsWith("/api/v1/staff/login") ||
    pathname === "/api/v1/staff/logout"
  ) {
    return NextResponse.next();
  }

  const protectPage = pathname.startsWith("/staff");
  const protectApi =
    pathname.startsWith("/api/v1/staff") &&
    !pathname.startsWith("/api/v1/staff/login");

  if (!protectPage && !protectApi) {
    return NextResponse.next();
  }

  const key = getStaffJwtKey();
  if (!key) {
    if (protectPage) {
      return NextResponse.redirect(
        new URL("/staff/login?error=config", request.url)
      );
    }
    return NextResponse.json(
      { error: "Servidor não configurado (STAFF_JWT_SECRET)" },
      { status: 503 }
    );
  }

  const token = request.cookies.get(STAFF_COOKIE)?.value;
  if (!token) {
    if (protectPage) {
      return NextResponse.redirect(new URL("/staff/login", request.url));
    }
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    await jwtVerify(token, key);
    return NextResponse.next();
  } catch {
    if (protectPage) {
      return NextResponse.redirect(new URL("/staff/login", request.url));
    }
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
}

export const config = {
  matcher: ["/staff/:path*", "/api/v1/staff/:path*"],
};
