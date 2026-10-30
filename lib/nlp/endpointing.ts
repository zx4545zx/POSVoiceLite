/** Pause (ms) after the last interim text that we treat as "the speaker has finished" */
export const SPEECH_END_MS = 1200;
/** Longer pause when the phrase looks unfinished, e.g. "เพิ่มผักกระเพรา" said before the quantity */
export const SPEECH_WAIT_MORE_MS = 2500;
/** When the browser has already declared the text final it has waited for a pause itself, so wait less */
export const FINAL_COMPLETE_MS = 250;
export const FINAL_WAIT_MORE_MS = 1500;

const LOOKS_COMPLETE =
  /(\d|[๐-๙]|ศูนย์|หนึ่ง|เอ็ด|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ|ร้อย|พัน|บาท|จาน|ชาม|แก้ว|ขวด|กล่อง|ถุง|ชุด|ที่|อัน|ชิ้น|ฟอง|รายการ|ห่อ|ถ้วย|คิดเงิน|ปิดบิล|เช็คบิล|เก็บเงิน|ชำระเงิน|ล้างบิล|เคลียร์|ยกเลิก|เท่าไหร่|เท่าไร|ออก|ด้วย|ครับ|ค่ะ|คะ|นะ|จ้า|หน่อย)\s*$/;

/**
 * How long to wait after the last result before acting on it. People often pause before saying the
 * quantity, so a phrase that doesn't end in a number, classifier or known command word waits longer.
 */
export function endpointDelay(text: string, browserSaidFinal = false): number {
  const complete = LOOKS_COMPLETE.test(text.trim());
  if (browserSaidFinal) return complete ? FINAL_COMPLETE_MS : FINAL_WAIT_MORE_MS;
  return complete ? SPEECH_END_MS : SPEECH_WAIT_MORE_MS;
}

/**
 * Part of `text` not already handed on. Browsers can take seconds to mark a phrase final, so we commit
 * on a pause ourselves; when the browser's own final result arrives later it must not run the phrase twice.
 * If the final text was reworded (no longer starts with what we committed) we keep what we already ran.
 */
export function tailAfter(committed: string | undefined, text: string): string {
  if (!committed) return text;
  return text.startsWith(committed) ? text.slice(committed.length) : "";
}

export interface SpeechResultLike {
  text: string;
  isFinal: boolean;
}

/**
 * Merge every not-yet-sent result of the session into one utterance. Browsers split a sentence into
 * several results at short pauses ("เพิ่มผัดกระเพรา" | "2"); acting on each piece separately loses the quantity.
 * Some browsers instead make each new result repeat the previous text plus the new words
 * (["ข้าวผัด", "ข้าวผัด 1"]): such a result replaces what we have rather than being appended
 * (appending gave "ข้าวผัดข้าวผัด 1").
 */
export function collectUnsent(results: SpeechResultLike[], sent: Map<number, string>) {
  let tail = "";
  const snapshot: [number, string][] = [];
  results.forEach((r, i) => {
    if (!r) return;
    snapshot.push([i, r.text]);
    const piece = tailAfter(sent.get(i), r.text);
    if (!piece) return;
    if (piece.startsWith(tail)) tail = piece;
    else if (!tail.endsWith(piece)) tail += piece;
  });
  return { tail, snapshot, lastIsFinal: results.length > 0 && !!results[results.length - 1]?.isFinal };
}

/** How long an identical phrase counts as a duplicate delivery of the one just handled */
export const DUPLICATE_WINDOW_MS = 3000;

/**
 * Some browsers (notably Chrome on Android in continuous mode) deliver the same text again: as a second
 * identical result, as a result that repeats the previous text plus new words, or as "AA" in one result.
 * Running those twice doubles the order ("นมสด 2" -> 4). Returns the part of `raw` that is really new.
 */
export function dedupeUtterance(raw: string, last: { text: string; at: number } | undefined, now: number): string {
  const t = raw.trim();
  if (!t) return "";
  const doubled = t.match(/^(.{3,}?)\s?\1$/);
  const cur = doubled ? doubled[1] : t;
  if (last && now - last.at < DUPLICATE_WINDOW_MS) {
    if (cur === last.text) return "";
    if (cur.startsWith(last.text)) return cur.slice(last.text.length).trim();
  }
  return cur;
}
