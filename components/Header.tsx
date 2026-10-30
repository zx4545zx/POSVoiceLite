"use client";

import { Settings as SettingsIcon, ExternalLink, Cloud, CloudOff } from "lucide-react";
import { UserSession } from "@/types/pos";

interface HeaderProps {
  shopName: string;
  session: UserSession | null;
  onOpenSettings: () => void;
}

export function Header({ shopName, session, onOpenSettings }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-150 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
          POS
        </div>
        <div>
          <h1 className="font-bold text-gray-900 text-lg leading-tight truncate max-w-[170px] sm:max-w-xs">
            {shopName || "ร้านของฉัน"}
          </h1>
          <div className="flex items-center space-x-1.5 text-xs text-gray-500">
            {session?.isLoggedIn ? (
              session.isMock ? (
                <span className="inline-flex items-center text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded text-[10px] font-medium">
                  <CloudOff className="w-3 h-3 mr-0.5" /> โหมดทดลอง
                </span>
              ) : (
                <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-medium">
                  <Cloud className="w-3 h-3 mr-0.5" /> เชื่อมต่อ Sheet แล้ว
                </span>
              )
            ) : (
              <span className="text-gray-400">ยังไม่เข้าสู่ระบบ</span>
            )}
            {session?.spreadsheetUrl && !session.isMock && (
              <a
                href={session.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-gray-400 hover:text-emerald-600 inline-flex items-center"
                title="เปิด Google Sheets"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          aria-label="ตั้งค่าร้านค้า"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
