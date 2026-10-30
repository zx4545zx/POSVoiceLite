import { getCurrentSession, getValidAccessToken } from "@/lib/google/auth";
import { appendOrderToSheet } from "@/lib/google/sheets";
import { Order } from "@/types/pos";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order: Order = await req.json();
  if (!order || !order.orderId || order.total === undefined) {
    return NextResponse.json({ error: "Invalid order data" }, { status: 400 });
  }

  if (session.isMock) {
    return NextResponse.json({ success: true, isMock: true, order });
  }

  const token = await getValidAccessToken(session);
  if (!token || !session.spreadsheetId) {
    return NextResponse.json({ error: "No Google Sheets connection" }, { status: 400 });
  }

  const success = await appendOrderToSheet(token, session.spreadsheetId, order);
  return NextResponse.json({ success, order });
}
