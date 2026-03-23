import { SignJWT, jwtVerify } from "jose";

/** Cookie httpOnly com JWT HS256 */
export const STAFF_COOKIE = "staff_session";

export function getStaffJwtKey(): Uint8Array | null {
  const s = process.env.STAFF_JWT_SECRET;
  if (!s || s.length < 16) return null;
  return new TextEncoder().encode(s);
}

export async function signStaffToken(): Promise<string> {
  const key = getStaffJwtKey();
  if (!key) {
    throw new Error("STAFF_JWT_SECRET em falta ou demasiado curto (mín. 16 caracteres)");
  }
  return new SignJWT({ role: "staff" as const })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifyStaffToken(token: string): Promise<boolean> {
  const key = getStaffJwtKey();
  if (!key) return false;
  try {
    await jwtVerify(token, key);
    return true;
  } catch {
    return false;
  }
}
