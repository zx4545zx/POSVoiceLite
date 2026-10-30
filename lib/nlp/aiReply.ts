/** Only POS tool results should claim the bill changed. */
export function safeModelReply(text: string | undefined): string | undefined {
  const t = text?.trim();
  if (!t) return undefined;
  const claimsDone = /(เพิ่ม|ลบ|ลด|ล้าง|คิดเงิน|เรียบร้อย|สำเร็จ|ตั้งราคา|บันทึก).*(แล้ว|เรียบร้อย|สำเร็จ)/.test(t);
  return claimsDone ? undefined : t;
}

export function isModelQuestion(text: string): boolean {
  return /[?？]|ไหม|หรือเปล่า|หรือไม่|อะไร|กี่|เท่าไร|เท่าไหร่|ไหน|หรือ/.test(text);
}
