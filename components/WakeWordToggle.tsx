"use client";

import { useState } from "react";
import { AlertTriangle, Ear } from "lucide-react";

/** Always-visible reminder on the sales screen while the mic is held open */
export function WakeWordBanner({
  wakeWords,
  lastHeard,
  onTurnOff,
}: {
  wakeWords: string[];
  lastHeard: string;
  onTurnOff: () => void;
}) {
  return (
    <div role="status" className="mx-4 mb-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
      <Ear className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
      <p className="flex-1 min-w-0">
        <span className="font-bold">กำลังฟังคำเรียก</span> พูด {wakeWords.slice(0, 3).map((w) => `“${w}…”`).join(" หรือ ")} นำหน้าคำสั่ง
        ไมค์เปิดค้างและกินแบตเตอรี่ ตรวจยอดก่อนคิดเงินทุกครั้ง
        {lastHeard && <span className="block truncate text-amber-700/80">ได้ยินล่าสุด: “{lastHeard}”</span>}
      </p>
      <button onClick={onTurnOff} className="shrink-0 font-bold text-amber-800 underline">
        ปิด
      </button>
    </div>
  );
}

/** Settings row: turning it on first shows the warnings and needs a confirmation */
export function WakeWordSetting({
  enabled,
  isSupported,
  onChange,
}: {
  enabled: boolean;
  isSupported: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!isSupported) {
    return <p className="text-xs text-gray-500">เบราว์เซอร์นี้ไม่รองรับการรับเสียง จึงใช้โหมดเรียกด้วยเสียงไม่ได้</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-150">
        <div className="flex items-center space-x-2.5">
          <Ear className="w-5 h-5 text-gray-600" />
          <div>
            <span className="text-sm font-semibold text-gray-900 block">โหมดเรียกด้วยเสียง</span>
            <span className="text-xs text-gray-500">
              {enabled ? "เปิดอยู่ (ปิดได้จากแถบเตือนหน้าขาย)" : "พูดคำปลุกแล้วสั่งได้เลย ไม่ต้องกดไมค์"}
            </span>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => (e.target.checked ? setConfirming(true) : onChange(false))}
            className="sr-only peer"
            aria-label="โหมดเรียกด้วยเสียง"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
        </label>
      </div>

      {confirming && !enabled && (
        <div role="alertdialog" aria-label="คำเตือนโหมดเรียกด้วยเสียง" className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-2">
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
              type="button"
              onClick={() => {
                setConfirming(false);
                onChange(true);
              }}
              className="flex-1 py-2 rounded-lg bg-amber-600 text-white font-bold"
            >
              เข้าใจแล้ว เปิดใช้งาน
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="px-4 py-2 rounded-lg bg-white border border-amber-300 font-semibold">
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
