import { PendingAction, POSToolAction, Product } from "@/types/pos";

/**
 * Maps single Thai digit words to numbers
 */
const THAI_DIGIT_MAP: Record<string, number> = {
  ศูนย์: 0,
  หนึ่ง: 1,
  เอ็ด: 1,
  สอง: 2,
  สาม: 3,
  สี่: 4,
  ห้า: 5,
  หก: 6,
  เจ็ด: 7,
  แปด: 8,
  เก้า: 9,
};

/**
 * Parses Thai number words like "สอง", "ยี่สิบ", "หกสิบ", "หกสิบห้า", "ร้อยยี่สิบ" or arabic numbers like "60", "2"
 */
export function parseThaiNumber(text: string): number | null {
  if (!text) return null;
  const clean = text.trim();

  // 1. Direct arabic digits match anywhere in string
  const arabicMatch = clean.match(/(\d+(\.\d+)?)/);
  if (arabicMatch) {
    const val = parseFloat(arabicMatch[1]);
    if (!isNaN(val)) return val;
  }

  // 2. Pure single word digit match
  if (THAI_DIGIT_MAP[clean] !== undefined) {
    return THAI_DIGIT_MAP[clean];
  }

  // 3. Composite Thai numbers (up to 9999)
  // Handles:
  // - สิบ (10), ยี่สิบ (20), สามสิบ (30) .. เก้าสิบ (90)
  // - ยี่สิบเอ็ด (21)
  // - ร้อย (100), สองร้อย (200), etc.
  let total = 0;
  let remaining = clean;

  // Handle thousands (พัน)
  const thousandsMatch = remaining.match(/^(หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)?พัน/);
  if (thousandsMatch) {
    const digit = thousandsMatch[1] ? THAI_DIGIT_MAP[thousandsMatch[1]] ?? 1 : 1;
    total += digit * 1000;
    remaining = remaining.slice(thousandsMatch[0].length);
  }

  // Handle hundreds (ร้อย)
  const hundredsMatch = remaining.match(/^(หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)?ร้อย/);
  if (hundredsMatch) {
    const digit = hundredsMatch[1] ? THAI_DIGIT_MAP[hundredsMatch[1]] ?? 1 : 1;
    total += digit * 100;
    remaining = remaining.slice(hundredsMatch[0].length);
  }

  // Handle tens (สิบ / ยี่สิบ)
  if (remaining.startsWith("ยี่สิบ")) {
    total += 20;
    remaining = remaining.slice(6);
  } else {
    const tensMatch = remaining.match(/^(สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)?สิบ/);
    if (tensMatch) {
      const digit = tensMatch[1] ? THAI_DIGIT_MAP[tensMatch[1]] ?? 1 : 1;
      total += digit * 10;
      remaining = remaining.slice(tensMatch[0].length);
    }
  }

  // Handle unit digit at the end
  if (remaining.length > 0) {
    if (remaining === "เอ็ด") {
      total += 1;
      remaining = "";
    } else if (THAI_DIGIT_MAP[remaining] !== undefined) {
      total += THAI_DIGIT_MAP[remaining];
      remaining = "";
    }
  }

  if (total > 0 && remaining.length === 0) {
    return total;
  }

  return null;
}

/**
 * Remove wake words, conversational filler words, and clean the input
 */
export function cleanVoiceCommand(raw: string): string {
  if (!raw) return "";

  // Thai numerals (๒) -> arabic (2); some engines emit them
  let text = raw.trim().replace(/[๐-๙]/g, (d) => String(d.charCodeAt(0) - 0x0e50));

  // Strip leading wake phrases
  const wakePatterns = [
    /^(เฮ้\s*gojo|hey\s*gojo|gojo|โกโจ|เฮ้โกโจ)\s*/i,
    /^(เฮ้\s*สิริ|hey\s*siri|ok\s*google|โอเคกูเกิล)\s*/i,
    /^(สวัสดีครับ|สวัสดีค่ะ|สวัสดี|ฮัลโหล)\s*/i,
    /^(น้องครับ|น้องคะ|น้อง|พี่ครับ|พี่คะ|พี่)\s*/i,
  ];

  for (const pattern of wakePatterns) {
    text = text.replace(pattern, "");
  }

  // Strip trailing polite particles
  text = text.replace(/\s*(ครับ|ค่ะ|คะ|นะครับ|นะคะ|จ้า|หน่อย|ด้วยครับ|ด้วยค่ะ|ด้วย)$/, "");

  return text.trim();
}

export const DEFAULT_WAKE_WORDS = ["น้องครับ", "น้องคะ", "น้องค่ะ", "น้องโกโจ", "เฮ้โกโจ", "โกโจ", "hey gojo", "gojo"];

