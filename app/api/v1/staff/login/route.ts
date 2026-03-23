import { NextResponse } from "next/server";
import { z } from "zod";
import { STAFF_COOKIE, signStaffToken } from "@/lib/staff-session";

const bodySchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: Request) {
  if (!process.env.STAFF_PASSWORD) {
    return NextResponse.json(
      { error: "STAFF_PASSWORD não configurada no servidor" },
      { status: 503 }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  if (parsed.data.password !== process.env.STAFF_PASSWORD) {
    return NextResponse.json(
      { error: "Palavra-passe incorreta" },
      { status: 401 }
    );
  }

  let token: string;
  try {
    token = await signStaffToken();
  } catch {
    return NextResponse.json(
      { error: "STAFF_JWT_SECRET inválida ou em falta" },
      { status: 503 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(STAFF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
