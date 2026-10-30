import {
  getGoogleOAuthUrl,
  isGoogleOAuthConfigured,
  OAUTH_STATE_COOKIE,
} from "@/lib/google/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/?auth_error=oauth_not_configured", origin)
    );
  }

  const state = crypto.randomUUID();
  const res = NextResponse.redirect(getGoogleOAuthUrl(origin, state));
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });
  return res;
}
