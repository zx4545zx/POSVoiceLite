import { getCurrentSession, getValidAccessToken } from "@/lib/google/auth";
import {
  ensurePOSSpreadsheet,
  fetchProductsFromSheet,
  fetchSettingsFromSheet,
} from "@/lib/google/sheets";
import { Product, Settings } from "@/types/pos";
import { NextResponse } from "next/server";

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "P001",
    name: "กะเพราหมู",
    price: 60,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "P002",
    name: "โค้ก",
    price: 20,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_SETTINGS: Settings = {
  shopName: "ร้านของฉัน",
  voiceEnabled: true,
  language: "th-TH",
};

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. If Mock / Demo Mode
  if (session.isMock) {
    return NextResponse.json({
      spreadsheetId: "mock-spreadsheet-pos-voice-lite",
      spreadsheetUrl: "#demo-sheet",
      products: DEFAULT_PRODUCTS,
      settings: DEFAULT_SETTINGS,
      isMock: true,
    });
  }

  // 2. Real Google Sheets integration
  const token = await getValidAccessToken(session);
  if (!token) {
    return NextResponse.json({ error: "No valid Google token" }, { status: 401 });
  }

  try {
    const sheetInfo = await ensurePOSSpreadsheet(token);
    let products = await fetchProductsFromSheet(token, sheetInfo.id);

    // If products sheet is currently empty, seed with initial products
    if (products.length === 0) {
      products = DEFAULT_PRODUCTS;
    }

    const settings = await fetchSettingsFromSheet(token, sheetInfo.id);

    return NextResponse.json({
      spreadsheetId: sheetInfo.id,
      spreadsheetUrl: sheetInfo.url,
      products,
      settings,
      isMock: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error initializing sheet";
    console.error("Sheet init error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
