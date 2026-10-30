"use client";

import { PendingAction } from "@/types/pos";
import { HelpCircle, Check, X } from "lucide-react";
import { useState } from "react";

interface PendingPricePromptProps {
  pendingAction: PendingAction;
  onSetPrice: (productName: string, price: number) => void;
  onCancel: () => void;
}

export function PendingPricePrompt({
  pendingAction,
  onSetPrice,
  onCancel,
}: PendingPricePromptProps) {
  const [customPrice, setCustomPrice] = useState("");

  if (!pendingAction || pendingAction.type !== "WAITING_PRODUCT_PRICE") {
    return null;
  }

  const quickPrices = [40, 50, 60, 70, 80, 100];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customPrice);
    if (!isNaN(val) && val > 0) {
      onSetPrice(pendingAction.productName, val);
      setCustomPrice("");
    }
  };

  return (
    <div className="mx-4 my-2 p-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-5 h-5 text-amber-200 shrink-0" />
          <div>
            <h3 className="font-bold text-base leading-snug">
              {pendingAction.productName} กี่บาท?
            </h3>
            <p className="text-xs text-amber-100">
              พูดราคา เช่น &ldquo;60 บาท&rdquo; หรือเลือกปุ่มด้านล่าง
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-95"
          aria-label="ยกเลิก"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Price Chips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {quickPrices.map((p) => (
          <button
            key={p}
            onClick={() => onSetPrice(pendingAction.productName, p)}
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 active:scale-95 text-white font-semibold text-xs rounded-xl backdrop-blur-xs transition-all border border-white/20 shadow-xs"
          >
            ฿{p}
          </button>
        ))}
      </div>

      {/* Manual Input Fallback */}
      <form onSubmit={handleCustomSubmit} className="mt-2.5 flex space-x-2">
        <input
          type="number"
          step="any"
          value={customPrice}
          onChange={(e) => setCustomPrice(e.target.value)}
          placeholder="ระบุราคาเอง..."
          className="flex-1 px-3 py-1.5 bg-white/15 placeholder-amber-200/70 text-white text-xs rounded-xl border border-white/25 focus:outline-none focus:bg-white/25"
        />
        <button
          type="submit"
          disabled={!customPrice}
          className="px-3 py-1.5 bg-white text-orange-600 font-bold text-xs rounded-xl active:scale-95 transition-all disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5 inline mr-0.5" /> ตกลง
        </button>
      </form>
    </div>
  );
}
