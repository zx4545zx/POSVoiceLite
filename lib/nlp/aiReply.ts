import { parseThaiNumber } from "@/lib/nlp/fastPath";
import { PendingAction, POSToolAction } from "@/types/pos";

/** Only POS tool results should claim the bill changed. */
export function safeModelReply(text: string | undefined): string | undefined {
  const t = text?.trim();
  if (!t) return undefined;
  const claimsDone = /(เพิ่ม|ลบ|ลด|ล้าง|คิดเงิน|เรียบร้อย|สำเร็จ|ตั้งราคา|บันทึก).*(แล้ว|เรียบร้อย|สำเร็จ)/.test(t);
  return claimsDone ? undefined : t.replace(/ครับ/g, "ค่ะ");
}

export function isModelQuestion(text: string): boolean {
  return /[?？]|ไหม|หรือเปล่า|หรือไม่|อะไร|กี่|เท่าไร|เท่าไหร่|ไหน|หรือ/.test(text);
}

const PRICE_CUE = /(บาท|ราคา|ตั้งราคา|เปลี่ยนราคา|ขึ้นราคา|ลดราคา)/;

/** Is `price` really a number the cashier said as a price (digits or Thai words), not just any number in the phrase? */
export function priceWasSpoken(message: string, price: number): boolean {
  const text = message.replace(/[๐-๙]/g, (d) => String(d.charCodeAt(0) - 0x0e50));
  const numbers = text.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (numbers.includes(price)) return true;
  return parseThaiNumber(text.replace(/(บาท|ราคา|เอา|คิด|แค่|ครับ|ค่ะ|คะ)/g, "").trim()) === price;
}

/**
 * The model must not invent prices: it set ฿1 on unpriced items of "กระเพรา 2 ต้มยำกุ้ง 1 ผัดไทย 2" (copying a
 * quantity) so they were added without ever asking. A setProductPrice is kept only when the cashier was being
 * asked for that product's price, or said an explicit price ("บาท"/"ราคา") that matches. Everything else is dropped,
 * and an unpriced addItem then makes the POS ask "X กี่บาท?" as it should.
 */
export function allowedAiActions(
  actions: POSToolAction[],
  message: string,
  pending: PendingAction | undefined
): POSToolAction[] {
  return actions.filter((a) => {
    if (a.tool !== "setProductPrice") return true;
    const { name, price } = a.args;
    if (typeof price !== "number" || !priceWasSpoken(message, price)) return false;
    const answeringQuestion =
      pending?.type === "WAITING_PRODUCT_PRICE" && pending.productName.trim() === String(name).trim();
    return answeringQuestion || PRICE_CUE.test(message);
  });
}
