import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "pos_session";
const OAUTH_STATE_COOKIE = "pos_oauth_state";

// Resolved lazily so `next build` doesn't need the secret; production refuses to run without it.
function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set to at least 32 characters");
    }
    return new TextEncoder().encode("dev-only-secret-key-not-for-production!!");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionData {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string;
  };
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  isMock?: boolean;
}

/**
 * Returns true if Google OAuth environment variables are provided
 */
export function isGoogleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
}

/**
 * Generates the Google OAuth authorization URL
 */
export function getGoogleOAuthUrl(origin: string, state?: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const redirectUri = `${origin}/api/auth/callback/google`;
  const scopes = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/drive.file",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state: state || "pos_login",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchanges authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  origin: string
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token: string;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = `${origin}/api/auth/callback/google`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Token exchange failed:", res.status, err);
    throw new Error(`Token exchange failed: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Refreshes an expired access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to refresh token");
  }

  return await res.json();
}

/**
 * Returns a valid access token for the given session, refreshing if needed
 */
export async function getValidAccessToken(
  session: SessionData
): Promise<string | null> {
  if (session.isMock) return "mock-token";
  if (!session.accessToken) return null;

  const now = Date.now();
  if (session.expiresAt && session.expiresAt - now < 60 * 1000) {
    if (session.refreshToken) {
      try {
        const refreshed = await refreshAccessToken(session.refreshToken);
        session.accessToken = refreshed.access_token;
        session.expiresAt = now + refreshed.expires_in * 1000;
        return refreshed.access_token;
      } catch (e) {
        console.error("Token refresh failed:", e);
      }
    }
  }

  return session.accessToken;
}

/**
 * Decodes user info from an ID token
 */
export function decodeIdToken(idToken: string): {
  id: string;
  email: string;
  name: string;
  picture?: string;
} {
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) throw new Error("Invalid id_token");
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );
    return {
      id: payload.sub || "user",
      email: payload.email || "",
      name: payload.name || payload.email || "Cashier",
      picture: payload.picture,
    };
  } catch (e) {
    console.error("Error decoding id_token:", e);
    return { id: "user", email: "", name: "Cashier" };
  }
}

/**
 * Creates signed (not encrypted) JWT session token
 */
export async function signSession(sessionData: SessionData): Promise<string> {
  return await new SignJWT({ ...sessionData })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());
}

/**
 * Verifies JWT session token
 */
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionData;
  } catch {
    return null;
  }
}

/**
 * Retrieves the current session from incoming cookie header or next/headers cookies
 */
export async function getCurrentSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySession(token);
  } catch {
    return null;
  }
}

export { COOKIE_NAME, OAUTH_STATE_COOKIE };
