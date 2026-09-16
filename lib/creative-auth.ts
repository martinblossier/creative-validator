import { createHash } from 'crypto';
import { cookies } from 'next/headers';

export const CREATIVE_COOKIE_NAME = 'cv_creative_session';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function getExpectedCookieValue(): string | null {
  const password = process.env.CREATIVE_PASSWORD;
  if (!password) return null;
  return hashPassword(password);
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.CREATIVE_PASSWORD;
  if (!expected) return false;
  return candidate === expected;
}

/** Reads the creative back-office cookie from the incoming request and validates it. */
export function isCreativeAuthenticated(): boolean {
  const expected = getExpectedCookieValue();
  if (!expected) return false;
  const cookieStore = cookies();
  const value = cookieStore.get(CREATIVE_COOKIE_NAME)?.value;
  return value === expected;
}
