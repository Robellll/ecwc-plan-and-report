import crypto from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const SECRET = process.env.SESSION_SECRET || "ecwc-weekly-reports-secure-token-secret-2026";
const COOKIE_NAME = "ecwc_session";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: "project_manager" | "department_manager" | "superadmin";
  department?: string | null;
  project_name?: string | null;
  phone_number?: string | null;
}

/**
 * Hash password securely with scrypt and a cryptographic salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

/**
 * Verify plaintext password against stored salt:hash
 */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derivedKey, "hex"));
  } catch {
    return false;
  }
}

/**
 * Sign payload to generate session token
 */
export function signSession(user: SessionUser): string {
  const payload = JSON.stringify({
    ...user,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  });
  const encodedPayload = Buffer.from(payload).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

/**
 * Verify and decode session token
 */
export function verifySession(token: string): SessionUser | null {
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", SECRET)
      .update(encodedPayload)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const decoded = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8"));
    if (decoded.exp && Date.now() > decoded.exp) return null;

    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      department: decoded.department || null,
      project_name: decoded.project_name || null,
    };
  } catch {
    return null;
  }
}

/**
 * Read current session user from Next.js server context
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Extract session user from NextRequest in API routes
 */
export function getSessionUserFromRequest(request: NextRequest): SessionUser | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export const SESSION_COOKIE_OPTIONS = {
  name: COOKIE_NAME,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 7 * 24 * 60 * 60, // 7 days
};
