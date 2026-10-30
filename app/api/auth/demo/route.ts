import { signSession, COOKIE_NAME, isGoogleOAuthConfigured } from "@/lib/google/auth";
import { NextRequest, NextResponse } from "next/server";

// Demo sessions are unauthenticated; only allow them when real login isn't configured.
const demoDisabled = () =>
  isGoogleOAuthConfigured()
    ? NextResponse.json({ error: "Demo mode disabled" }, { status: 403 })
    : null;

export async function POST() {
  const blocked = demoDisabled();
  if (blocked) return blocked;

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
  const blocked = demoDisabled();
  if (blocked) return blocked;
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
