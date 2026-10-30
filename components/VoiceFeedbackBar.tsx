"use client";

import { Volume2, Sparkles, AlertCircle } from "lucide-react";

interface VoiceFeedbackBarProps {
  transcript: string;
  interimTranscript: string;
  responseText: string;
  isProcessing: boolean;
  errorMessage: string | null;
}

export function VoiceFeedbackBar({
  transcript,
  interimTranscript,
  responseText,
  isProcessing,
  errorMessage,
}: VoiceFeedbackBarProps) {
  const currentHeard = interimTranscript || transcript;

  if (errorMessage) {
    return (
      <div className="mx-4 mb-2 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
        <span className="truncate">เกิดข้อผิดพลาดของไมโครโฟน: {errorMessage}</span>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="mx-4 mb-2 p-2.5 bg-emerald-50 border border-emerald-150 text-emerald-800 text-xs rounded-xl flex items-center justify-center space-x-2 animate-pulse">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
        <span className="font-medium">กำลังประมวลผลคำสั่ง...</span>
      </div>
    );
  }

  if (currentHeard) {
    return (
      <div className="mx-4 mb-2 p-2.5 bg-gray-900/90 backdrop-blur-xs text-white text-xs rounded-xl flex items-center justify-between shadow-md animate-in fade-in duration-150">
        <div className="flex items-center space-x-2 truncate pr-2">
          <span className="text-gray-400 shrink-0">ได้ยิน:</span>
          <span className="font-semibold text-emerald-400 truncate">
            &ldquo;{currentHeard}&rdquo;
          </span>
        </div>
        {responseText && (
          <div className="flex items-center space-x-1 text-emerald-300 text-[11px] shrink-0">
            <Volume2 className="w-3 h-3" />
            <span className="font-medium">{responseText}</span>
          </div>
        )}
      </div>
    );
  }

  if (responseText) {
    return (
      <div className="mx-4 mb-2 p-2 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-center justify-center space-x-1.5 font-medium">
        <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>{responseText}</span>
      </div>
    );
  }

  return null;
}