const MIN_WAKE_WORD_LENGTH = 3;
const MAX_WAKE_WORDS = 5;

/** Splits user input like "น้องครับ, โกโจ" into a clean list (min 3 chars, max 5, deduped) */
export function parseWakeWords(input: string): string[] {
  const words = input
    .split(/[,،\n]/)
    .map((w) => w.trim())
    // count base letters only: Thai vowel/tone marks (e.g. the ่ in "ค่ะ") would otherwise pad short words
    .filter((w) => w.replace(/[\s\p{M}]/gu, "").length >= MIN_WAKE_WORD_LENGTH);
  return [...new Set(words)].slice(0, MAX_WAKE_WORDS);
}

/**
 * Hands-free wake words. Only the configured words count (deliberately stricter than
 * cleanVoiceCommand, which also strips "สวัสดี", "พี่"...) so ordinary chatter doesn't trigger orders.
 * Spaces between characters are optional because speech engines segment Thai inconsistently.
 * Returns the text after the wake word ("" if only the wake word was said), or null if there is none.
 */
export function extractWakeCommand(raw: string, wakeWords: string[] = DEFAULT_WAKE_WORDS): string | null {
  const alternatives = [...wakeWords]
    .sort((x, y) => y.length - x.length)
    .map((w) =>
      [...w.replace(/\s+/g, "")].map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s*")
    )
    .filter(Boolean);
  if (alternatives.length === 0) return null;
  const text = raw.trim();
  const m = text.match(new RegExp(`^(?:${alternatives.join("|")})\\s*`, "i"));
  return m ? text.slice(m[0].length).trim() : null;
}

/**
 * Classifiers to strip when extracting quantity
 */
const CLASSIFIERS = [
  "จาน",
  "ชาม",
  "แก้ว",
  "ขวด",
  "กล่อง",
  "ถุง",
  "ชุด",
  "ที่",
  "อัน",
  "ชิ้น",
  "รายการ",
  "ฟอง",
];

export interface FastPathResult {
  actions: POSToolAction[];
  confidence: "high" | "medium";
  matchedRule: string;
}

/**
 * Evaluates raw voice input for instant, local execution without calling Gemini.
 * Returns null if uncertain so Gemini can handle the request.
 */
