import { NextResponse } from "next/server";
import { STAFF_COOKIE, verifyStaffToken } from "@/lib/staff-session";

/** Para route handlers: devolve 401 se não houver sessão staff válida */
export async function requireStaffSession(
  request: Request
): Promise<NextResponse | null> {
  const token = request.cookies.get(STAFF_COOKIE)?.value;
  if (!token || !(await verifyStaffToken(token))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return null;
}
