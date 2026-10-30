import { signSession, COOKIE_NAME } from "@/lib/google/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const origin = req.nextUrl.origin;

  const sessionJwt = await signSession({
    user: {
      id: "demo-user-001",
      email: "demo@posvoicelite.app",
      name: "ผู้ใช้ทดลอง (Demo User)",
    },
    spreadsheetId: "mock-spreadsheet-pos-voice-lite",
    spreadsheetUrl: "#demo-sheet",
    isMock: true,
  });

  const res = NextResponse.json({ success: true, isMock: true });
  res.cookies.set(COOKIE_NAME, sessionJwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  return res;
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const sessionJwt = await signSession({
    user: {
      id: "demo-user-001",
      email: "demo@posvoicelite.app",
      name: "ผู้ใช้ทดลอง (Demo User)",
    },
    spreadsheetId: "mock-spreadsheet-pos-voice-lite",
    spreadsheetUrl: "#demo-sheet",
    isMock: true,
  });

  const res = NextResponse.redirect(new URL("/", origin));
  res.cookies.set(COOKIE_NAME, sessionJwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/",
  });

  return res;
}
