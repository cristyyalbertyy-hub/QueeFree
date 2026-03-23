import { NextResponse } from "next/server";
import { STAFF_COOKIE, verifyStaffToken } from "@/lib/staff-session";

/** Para route handlers: devolve 401 se não houver sessão staff válida */
export async function requireStaffSession(
  request: Request
): Promise<NextResponse | null> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = readCookie(cookieHeader, STAFF_COOKIE);
  if (!token || !(await verifyStaffToken(token))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return null;
}

function readCookie(cookieHeader: string, name: string): string | null {
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (!part) continue;
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key !== name) continue;
    const value = part.slice(eq + 1);
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}
