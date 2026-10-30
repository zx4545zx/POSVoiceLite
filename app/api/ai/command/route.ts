import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { getCurrentSession } from "@/lib/google/auth";
import { allowedAiActions, isModelQuestion, safeModelReply } from "@/lib/nlp/aiReply";
import { validHistory } from "@/lib/nlp/conversation";
import { PendingAction, POSToolAction, Product } from "@/types/pos";
import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY || "";
const modelName = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

const functionDeclarations = [
  {
    name: "addItem",
    description: "Add an item with specified quantity to the POS order.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Name of the product in Thai" },
        qty: { type: "NUMBER", description: "Quantity of the product, defaults to 1" },
      },
      required: ["name"],
    },
  },
  {
    name: "removeItem",
    description: "Remove an item or decrease its quantity from the POS order.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Name of the product in Thai" },
        qty: { type: "NUMBER", description: "Optional quantity to remove" },
      },
      required: ["name"],
    },
  },
  {
    name: "updateQty",
    description: "Set the exact quantity of an item in the POS order.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Name of the product in Thai" },
        qty: { type: "NUMBER", description: "New exact quantity" },
      },
      required: ["name", "qty"],
    },
  },
  {
    name: "getProductPrice",
    description: "Inquire the price of a product.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Name of the product in Thai" },
      },
      required: ["name"],
    },
  },
  {
    name: "setProductPrice",
    description: "Set or update the unit price of a product in Thai Baht.",
    parameters: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING", description: "Name of the product in Thai" },
        price: { type: "NUMBER", description: "Unit price in Thai Baht" },
      },
      required: ["name", "price"],
    },
  },
  {
    name: "getTotal",
    description: "Inquire the total bill amount or summary of the current order.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "addDiscount",
    description: "Apply a discount amount in Thai Baht to the order.",
    parameters: {
      type: "OBJECT",
      properties: {
        value: { type: "NUMBER", description: "Discount amount in Thai Baht" },
      },
      required: ["value"],
    },
  },
  {
    name: "checkout",
    description: "Complete and close the current bill / checkout order.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "clearOrder",
    description: "Clear all items and cancel the current order.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
];

const MAX_MESSAGE_LENGTH = 300;
const MAX_PRODUCTS = 200;

// ponytail: per-instance memory; use a shared store (Upstash/KV) if you scale to many instances
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(userId, recent);
  return recent.length > RATE_LIMIT;
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isRateLimited(session.user.id)) {
    return NextResponse.json({ error: "ส่งคำสั่งถี่เกินไป รอสักครู่" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const {
      message,
      pendingAction,
      products = [],
      history = [],
    }: {
      message: string;
      pendingAction?: PendingAction;
      products?: Product[];
      history?: unknown;
    } = body;

    if (!message || typeof message !== "string" || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "ข้อความไม่ถูกต้อง" }, { status: 400 });
    }

    const conversation = validHistory(history);
    if (!conversation) {
      return NextResponse.json({ error: "ประวัติสนทนาไม่ถูกต้อง" }, { status: 400 });
    }

    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not configured.");
      return NextResponse.json({
        actions: [],
        question: "กรุณาตั้งค่า GEMINI_API_KEY ในระบบ",
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Known products list as context
    const productListContext = (Array.isArray(products) ? products : [])
      .slice(0, MAX_PRODUCTS)
      .map((p) => `${p.name} (฿${p.price})`)
      .join(", ");

    let pendingContext = "";
    if (pendingAction && pendingAction.type === "WAITING_PRODUCT_PRICE") {
      pendingContext = `The cashier is currently waiting for the price of "${pendingAction.productName}" (qty: ${pendingAction.qty}). If the user says a price like "60" or "60 บาท", call setProductPrice(name: "${pendingAction.productName}", price: 60) and then addItem(name: "${pendingAction.productName}", qty: ${pendingAction.qty}).`;
    }

    const systemInstruction = `LANGUAGE RULE: Every word you write must be Thai (ภาษาไทย) only. Never answer in English or any other language. ตอบเป็นภาษาไทยเท่านั้น

Answer any topic naturally in Thai without assuming a fixed identity or persona. Keep every answer as short as possible while still answering the question, suitable for speaking aloud. Use ค่ะ as the only polite ending; never use ครับ or คะ. Previous turns describe this bill's conversation and actual POS responses; use them to understand follow-up requests, but never repeat a previous tool action unless requested.

For POS requests:
1. Interpret the cashier's intent, including indirect or unusual wording, and use the available tool declarations and their descriptions to select the appropriate POS tool calls. Only call tools when the user intends an action or a POS inquiry; ask for clarification if unsure.
2. Ignore wake phrases like "เฮ้ Gojo", "hey gojo", "น้องโกโจ", "สวัสดี", "น้องครับ" at the start.
3. NEVER invent store prices, order IDs, or bill totals. All store prices and bill math must come from the POS tools.
4. If information needed for a POS request is missing, ask a short question in Thai.
5. Always pass the quantity the cashier said as qty (digits, Thai numerals like ๒, or Thai words like สอง); use 1 only when no number was said.
6. Never call setProductPrice unless the cashier clearly said a price for that product (a number with บาท/ราคา, or an answer to the price question below). A quantity is not a price: for new products without a price, just call addItem and the POS will ask for the price.
7. You cannot change the order yourself. Never say that something was added, removed or done; only the POS tools do that, and the POS reports the result.
${pendingContext ? `\nActive Context: ${pendingContext}` : ""}
Known products in menu: ${productListContext || "ยังไม่มีรายการที่บันทึก"}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        ...conversation.map(({ role, text }) => ({ role, parts: [{ text }] })),
        { role: "user", parts: [{ text: message }] },
      ],
      config: {
        systemInstruction,
        // Minimize latency for voice commands.
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: [{ functionDeclarations } as any],
      },
    });

    const actions: POSToolAction[] = [];
    let reply: string | undefined;

    // Check for tool / function calls in response
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      for (const call of functionCalls) {
        actions.push({
          tool: call.name as POSToolAction["tool"],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          args: (call.args || {}) as any,
        });
      }
    } else {
      reply = safeModelReply(response.text);
    }

    return NextResponse.json({
      actions: allowedAiActions(actions, message, pendingAction),
      question: reply,
      isQuestion: reply ? isModelQuestion(reply) : false,
    });
  } catch (err: unknown) {
    console.error("Gemini AI API error:", err);
    return NextResponse.json({ actions: [], error: "ระบบ AI ขัดข้อง ลองใหม่อีกครั้ง" });
  }
}
