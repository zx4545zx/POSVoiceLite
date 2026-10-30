# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See `AGENTS.md`: this is Next.js 16 with breaking changes; read `node_modules/next/dist/docs/` before writing Next-specific code.

## Commands

- `npm test` runs all tests (`tsx --test tests/**/*.test.ts`, Node's built-in test runner)
- Single file: `npx tsx --test tests/fastPath.test.ts`; single case: add `--test-name-pattern="<name>"`
- Env: copy `.env.example` to `.env.local` (`GOOGLE_CLIENT_ID/SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `SESSION_SECRET`). With no `GOOGLE_CLIENT_ID`, the login screen offers Demo Mode.

## Architecture

Thai voice-controlled POS (mobile-first PWA). The app's cart/price logic is the source of truth; Gemini only interprets language.

Command flow (`app/page.tsx` is the client orchestrator, holding cart/products/pendingAction in state mirrored by refs):
1. Browser Web Speech API (`hooks/useSpeechRecognition.ts`) or the manual input produces text. TTS is `hooks/useSpeechSynthesis.ts`.
2. `lib/nlp/fastPath.ts` `parseFastPath(text, pendingAction, products)` tries a local Thai regex/number parser (handles Thai number words, wake-word stripping, known products, checkout/clear/discount).
3. On a miss, the client POSTs to `app/api/ai/command/route.ts`, which asks Gemini with function declarations (`addItem`, `removeItem`, `updateQty`, `setProductPrice`, ...). Gemini only returns `POSToolAction`s.
4. `lib/pos/orderEngine.ts` (`executePOSTool` / `executeMultiplePOSTools`) is a pure reducer: `(actions, cart, products, pendingAction)` → new cart, `pendingAction`, response text and optional `needsProductSave` / `completedOrder`. Both paths feed the same engine. Shared types are in `types/pos.ts`.
5. The page persists side effects through `/api/orders` and `/api/products`.

Wake words are user-configurable (`Settings.wakeWords`, stored comma-joined in `Settings!D2`; `undefined` falls back to `DEFAULT_WAKE_WORDS`; `parseWakeWords` enforces 3+ base letters, max 5). Theme colors use the `brand-*` palette in `app/globals.css` (sampled from `public/logo.png`); `gray-150` is also defined there since Tailwind lacks it.

Hands-free mode (off by default; the switch + warning live in Settings via `WakeWordSetting`, and `WakeWordBanner` stays on the sales screen while active): `useSpeechRecognition({ alwaysOn })` reopens the mic whenever the browser ends recognition; `app/page.tsx` only acts on phrases starting with a wake word (`extractWakeCommand`, stricter than `cleanVoiceCommand`), and a bare wake word arms the next phrase for 8s. Commands spoken while another is processing are queued in `handleProcessCommand` (not dropped). Model free text is shown only if `safeModelQuestion` says it is a real question, so the AI can never claim the bill changed; only `orderEngine` responses do. Results are dropped while our own TTS plays (`isSpeaking`, capped at 8s because iOS can leave `speechSynthesis.speaking` stuck).

`pendingAction` is a multi-turn state: an unknown product yields "X กี่บาท?", and the next utterance (e.g. "60 บาท") is parsed by the fast path as the price answer, which saves the product and adds it to the cart.

Backend (`app/api/*`, all Route Handlers):
- Auth: `lib/google/auth.ts` does Google OAuth and stores the session (user, tokens, `spreadsheetId`) as a signed `jose` JWT cookie `pos_session`. `auth/demo` creates a session with `isMock: true`.
- Storage: `lib/google/sheets.ts` calls the Sheets/Drive REST API (`drive.file` scope). It auto-creates a `POS Voice Lite` spreadsheet via `api/sheet/init`. Columns are positional ranges, so keep them in sync with the header rows in `sheets.ts`: `Products!A:F` (id, name, price, active, createdAt, updatedAt), `Orders!A:F` (orderId, datetime, items, subtotal, discount, total), `Settings!A2:C2` (shopName, voiceEnabled, language).
- Mock mode: when `session.isMock`, the `orders`, `products` and `settings` routes return early with `isMock: true` and persist nothing. Keep new routes consistent with that branch.
- Reports: `app/reports/page.tsx` fetches `GET /api/orders` (reads `Orders!A2:F`) and aggregates client-side with the pure `lib/pos/reports.ts` (Asia/Bangkok day boundaries; item lines are parsed back out of the `Order.items` summary string, so changing `formatOrderItemsSummary` breaks top-items).
- Imports use the `@/*` alias (maps to the repo root). Tests use relative imports.

## Production notes

- `SESSION_SECRET` (32+ chars) is required in production; `auth.ts` throws on use without it. Sessions are signed JWTs (not encrypted) holding Google tokens in an httpOnly cookie.
- OAuth `state` is stored in the `pos_oauth_state` cookie and checked in the callback. `/api/auth/demo` returns 403 when `GOOGLE_CLIENT_ID` is configured.
- `/api/ai/command` requires a session and caps message length (300) and product list (200). Only `GEMINI_API_KEY` is read, never a `NEXT_PUBLIC_` var.
- Sheet writes use `valueInputOption=RAW` so user-entered text can't become formulas.
- Deploy: set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GEMINI_API_KEY`, `SESSION_SECRET` on Vercel and add `https://<project>.vercel.app/api/auth/callback/google` as an authorized redirect URI.
