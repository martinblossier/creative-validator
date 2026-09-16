import { createHash } from 'crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'cv_admin_session';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function getExpectedCookieValue(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return hashPassword(password);
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return candidate === expected;
}

export function getSessionCookieValue(): string {
  return getExpectedCookieValue() ?? '';
}

/** Reads the admin cookie from the incoming request and validates it. */
export function isAdminAuthenticated(): boolean {
  const expected = getExpectedCookieValue();
  if (!expected) return false;
  const cookieStore = cookies();
  const value = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return value === expected;
}
