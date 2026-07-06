/**
 * localStorageClient.ts
 * ---------------------------------------------------------------------------
 * Thin, generic wrapper around the browser's localStorage API.
 *
 * Nothing in this file knows about Projects, People, or any other app
 * concept - it only knows how to safely read/write/remove a JSON value under
 * a string key. `projectRepository.ts` and `peopleRepository.ts` are the
 * only files that should call these functions; every other part of the app
 * should go through those repositories instead of touching localStorage
 * directly. That's what makes it possible to swap localStorage for a real
 * backend API later (Phase 2) without changing any UI code.
 */

/**
 * Reads and JSON-parses a value from localStorage.
 * Returns `fallback` if the key doesn't exist or the stored value can't be parsed
 * (e.g. it was corrupted, or written by an older/incompatible version of the app).
 */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`[localStorageClient] Failed to read/parse key "${key}":`, error);
    return fallback;
  }
}

/** JSON-stringifies a value and writes it to localStorage under the given key. */
export function writeJson<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Most likely cause: localStorage quota exceeded, or private-browsing mode restrictions.
    console.error(`[localStorageClient] Failed to write key "${key}":`, error);
  }
}

/** Removes a key from localStorage entirely. */
export function removeKey(key: string): void {
  window.localStorage.removeItem(key);
}
