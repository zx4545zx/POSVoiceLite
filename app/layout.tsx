import type { Metadata, Viewport } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-kanit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "POS Voice Lite - ระบบขายหน้าร้านสั่งด้วยเสียง",
  description: "Mobile-first voice-controlled POS web app for Thai shops",
  manifest: "/manifest.webmanifest",
  verification: { google: "72CJpktLONfqCO8SrZwodxTDmWX848byI_ZdeGufOyU" },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "POS Voice",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${kanit.variable} h-full bg-gray-100 antialiased select-none`}>
      <body className="min-h-full flex flex-col font-sans text-gray-900 bg-gray-100">
        {children}
      </body>
    </html>
  );
}
