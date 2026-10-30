"use client";

import { useState } from "react";
import { AlertTriangle, Ear } from "lucide-react";

interface WakeWordToggleProps {
  enabled: boolean;
  isSupported: boolean;
  wakeWords: string[];
  onChange: (enabled: boolean) => void;
}

export function WakeWordToggle({ enabled, isSupported, wakeWords, onChange }: WakeWordToggleProps) {
  const [confirming, setConfirming] = useState(false);

  if (!isSupported) return null;

  if (enabled) {
    return (
      <div role="status" className="mx-4 mb-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
        <Ear className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
        <p className="flex-1 min-w-0">
          <span className="font-bold">กำลังฟังคำเรียก</span> พูด {wakeWords.slice(0, 3).map((w) => `“${w}…”`).join(" หรือ ")} นำหน้าคำสั่ง
          ไมค์เปิดค้างและกินแบตเตอรี่ ตรวจยอดก่อนคิดเงินทุกครั้ง
        </p>
        <button onClick={() => onChange(false)} className="shrink-0 font-bold text-amber-800 underline">
          ปิด
        </button>
      </div>
    );
  }

  if (confirming) {
    return (
      <div role="alertdialog" aria-label="คำเตือนโหมดเรียกด้วยเสียง" className="mx-4 mb-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-2">
        <p className="font-bold flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-600" /> ก่อนเปิดโหมดเรียกด้วยเสียง
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>เบราว์เซอร์จะเปิดไมค์ค้างและส่งเสียงไปประมวลผลที่ผู้ให้บริการ (เช่น Google/Apple) ต่อเนื่อง ต่างจากโหมดกดแล้วพูด</li>
          <li>กินแบตเตอรี่ เครื่องอาจร้อน ต้องเปิดหน้านี้ค้างและไม่ให้จอดับ</li>
          <li>มือถือ (โดยเฉพาะ iPhone Safari) อาจหยุดฟังเองเมื่อล็อกจอหรือสลับแอป</li>
          <li>เสียงคุยรอบข้างอาจถูกฟังผิด คำสั่งจะทำงานเฉพาะประโยคที่ขึ้นต้นด้วยคำเรียก แต่ควรตรวจยอดก่อนคิดเงินเสมอ</li>
        </ul>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => {
              setConfirming(false);
              onChange(true);
            }}
            className="flex-1 py-2 rounded-lg bg-amber-600 text-white font-bold"
          >
            เข้าใจแล้ว เปิดใช้งาน
          </button>
          <button onClick={() => setConfirming(false)} className="px-4 py-2 rounded-lg bg-white border border-amber-300 font-semibold">
            ยกเลิก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center mb-1">
      <button
        onClick={() => setConfirming(true)}
        className="px-3 py-1 text-xs rounded-full flex items-center space-x-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200"
      >
        <Ear className="w-3.5 h-3.5" />
        <span>เปิดโหมดเรียกด้วยเสียง ({wakeWords[0]}…)</span>
      </button>
    </div>
  );
}
