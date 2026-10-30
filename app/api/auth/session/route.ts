import { getCurrentSession, isGoogleOAuthConfigured } from "@/lib/google/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getCurrentSession();
  const isConfigured = isGoogleOAuthConfigured();

  if (!session) {
    return NextResponse.json({
      isLoggedIn: false,
      isConfigured,
    });
  }

  return NextResponse.json({
    isLoggedIn: true,
    isConfigured,
    isMock: Boolean(session.isMock),
    user: session.user,
    spreadsheetId: session.spreadsheetId,
    spreadsheetUrl: session.spreadsheetUrl,
  });
}
