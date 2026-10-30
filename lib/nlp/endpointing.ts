/** Pause (ms) after the last interim text that we treat as "the speaker has finished" */
export const SPEECH_END_MS = 1200;
/** Longer pause when the phrase looks unfinished, e.g. "เพิ่มผักกระเพรา" said before the quantity */
export const SPEECH_WAIT_MORE_MS = 2500;

const LOOKS_COMPLETE =
  /(\d|[๐-๙]|ศูนย์|หนึ่ง|เอ็ด|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ|ร้อย|พัน|บาท|จาน|ชาม|แก้ว|ขวด|กล่อง|ถุง|ชุด|ที่|อัน|ชิ้น|ฟอง|รายการ|ห่อ|ถ้วย|คิดเงิน|ปิดบิล|เช็คบิล|เก็บเงิน|ชำระเงิน|ล้างบิล|เคลียร์|ยกเลิก|เท่าไหร่|เท่าไร|ออก|ด้วย|ครับ|ค่ะ|คะ|นะ|จ้า|หน่อย)\s*$/;

/**
 * How long to wait after the last interim text before committing it. People often pause before saying the
 * quantity, so a phrase that doesn't end in a number, classifier or known command word waits longer.
 */
export function endpointDelay(text: string): number {
  return LOOKS_COMPLETE.test(text.trim()) ? SPEECH_END_MS : SPEECH_WAIT_MORE_MS;
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
