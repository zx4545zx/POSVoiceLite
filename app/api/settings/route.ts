import { getCurrentSession, getValidAccessToken } from "@/lib/google/auth";
import { fetchSettingsFromSheet, saveSettingsToSheet } from "@/lib/google/sheets";
import { Settings } from "@/types/pos";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.isMock || !session.spreadsheetId) {
    return NextResponse.json({
      shopName: "ร้านของฉัน",
      voiceEnabled: true,
      language: "th-TH",
    });
  }

  const token = await getValidAccessToken(session);
  if (!token) {
    return NextResponse.json({ error: "No Google Sheets connection" }, { status: 400 });
  }

  const settings = await fetchSettingsFromSheet(token, session.spreadsheetId);
  return NextResponse.json(settings);
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: Partial<Settings> = await req.json();

  if (session.isMock || !session.spreadsheetId) {
    return NextResponse.json({ success: true, settings: body, isMock: true });
  }

  const token = await getValidAccessToken(session);
  if (!token) {
    return NextResponse.json({ error: "No Google Sheets connection" }, { status: 400 });
  }

  const success = await saveSettingsToSheet(token, session.spreadsheetId, body);
  return NextResponse.json({ success, settings: body });
}
