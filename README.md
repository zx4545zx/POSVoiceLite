# POS Voice Lite 🎤 🧾

**POS Voice Lite** is a mobile-first, voice-controlled Point of Sale (POS) web app designed specifically for Thai food stalls, cafes, and small retail shops.

Optimized for **iPhone Safari**, **Android Chrome**, and **Mobile PWA**.

---

## ⚡ Key Highlights

- **Push-to-Talk Voice POS**: Tap the microphone, speak natural Thai commands, and see the bill update immediately.
- **Zero-AI Audio Latency**: Speech-to-Text and Text-to-Speech run 100% on-device using standard **Web Speech API** (`SpeechRecognition` & `speechSynthesis`). No external audio API delay or costs.
- **AI Conversation & Tool Calling**: Chat in Thai or use natural language for POS commands. The AI receives the available POS tool descriptions to interpret requests; the POS application remains the source of truth for order changes and totals.
- **Fast Path Local Parser**: Common Thai commands like "คิดเงิน", "ล้างบิล", "ลด 10 บาท", and known products are parsed locally in < 1ms without sending requests to Gemini.
- **Zero-Config Google Sheets**: User simply logs in with Google OAuth. The app automatically creates a `POS Voice Lite` Google Spreadsheet with `Products`, `Orders`, and `Settings` sheets on Google Drive with minimal `drive.file` scope.
- **Missing Product Price Flow**: If a customer orders an item not yet in the menu, POS asks: *"กะเพราหมู กี่บาท?"*. When the cashier says *"60 บาท"*, the price is saved to the Google Sheet and added to the cart automatically.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **PWA**: Mobile-first responsive UI, standalone web app manifest, touch-optimized thumb zone
- **Database**: Google Sheets API v4
- **Auth**: Google OAuth 2.0 (Scopes: `openid`, `email`, `profile`, `drive.file`) with signed JWT session cookies (`jose`)
- **AI**: Google Gemini API (`@google/genai`) with Tool / Function Calling
- **Audio**: Web Speech API (`webkitSpeechRecognition` & `SpeechSynthesis`)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in:
```env
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.1-flash-lite
SESSION_SECRET=your-random-32-char-secret
```

> **Note**: If `GOOGLE_CLIENT_ID` is left empty, the app provides a **Demo Mode** button that allows instant offline testing with full voice POS functionality.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your browser (or your mobile device on the same local network).

### 4. Run Tests
```bash
npm test
```

---

## 🗣️ Thai Voice Commands Cheat Sheet

| Command Example | POS Action | Description |
|---|---|---|
| `กะเพราหมูสอง` / `กะเพราหมู 2` | `addItem("กะเพราหมู", 2)` | Add item with quantity |
| `โค้กหนึ่ง` / `เพิ่มโค้กหนึ่ง` | `addItem("โค้ก", 1)` | Add 1 item |
| `กะเพราหมู กี่บาท?` → `60 บาท` | `setProductPrice`, `addItem` | Set new product price & add to cart |
| `ลบกะเพราหมูหนึ่ง` | `removeItem("กะเพราหมู", 1)` | Decrease quantity by 1 |
| `เอากะเพราหมูออก` | `removeItem("กะเพราหมู")` | Remove item entirely from cart |
| `กะเพราหมูเหลือหนึ่ง` | `updateQty("กะเพราหมู", 1)` | Set exact remaining quantity |
| `ลด 10 บาท` / `ส่วนลด 10 บาท` | `addDiscount(10)` | Apply discount |
| `ยอดเท่าไหร่` / `รวมเท่าไหร่` | `getTotal()` | Voice inquiry for total |
| `คิดเงิน` / `ปิดบิล` / `เช็คบิล` | `checkout()` | Complete order & save to Google Sheets |
| `ล้างบิล` / `ยกเลิกบิล` | `clearOrder()` | Reset order |

*Note: Wake words like "เฮ้ Gojo", "สวัสดี", "น้องครับ" are automatically stripped.*

---

## 📱 Mobile PWA Installation

### iPhone Safari:
1. Open the URL in Safari.
2. Tap the **Share** button (box with arrow pointing up).
3. Tap **Add to Home Screen** (เพิ่มไปยังหน้าจอโฮม).
4. Tap **Add**.

### Android Chrome:
1. Open the URL in Chrome.
2. Tap the three dots menu (⋮) or tap the install prompt banner.
3. Tap **Install app** / **Add to Home screen**.

---

## ☁️ Deploy to Vercel

1. Push your repository to GitHub.
2. Import the project in Vercel.
3. Set Environment Variables:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GEMINI_API_KEY`
   - `SESSION_SECRET`
4. Set Authorized Redirect URI in Google Cloud Console:
   - `https://<your-project>.vercel.app/api/auth/callback/google`
5. Deploy!