export function parseFastPath(
  rawInput: string,
  pendingAction: PendingAction,
  knownProducts: Product[] = []
): FastPathResult | null {
  const cleaned = cleanVoiceCommand(rawInput);
  if (!cleaned) return null;

  // 1. Pending Action: Waiting for product price
  // e.g. "60 บาท", "60", "หกสิบบาท", "ราคา 60"
  if (pendingAction && pendingAction.type === "WAITING_PRODUCT_PRICE") {
    // Strip words like "บาท", "ราคา", "เอา"
    const priceText = cleaned.replace(/(บาท|ราคา|เอา|คิด|แค่)/g, "").trim();
    const price = parseThaiNumber(priceText);
    if (price !== null && price > 0) {
      return {
        actions: [
          {
            tool: "setProductPrice",
            args: { name: pendingAction.productName, price },
          },
          {
            tool: "addItem",
            args: { name: pendingAction.productName, qty: pendingAction.qty },
          },
        ],
        confidence: "high",
        matchedRule: "pending_price_response",
      };
    }
  }

  // 2. Checkout / Close Bill
  // "คิดเงิน", "ปิดบิล", "เช็คบิล", "เก็บเงิน", "ชำระเงิน", "คิดตัง", "คิดตังค์"
  const checkoutRegex = /^(คิดเงิน|ปิดบิล|เช็คบิล|เก็บเงิน|ชำระเงิน|คิดตัง|คิดตังค์)(\s*เลย|\s*ด้วย)?$/;
  if (checkoutRegex.test(cleaned)) {
    return {
      actions: [{ tool: "checkout" }],
      confidence: "high",
      matchedRule: "checkout",
    };
  }

  // 3. Clear Order / Cancel Bill
  // "ล้างบิล", "ยกเลิกบิล", "เคลียร์บิล", "ล้าง", "ยกเลิกรายการ", "เคลียร์"
  const clearRegex = /^(ล้างบิล|ยกเลิกบิล|เคลียร์บิล|ล้าง|เคลียร์|ยกเลิกรายการทั้งหมด)(\s*เลย|\s*ด้วย)?$/;
  if (clearRegex.test(cleaned)) {
    return {
      actions: [{ tool: "clearOrder" }],
      confidence: "high",
      matchedRule: "clearOrder",
    };
  }

  // 4. Check Total
  // "ยอดเท่าไหร่", "รวมเท่าไหร่", "ทั้งหมดเท่าไหร่", "รวมกี่บาท", "เท่าไหร่", "ยอดรวม"
  const totalRegex = /^(ยอดเท่าไหร่|รวมเท่าไหร่|ทั้งหมดเท่าไหร่|รวมกี่บาท|ยอดรวมเท่าไหร่|คิดเป็นเงินเท่าไหร่|เช็คยอด|เท่าไหร่)$/;
  if (totalRegex.test(cleaned)) {
    return {
      actions: [{ tool: "getTotal" }],
      confidence: "high",
      matchedRule: "getTotal",
    };
  }

  // 5. Add Discount
  // "ลด 10 บาท", "ส่วนลด 10 บาท", "ลดไป 20 บาท", "ลด 10"
  const discountMatch = cleaned.match(/^(?:ส่วนลด|ลดไป|ลด)\s*(.+?)(?:\s*บาท)?$/);
  if (discountMatch) {
    const discountVal = parseThaiNumber(discountMatch[1]);
    if (discountVal !== null && discountVal >= 0) {
      return {
        actions: [{ tool: "addDiscount", args: { value: discountVal } }],
        confidence: "high",
        matchedRule: "addDiscount",
      };
    }
  }

  // 6. Remove Item
  // "ลบกะเพราหมู", "ลบกะเพราหมูหนึ่ง", "เอากะเพราหมูออก", "ยกเลิกกะเพราหมู"
  // ("เอา X" without "ออก" is an order, e.g. "เอากะเพราหมูสอง", and is handled as an add below)
  const removeMatch = cleaned.match(/^(?:(?:ลบ|ยกเลิก)\s*(.+?)(?:\s*ออก)?|เอา\s*(.+?)\s*ออก)$/);
  if (removeMatch) {
    let target = (removeMatch[1] ?? removeMatch[2]).trim();
    let qty: number | undefined = undefined;

    // Check if ends with a qty / classifier
    for (const classifier of CLASSIFIERS) {
      target = target.replace(new RegExp(`\\s*${classifier}$`), "");
    }

    // Check for trailing number in target: e.g. "กะเพราหมูหนึ่ง" or "กะเพราหมู 1"
    const parsedQty = extractTrailingQuantity(target);
    if (parsedQty) {
      target = parsedQty.name;
      qty = parsedQty.qty;
    }

    if (target.length > 0) {
      return {
        actions: [{ tool: "removeItem", args: { name: target, qty } }],
        confidence: "high",
        matchedRule: "removeItem",
      };
    }
  }

  // 7. Update Qty: "กะเพราหมูเหลือหนึ่ง", "กะเพราหมูเหลือ 1"
  const remainingMatch = cleaned.match(/^(.+?)\s*เหลือ\s*(.+?)$/);
  if (remainingMatch) {
    const itemName = remainingMatch[1].trim();
    const qtyText = remainingMatch[2].replace(new RegExp(`(${CLASSIFIERS.join("|")})`, "g"), "").trim();
    const qty = parseThaiNumber(qtyText);
    if (itemName && qty !== null && qty >= 0) {
      if (qty === 0) {
        return {
          actions: [{ tool: "removeItem", args: { name: itemName } }],
          confidence: "high",
          matchedRule: "updateQty_zero",
        };
      }
      return {
        actions: [{ tool: "updateQty", args: { name: itemName, qty } }],
        confidence: "high",
        matchedRule: "updateQty",
      };
    }
  }

  // 7.5. Product Price Inquiry: "กะเพราหมูกี่บาท", "กะเพราหมูราคาเท่าไหร่"
  const priceInquiryMatch = cleaned.match(/^(.+?)\s*(?:ราคาเท่าไหร่|กี่บาท|ราคาเท่าไร|ราคาดีด)$/);
  if (priceInquiryMatch) {
    const prodName = priceInquiryMatch[1].trim();
    if (prodName.length >= 2) {
      return {
        actions: [{ tool: "getProductPrice", args: { name: prodName } }],
        confidence: "high",
        matchedRule: "getProductPrice",
      };
    }
  }

  // 8. Add Item (Known Products fast matching)
  // e.g. "กะเพราหมูสอง", "กะเพราหมู 2", "เพิ่มกะเพราหมู 2 จาน", "เอากะเพราหมูอีกหนึ่ง"
  // Try to match against knownProducts first or general add phrase
  let addCandidate = cleaned;
  addCandidate = addCandidate.replace(/^(เพิ่ม|เอา|ขอ|สั่ง|เอาเป็น)\s*/, "");
  addCandidate = addCandidate.replace(/\s*อีก\s*/, " ");

  // Strip classifier at the end if present
  for (const classifier of CLASSIFIERS) {
    addCandidate = addCandidate.replace(new RegExp(`\\s*${classifier}$`), "");
  }

  // Quantity before the name, for known products only: "สองผักกระเพรา", "2 โค้ก"
  const leadingQty = addCandidate.match(/^(\d+|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ)\s*(.+)$/);
  if (leadingQty) {
    const prod = knownProducts.find((p) => p.name === leadingQty[2].trim());
    const qty = parseThaiNumber(leadingQty[1]);
    if (prod && qty !== null && qty > 0) {
      return {
        actions: [{ tool: "addItem", args: { name: prod.name, qty } }],
        confidence: "high",
        matchedRule: "addItem_leadingQuantity",
      };
    }
  }

  // Several items in one utterance: "ต้มยำกุ้ง 2 ผัดกระเพรา 1"
  const multi = splitMultiItem(addCandidate);
  if (multi) {
    return {
      actions: multi.map((m) => ({ tool: "addItem" as const, args: m })),
      confidence: "medium",
      matchedRule: "addItem_multiple",
    };
  }

  // Check known products exact or prefix match
  for (const prod of knownProducts) {
    if (addCandidate.startsWith(prod.name)) {
      const rest = addCandidate.slice(prod.name.length).trim();
      let qty = 1;
      if (rest.length > 0) {
        const parsed = parseThaiNumber(rest);
        if (parsed !== null && parsed > 0) {
          qty = parsed;
        } else {
          // not confident in the number, leave for Gemini
          continue;
        }
      }
      return {
        actions: [{ tool: "addItem", args: { name: prod.name, qty } }],
        confidence: "high",
        matchedRule: "addItem_knownProduct",
      };
    }
  }

  // General add candidate with trailing number: e.g. "กะเพราหมูสอง" or "ชาเขียว 2"
  const trailingQty = extractTrailingQuantity(addCandidate);
  if (trailingQty && trailingQty.name.length >= 2) {
    return {
      actions: [{ tool: "addItem", args: { name: trailingQty.name, qty: trailingQty.qty } }],
      confidence: "medium",
      matchedRule: "addItem_trailingQuantity",
    };
  }

  // Fast path not confident -> fallback to Gemini
  return null;
}

