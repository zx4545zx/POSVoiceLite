"use client";

import { Mic, ArrowRight, ShieldCheck, Sparkles, Table } from "lucide-react";
import { useState } from "react";

interface LoginScreenProps {
  onLoginDemo: () => Promise<void>;
  isConfigured: boolean;
}

export function LoginScreen({ onLoginDemo, isConfigured }: LoginScreenProps) {
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleDemo = async () => {
    setLoadingDemo(true);
    try {
      await onLoginDemo();
    } finally {
      setLoadingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-gray-50 flex flex-col justify-between p-6 max-w-md mx-auto select-none">
      {/* Top Branding */}
      <div className="pt-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-600/30 mb-4 animate-in zoom-in-90 duration-300">
          <Mic className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          POS Voice Lite
        </h1>
        <p className="text-sm text-gray-500 mt-1.5 font-medium">
          ระบบขายหน้าร้านสั่งงานด้วยเสียงภาษาไทย
        </p>
      </div>

      {/* Feature Highlights */}
      <div className="my-8 space-y-3">
        <div className="p-3.5 bg-white rounded-2xl border border-emerald-100 shadow-xs flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900">สั่งด้วยเสียงทันที</h3>
            <p className="text-[11px] text-gray-500">
              แตะไมค์แล้วพูด เช่น &ldquo;กะเพราหมูสอง&rdquo; บิลอัปเดตทันที
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-emerald-100 shadow-xs flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900">
              สร้าง Google Sheets ให้อัตโนมัติ
            </h3>
            <p className="text-[11px] text-gray-500">
              บันทึกสินค้า ยอดขาย และการตั้งค่าลง Google Drive ส่วนตัวของคุณ
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-2xl border border-emerald-100 shadow-xs flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900">
              Gemini AI จัดการความยืดหยุ่น
            </h3>
            <p className="text-[11px] text-gray-500">
              เข้าใจภาษาพูดธรรมชาติ เพิ่มเมนูและราคาใหม่ได้ทันทีขณะสั่ง
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pb-4">
        {isConfigured ? (
          <a
            href="/api/auth/google"
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.24 10.285V13.4h6.887C18.2 15.633 16.32 18 12.24 18c-3.6 0-6.52-2.92-6.52-6.52s2.92-6.52 6.52-6.52c1.78 0 3.32.68 4.48 1.76l2.36-2.36C17.48 2.8 15.08 2 12.24 2 6.58 2 2 6.58 2 12.24s4.58 10.24 10.24 10.24c5.92 0 9.84-4.16 9.84-10.04 0-.68-.08-1.32-.2-1.92H12.24z" />
            </svg>
            <span>เข้าสู่ระบบด้วย Google</span>
          </a>
        ) : (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 text-center">
            ยังไม่ได้ตั้งค่า Google OAuth ใน .env สามารถทดลองใช้งานโหมดเดโมได้ทันที
          </div>
        )}

        <button
          type="button"
          onClick={handleDemo}
          disabled={loadingDemo}
          className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 active:scale-98 text-gray-800 font-semibold text-sm rounded-2xl transition-all flex items-center justify-center space-x-1.5"
        >
          <span>{loadingDemo ? "กำลังเข้าสู่ระบบ..." : "ทดลองใช้งานทันที (Demo)"}</span>
          <ArrowRight className="w-4 h-4 text-gray-500" />
        </button>

        <div className="flex items-center justify-center space-x-1 text-[11px] text-gray-400 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>ขอสิทธิ์เฉพาะ Google Drive ไฟล์ที่สร้างโดยแอพนี้เท่านั้น</span>
        </div>
      </div>
    </div>
  );
}
