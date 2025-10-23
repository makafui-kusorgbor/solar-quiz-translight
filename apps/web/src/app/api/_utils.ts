import { cookies } from "next/headers";
import { randomUUID, createHash, pbkdf2Sync, randomBytes } from "node:crypto";

export const runtime = "nodejs";

// Session cookie helpers
export function getSessionToken(): string | null {
  try {
    const c = cookies();
    const v = c.get("session")?.value;
    return v || null;
  } catch {
    return null;
  }
}

export function setSessionToken(token: string) {
  // httpOnly cookie for same-site app
  cookies().set("session", token, { httpOnly: true, sameSite: "lax", path: "/" });
}

// Simple password hashing helpers (PBKDF2)
export function hashPassword(password: string, salt?: Buffer) {
  const s = salt || randomBytes(16);
  const hash = pbkdf2Sync(password, s, 120_000, 32, "sha256");
  return { salt: s, hash };
}

export function verifyPassword(password: string, salt: Buffer, hash: Buffer) {
  const h = pbkdf2Sync(password, salt, 120_000, 32, "sha256");
  return timingSafeEqual(hash, h);
}

function timingSafeEqual(a: Buffer, b: Buffer) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