/**
 * Splits "ต้มยำกุ้ง 2 ผัดกระเพรา 1" into [{name, qty}, ...]. Quantities must be arabic digits
 * or whitespace-separated Thai number words, so names containing number-like syllables stay intact.
 * Returns null unless the whole input is consumed as 2+ "name qty" pairs.
 */
function splitMultiItem(input: string): { name: string; qty: number }[] | null {
  const tokens = input.replace(/(\d+)/g, " $1 ").split(/\s+/).filter(Boolean);
  const items: { name: string; qty: number }[] = [];
  let nameParts: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const qty = /^\d+$/.test(tokens[i]) ? parseInt(tokens[i], 10) : parseThaiNumber(tokens[i]);
    if (qty === null || qty <= 0) {
      nameParts.push(tokens[i]);
      continue;
    }
    if (nameParts.length === 0) return null;
    items.push({ name: nameParts.join(" "), qty });
    nameParts = [];
    if (CLASSIFIERS.includes(tokens[i + 1])) i++;
  }

  return nameParts.length === 0 && items.length >= 2 ? items : null;
}

/**
 * Extracts item name and trailing number from strings like "กะเพราหมูสอง", "โค้ก 2", "ชาเย็นหนึ่ง"
 */
function extractTrailingQuantity(input: string): { name: string; qty: number } | null {
  const text = input.trim();

  // 1. Check arabic digits at the end: "กะเพราหมู 2" or "กะเพราหมู2"
  const arabicMatch = text.match(/^(.+?)\s*(\d+)$/);
  if (arabicMatch) {
    const name = arabicMatch[1].trim();
    const qty = parseInt(arabicMatch[2], 10);
    if (name && qty > 0) {
      return { name, qty };
    }
  }

  // 2. Check Thai number words at the end
  const thaiNumberWords = [
    "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า", "สิบ",
    "ยี่สิบ", "สามสิบ", "สี่สิบ", "ห้าสิบ"
  ];

  for (const word of thaiNumberWords) {
    if (text.endsWith(word) && text.length > word.length) {
      const name = text.slice(0, text.length - word.length).trim();
      const val = parseThaiNumber(word);
      if (name.length >= 2 && val !== null) {
        return { name, qty: val };
      }
    }
  }

  return null;
}
