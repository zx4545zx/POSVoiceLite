import {
  decodeIdToken,
  exchangeCodeForTokens,
  signSession,
  COOKIE_NAME,
  OAUTH_STATE_COOKIE,
} from "@/lib/google/auth";
import { ensurePOSSpreadsheet } from "@/lib/google/sheets";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const expectedState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!expectedState || searchParams.get("state") !== expectedState) {
    return NextResponse.redirect(new URL("/?auth_error=invalid_state", origin));
  }

  if (error || !code) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(error || "no_code")}`, origin)
    );
  }

  try {
    // 1. Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, origin);

    // 2. Extract user info
    const user = decodeIdToken(tokens.id_token);

    // 3. Ensure "POS Voice Lite" spreadsheet exists or is created automatically
    let spreadsheetId = "";
    let spreadsheetUrl = "";

    try {
      const sheetInfo = await ensurePOSSpreadsheet(tokens.access_token);
      spreadsheetId = sheetInfo.id;
      spreadsheetUrl = sheetInfo.url;
    } catch (sheetErr) {
      console.error("Error setting up spreadsheet on callback:", sheetErr);
    }

    // 4. Create signed session token
    const expiresAt = Date.now() + tokens.expires_in * 1000;
    const sessionJwt = await signSession({
      user,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      spreadsheetId,
      spreadsheetUrl,
      isMock: false,
    });

    // 5. Set session cookie and redirect to main POS app
    const res = NextResponse.redirect(new URL("/", origin));
    res.cookies.set(COOKIE_NAME, sessionJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    res.cookies.delete(OAUTH_STATE_COOKIE);
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "auth_failed";
    console.error("Failed during Google OAuth callback:", err);
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(message)}`, origin)
    );
  }
}
