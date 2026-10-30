"use client";

import { Trash2, CheckCircle2, Keyboard } from "lucide-react";
import { VoiceMicButton } from "./VoiceMicButton";

interface BottomControlsProps {
  itemCount: number;
  total: number;
  isListening: boolean;
  isSupported: boolean;
  onToggleListening: () => void;
  onClearOrder: () => void;
  onCheckout: () => void;
  onToggleKeyboard: () => void;
  isKeyboardOpen: boolean;
}

export function BottomControls({
  itemCount,
  total,
  isListening,
  isSupported,
  onToggleListening,
  onClearOrder,
  onCheckout,
  onToggleKeyboard,
  isKeyboardOpen,
}: BottomControlsProps) {
  return (
    <div className="bg-white border-t border-gray-150 px-4 pt-3 pb-6 sm:pb-4 shadow-lg">
      <div className="flex items-center justify-between max-w-md mx-auto">
        {/* Left: Clear Order Button */}
        <div className="w-24 flex flex-col items-start">
          <button
            onClick={onClearOrder}
            disabled={itemCount === 0}
            className="flex flex-col items-center justify-center p-2 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
            aria-label="ล้างบิล"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-1 text-gray-600 group-hover:bg-red-100 group-hover:text-red-600">
              <Trash2 className="w-5 h-5 text-gray-500" />
            </div>
            <span className="text-[11px] font-medium">ล้างบิล</span>
          </button>
        </div>

        {/* Center: Push-to-Talk Mic */}
        <div className="flex flex-col items-center relative -top-3">
          <VoiceMicButton
            isListening={isListening}
            isSupported={isSupported}
            onToggle={onToggleListening}
            onStart={onToggleListening}
            onStop={onToggleListening}
          />
        </div>

        {/* Right: Checkout Button */}
        <div className="w-24 flex flex-col items-end">
          <button
            onClick={onCheckout}
            disabled={itemCount === 0}
            className="flex flex-col items-center justify-center p-2 rounded-xl text-brand-700 hover:text-brand-800 hover:bg-brand-50 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
            aria-label="คิดเงิน"
          >
            <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center mb-1 shadow-md shadow-brand-600/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-brand-700">คิดเงิน</span>
          </button>
        </div>
      </div>

      {/* Auxiliary keyboard trigger bar */}
      <div className="flex justify-center mt-1">
        <button
          onClick={onToggleKeyboard}
          className={`px-3 py-1 text-xs rounded-full flex items-center space-x-1.5 transition-colors ${
            isKeyboardOpen
              ? "bg-gray-200 text-gray-800 font-semibold"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>{isKeyboardOpen ? "ซ่อนแป้นพิมพ์" : "พิมพ์คำสั่งแทนเสียง"}</span>
        </button>
      </div>
    </div>
  );
}
