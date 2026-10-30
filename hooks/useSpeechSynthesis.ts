"use client";

import { useCallback, useEffect, useRef } from "react";

export interface UseSpeechSynthesisOptions {
  voiceEnabled?: boolean;
  lang?: string;
}

export function useSpeechSynthesis({
  voiceEnabled = true,
  lang = "th-TH",
}: UseSpeechSynthesisOptions = {}) {
  const isSupportedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      isSupportedRef.current = true;
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled || !text || typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }

      try {
        // Cancel any pending or ongoing speech immediately to stay responsive
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.05; // Slightly brisk for fast cashier feel
        utterance.pitch = 1.0;

        // Try to pick a Thai voice if available
        const voices = window.speechSynthesis.getVoices();
        const thaiVoice = voices.find((v) => v.lang.startsWith("th") || v.lang === "th_TH");
        if (thaiVoice) {
          utterance.voice = thaiVoice;
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn("SpeechSynthesis error:", err);
      }
    },
    [voiceEnabled, lang]
  );

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return {
    speak,
    stop,
    isSupported: isSupportedRef.current,
  };
}
