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
3. On a miss, the client POSTs to `app/api/ai/command/route.ts`, which asks Gemini with function declarations (`addItem`, `removeItem`, `updateQty`, `setProductPrice`, ...). Gemini returns `POSToolAction`s for POS requests or text for conversation.
4. `lib/pos/orderEngine.ts` (`executePOSTool` / `executeMultiplePOSTools`) is a pure reducer: `(actions, cart, products, pendingAction)` → new cart, `pendingAction`, response text and optional `needsProductSave` / `completedOrder`. Both paths feed the same engine. Shared types are in `types/pos.ts`.
5. The page persists side effects through `/api/orders` and `/api/products`.

Wake words are user-configurable (`Settings.wakeWords`, stored comma-joined in `Settings!D2`; `undefined` falls back to `DEFAULT_WAKE_WORDS`; `parseWakeWords` enforces 3+ base letters, max 5). Theme colors use the `brand-*` palette in `app/globals.css` (sampled from `public/logo.png`); `gray-150` is also defined there since Tailwind lacks it.

Voice flows (`app/page.tsx`). Push-to-talk: open mic -> speak -> mic closes (the recognizer calls `stop()` once the phrase is handed on) -> "กำลังคิด" -> result. Hands-free (off by default; switch + warnings in Settings via `WakeWordSetting`, `WakeWordBanner` stays on the sales screen while active): background (mic UI idle, only a wake word counts via `extractWakeCommand`, stricter than `cleanVoiceCommand`); a bare wake word opens the mic UI at once and silently, only the bar says "กำลังฟัง..." (a spoken prompt got picked up by the mic) (`startSession`); the next phrase closes the mic UI (`endSession(true)`) and is processed; "wake word + command" in one breath runs directly without opening the mic UI. A session reopens only while the task waits on the user (`pendingAction` price or an AI question), otherwise it returns to background. Slow path (Gemini) says "แป๊บนะ" first and the feedback bar shows "แป๊บนะ… กำลังคิด" with the heard phrase.

Speech plumbing (`hooks/useSpeechRecognition.ts` + `lib/nlp/endpointing.ts`) works around real browser behaviour, each item below was a real bug:
- We decide when a phrase ends, not the browser (it cuts at short pauses and splits "เพิ่มผักกระเพรา" | "2"). The recognizer is always `continuous`; `collectUnsent` merges every unsent result into one utterance (joined with a space; a result that repeats the previous text replaces it); `endpointDelay` waits 1.2s/2.5s (250ms/1.5s after a browser-final), and in patient mode (tap-to-talk or the wake session) 2s/3s regardless of the browser, so pauses between items of a multi-item order don't end the phrase. Tapping the mic again (`finishPhrase`) runs it immediately.
- Duplicate deliveries (Chrome on Android repeats text) are collapsed by `dedupeUtterance` (same phrase within 3s dropped; a result repeating the previous text keeps only the new words). Results skipped while muted are marked used so they never get glued to the next phrase.
- The mic must never act on our own voice ("เพิ่ม X แล้ว" parsed as `addItem` looped forever): `useSpeechSynthesis` mutes from `speak()` for an estimated duration (not `speechSynthesis.speaking`, which sticks on iOS) plus a tail after the real `onend` (only the latest utterance may unmute), the recognizer drops results while muted (`shouldIgnore`), and `isOwnEcho` rejects phrases ending in แล้ว/เรียบร้อย.
- Commands spoken while another is processing are queued in `handleProcessCommand`. Model free text can answer general questions; `safeModelReply` filters common claims that the bill changed, but only `orderEngine` responses are authoritative. The model may not invent prices: the route keeps a `setProductPrice` only when the cashier answered that product's price question or said an explicit price with บาท/ราคา (`allowedAiActions`; the model once set ฿1 on unpriced items by copying a quantity), so an unpriced `addItem` makes the POS ask "X กี่บาท?". `splitMultiItem` splits several items in one phrase, including glued Thai number words ("กะเพราหมูสอง โค้กหนึ่ง").

A price answer must be a bare number (`numberOnly` in `parseFastPath`; digits anywhere used to count), a bare number equal to the ordered quantity is ignored (`ignore: true`) unless it says บาท/ราคา, and anything spoken within `PRICE_ANSWER_GRACE_MS` of the question is dropped, so the tail of the order ("ข้าวผัด" | "1") can never answer its own price question. `pendingAction` is a multi-turn state: an unknown product yields "X กี่บาท?", and the next utterance (e.g. "60 บาท") is parsed by the fast path as the price answer, which saves the product and adds it to the cart.

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
