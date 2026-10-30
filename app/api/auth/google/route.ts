import { getGoogleOAuthUrl, isGoogleOAuthConfigured } from "@/lib/google/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;

  if (!isGoogleOAuthConfigured()) {
    // If Google OAuth is not yet configured, redirect to login page with setup notice or demo prompt
    return NextResponse.redirect(
      new URL("/?auth_error=oauth_not_configured", origin)
    );
  }

  const authUrl = getGoogleOAuthUrl(origin);
  return NextResponse.redirect(authUrl);
}
