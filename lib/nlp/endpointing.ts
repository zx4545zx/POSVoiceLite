/** Pause (ms) after the last interim text that we treat as "the speaker has finished" */
export const SPEECH_END_MS = 1200;

/**
 * Part of `text` not already handed on. Browsers can take seconds to mark a phrase final, so we commit
 * on a pause ourselves; when the browser's own final result arrives later it must not run the phrase twice.
 * If the final text was reworded (no longer starts with what we committed) we keep what we already ran.
 */
export function tailAfter(committed: string | undefined, text: string): string {
  if (!committed) return text;
  return text.startsWith(committed) ? text.slice(committed.length) : "";
}
