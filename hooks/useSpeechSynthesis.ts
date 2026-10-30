"use client";

import { useCallback, useRef } from "react";

export interface UseSpeechSynthesisOptions {
  voiceEnabled?: boolean;
  lang?: string;
}

export function useSpeechSynthesis({
  voiceEnabled = true,
  lang = "th-TH",
}: UseSpeechSynthesisOptions = {}) {
  // The mic must not treat our own voice as a command (that loops: "เพิ่ม X แล้ว" -> heard -> add X again).
  // We don't trust `speechSynthesis.speaking` (it can stick, e.g. iOS Safari): mute from speak() for an estimated
  // duration, and when the utterance really ends keep a short tail for echo/late recognition.
  const mutedUntilRef = useRef(0);
  const lastSpokenRef = useRef({ text: "", at: 0 });
  const utteranceIdRef = useRef(0);

  /** True while our own TTS is playing, or just ended */
  const isSpeaking = useCallback(() => Date.now() < mutedUntilRef.current, []);

  /** Did the mic probably just hear our own confirmation? (our replies end in แล้ว/เรียบร้อย; commands never do) */
  const isOwnEcho = useCallback((heard: string) => {
    if (/(แล้ว|เรียบร้อย)\s*$/.test(heard.trim())) return true;
    const { text, at } = lastSpokenRef.current;
    if (Date.now() - at > 5000) return false;
    const norm = (s: string) => s.replace(/[\s.,?!“”"]/g, "");
    const h = norm(heard);
    const s = norm(text);
    return h.length >= 3 && s.includes(h) && h.length >= s.length * 0.8;
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled || !text || typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }
      mutedUntilRef.current = Date.now() + Math.min(8000, 1500 + text.length * 120);
      lastSpokenRef.current = { text, at: Date.now() };

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

        // A cancelled utterance fires onerror after the next one has started: only the latest may unmute
        const id = ++utteranceIdRef.current;
        const echoTail = Math.min(1500, 400 + text.length * 40);
        const unmuteSoon = () => {
          if (id === utteranceIdRef.current) mutedUntilRef.current = Date.now() + echoTail;
        };
        utterance.onend = unmuteSoon;
        utterance.onerror = unmuteSoon;

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
    isSpeaking,
    isOwnEcho,
  };
}
