"use client";

/**
 * Hands the first message from the landing page to /start without putting the
 * person's words in the URL (history, logs, referrers). Read once, then deleted.
 */
const KEY = "fl_start_message";

export function setStartMessage(text: string) {
  try {
    window.sessionStorage.setItem(KEY, text.slice(0, 2000));
  } catch {
    /* storage unavailable: the person can retype */
  }
}

export function takeStartMessage(): string | null {
  try {
    const v = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    return v;
  } catch {
    return null;
  }
}
