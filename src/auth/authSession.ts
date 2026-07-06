/**
 * authSession.ts
 * ---------------------------------------------------------------------------
 * Tiny helper around sessionStorage (NOT localStorage) used only to remember
 * "the back office password was entered correctly" for the current browser
 * tab/session. Using sessionStorage (rather than localStorage) means closing
 * the tab clears it, so the password is asked again next time - a reasonable
 * default for a temporary, low-security placeholder gate.
 *
 * This is NOT real authentication. It exists purely so you don't have to
 * re-type "1234" on every navigation while testing. Phase 2 replaces this
 * entire mechanism with real Google OAuth.
 */
const SESSION_KEY = "schedule-app:backoffice-unlocked";

export function isBackOfficeUnlocked(): boolean {
  return window.sessionStorage.getItem(SESSION_KEY) === "true";
}

export function unlockBackOffice(): void {
  window.sessionStorage.setItem(SESSION_KEY, "true");
}

export function lockBackOffice(): void {
  window.sessionStorage.removeItem(SESSION_KEY);
}
