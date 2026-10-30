import { getCurrentSession, getValidAccessToken } from "@/lib/google/auth";
import { fetchProductsFromSheet, saveProductToSheet } from "@/lib/google/sheets";
import { Product } from "@/types/pos";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.isMock) {
    return NextResponse.json({ products: [] });
  }

  const token = await getValidAccessToken(session);
  if (!token || !session.spreadsheetId) {
    return NextResponse.json({ error: "No Google Sheets connection" }, { status: 400 });
  }

  const products = await fetchProductsFromSheet(token, session.spreadsheetId);
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const product: Product = await req.json();
  if (
    !product ||
    typeof product.name !== "string" ||
    !product.name.trim() ||
    typeof product.price !== "number" ||
    !Number.isFinite(product.price) ||
    product.price < 0
  ) {
    return NextResponse.json({ error: "Invalid product data" }, { status: 400 });
  }

  if (session.isMock) {
    // In demo mode, client manages local storage
    return NextResponse.json({ success: true, isMock: true, product });
  }

  const token = await getValidAccessToken(session);
  if (!token || !session.spreadsheetId) {
    return NextResponse.json({ error: "No Google Sheets connection" }, { status: 400 });
  }

  const success = await saveProductToSheet(token, session.spreadsheetId, product);
  return NextResponse.json({ success, product });
}
