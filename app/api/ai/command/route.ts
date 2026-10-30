import { GoogleGenAI } from "@google/genai";
import { PendingAction, POSToolAction, Product } from "@/types/pos";
import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      pendingAction,
      products = [],
    }: {
      message: string;
      pendingAction?: PendingAction;
      products?: Product[];
    } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
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
    const productListContext = products
      .map((p) => `${p.name} (฿${p.price})`)
      .join(", ");

    let pendingContext = "";
    if (pendingAction && pendingAction.type === "WAITING_PRODUCT_PRICE") {
      pendingContext = `The cashier is currently waiting for the price of "${pendingAction.productName}" (qty: ${pendingAction.qty}). If the user says a price like "60" or "60 บาท", call setProductPrice(name: "${pendingAction.productName}", price: 60) and then addItem(name: "${pendingAction.productName}", qty: ${pendingAction.qty}).`;
    }

    const systemInstruction = `You are the natural language understanding parser for POS Voice Lite, a voice-controlled mobile POS app for Thai restaurants and shops.

Your job:
1. Parse the cashier's spoken Thai command into one or more POS tool calls.
2. Ignore wake phrases like "เฮ้ Gojo", "hey gojo", "น้องโกโจ", "สวัสดี", "น้องครับ" at the start.
3. NEVER invent prices, order IDs, or bill totals. All prices and math must come from the POS tools.
4. If the user asks a question or information is missing, ask a very short question in Thai (under 8 words).
${pendingContext ? `\nActive Context: ${pendingContext}` : ""}
Known products in menu: ${productListContext || "ยังไม่มีรายการที่บันทึก"}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: message,
      config: {
        systemInstruction,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: [{ functionDeclarations } as any],
      },
    });

    const actions: POSToolAction[] = [];
    let clarifyingQuestion: string | undefined = undefined;

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
      // If no function call, check if model asked a short question in plain text
      const text = response.text?.trim();
      if (text) {
        clarifyingQuestion = text;
      }
    }

    return NextResponse.json({
      actions,
      question: clarifyingQuestion,
    });
  } catch (err: unknown) {
    console.error("Gemini AI API error:", err);
    const message = err instanceof Error ? err.message : "AI interpretation error";
    return NextResponse.json({
      actions: [],
      error: message,
    });
  }
}
