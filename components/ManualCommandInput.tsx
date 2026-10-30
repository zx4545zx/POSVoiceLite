"use client";

import { useState } from "react";
import { Send } from "lucide-react";

interface ManualCommandInputProps {
  isOpen: boolean;
  onSendCommand: (command: string) => void;
  isProcessing: boolean;
}

export function ManualCommandInput({
  isOpen,
  onSendCommand,
  isProcessing,
}: ManualCommandInputProps) {
  const [text, setText] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isProcessing) return;
    onSendCommand(text.trim());
    setText("");
  };

  const sampleCommands = [
    "กะเพราหมูสอง",
    "โค้กหนึ่ง",
    "ลด 10 บาท",
    "คิดเงิน",
    "ล้างบิล",
  ];

  return (
    <div className="bg-gray-50 border-t border-gray-200 p-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="พิมพ์คำสั่ง เช่น กะเพราหมูสอง, คิดเงิน..."
          className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          autoFocus
        />
        <button
          type="submit"
          disabled={!text.trim() || isProcessing}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-medium text-sm rounded-xl transition-all disabled:opacity-50 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Quick Suggestion Pills */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {sampleCommands.map((cmd) => (
          <button
            key={cmd}
            type="button"
            onClick={() => onSendCommand(cmd)}
            className="px-2.5 py-1 text-xs bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 rounded-lg border border-gray-200 transition-colors"
          >
            {cmd}
          </button>
        ))}
      </div>
    </div>
  );
}
