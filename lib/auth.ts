import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "wikipig_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "admin"; // dev fallback
}

function secretKey(): Uint8Array {
  const s = process.env.SESSION_SECRET ?? `${adminPassword()}::wikipig-dev-secret`;
  return new TextEncoder().encode(s);
}

/** Confere a senha do admin. */
export function checkPassword(password: string): boolean {
  const expected = adminPassword();
  if (!password || password.length !== expected.length) return password === expected;
  // comparação em tempo ~constante
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= password.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** True se a requisição atual tem sessão de admin válida. */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}
