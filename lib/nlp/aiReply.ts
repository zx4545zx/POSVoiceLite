/**
 * The model may answer in plain text instead of calling a tool. Only the app's own tool results may
 * claim the bill changed, so keep the text only when it is really a question; a made-up
 * "เพิ่มเค้กแล้ว" would otherwise be shown and spoken while nothing was added.
 */
export function safeModelQuestion(text: string | undefined): string | undefined {
  const t = text?.trim();
  if (!t) return undefined;
  const looksLikeQuestion = /[?？]|ไหม|หรือเปล่า|หรือไม่|อะไร|กี่|เท่าไร|เท่าไหร่|ไหน|หรือ/.test(t);
  const claimsDone = /(เพิ่ม|ลบ|ลด|ล้าง|คิดเงิน|เรียบร้อย|สำเร็จ|ตั้งราคา|บันทึก).*(แล้ว|เรียบร้อย|สำเร็จ)/.test(t);
  return looksLikeQuestion && !claimsDone ? t : undefined;
}
