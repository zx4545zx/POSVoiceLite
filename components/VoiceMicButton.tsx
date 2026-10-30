"use client";

import { Mic, MicOff } from "lucide-react";

interface VoiceMicButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onToggle: () => void;
  onStart: () => void;
  onStop: () => void;
}

export function VoiceMicButton({
  isListening,
  isSupported,
  onToggle,
}: VoiceMicButtonProps) {
  if (!isSupported) {
    return (
      <div className="flex flex-col items-center">
        <button
          disabled
          className="w-20 h-20 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center cursor-not-allowed shadow-inner"
          aria-label="เบราว์เซอร์ไม่รองรับคำสั่งเสียง"
        >
          <MicOff className="w-8 h-8" />
        </button>
        <span className="text-xs text-gray-400 mt-1.5 font-medium">
          ไมค์ไม่รองรับ
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Pulse ring animations during active listening */}
      {isListening && (
        <>
          <div className="absolute -inset-3 rounded-full bg-brand-500/20 animate-ping" />
          <div className="absolute -inset-1.5 rounded-full bg-brand-500/30 animate-pulse" />
        </>
      )}

      <button
        onClick={onToggle}
        className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-xl ${
          isListening
            ? "bg-red-500 text-white shadow-red-500/40 ring-4 ring-red-200"
            : "bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/30 hover:shadow-brand-600/50"
        }`}
        aria-label={isListening ? "กำลังฟัง แตะเพื่อหยุด" : "แตะเพื่อพูดสั่งอาหาร"}
      >
        <Mic className={`w-9 h-9 ${isListening ? "animate-bounce" : ""}`} />
      </button>

      <span
        className={`text-xs mt-2 font-medium tracking-wide transition-colors ${
          isListening ? "text-red-600 font-bold animate-pulse" : "text-gray-600"
        }`}
      >
        {isListening ? "กำลังฟัง..." : "แตะเพื่อพูด"}
      </span>
    </div>
  );
}
