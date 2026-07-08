/**
 * allowedDomains.ts
 * ---------------------------------------------------------------------------
 * The back office isn't open to the public - only work emails at these
 * domains may sign in (checked both before sending a magic link, and again
 * after a session is established, in case a session somehow exists for an
 * email outside this list).
 */
export const ALLOWED_EMAIL_DOMAINS = ["rjf.agency", "runjumpfly.studio", "runjumpflycreations.co.za"];

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  return ALLOWED_EMAIL_DOMAINS.includes(domain);
}
