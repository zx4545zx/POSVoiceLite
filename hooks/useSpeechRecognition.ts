"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { collectUnsent, dedupeUtterance, endpointDelay } from "@/lib/nlp/endpointing";

// Types for Web Speech API
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseSpeechRecognitionOptions {
  lang?: string;
  /** Keep the mic open: restart recognition whenever the browser ends it */
  alwaysOn?: boolean;
  /** Drop recognition results while this returns true (e.g. our own TTS is playing) */
  shouldIgnore?: () => boolean;
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition({
  lang = "th-TH",
  alwaysOn = false,
  shouldIgnore,
  onResult,
  onError,
}: UseSpeechRecognitionOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const isSupported = useSyncExternalStore(
    () => () => {},
    () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    () => true
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  const alwaysOnRef = useRef(alwaysOn);
  const shouldIgnoreRef = useRef(shouldIgnore);
  useEffect(() => {
    shouldIgnoreRef.current = shouldIgnore;
    onResultRef.current = onResult;
    onErrorRef.current = onError;
    alwaysOnRef.current = alwaysOn;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) return;

    let disposed = false;
    // Our own end-of-phrase detection (see lib/nlp/endpointing.ts): resultIndex -> text already handed on
    const committed = new Map<number, string>();
    let silenceTimer: ReturnType<typeof setTimeout> | undefined;
    let pending: { tail: string; snapshot: [number, string][] } | null = null;
    let lastEmit: { text: string; at: number } | undefined;
    const emit = (text: string) => {
      const raw = text.trim();
      const t = dedupeUtterance(raw, lastEmit, Date.now());
      if (raw) lastEmit = { text: dedupeUtterance(raw, undefined, 0), at: Date.now() };
      if (!t) return;
      setTranscript(t);
      setInterimTranscript("");
      onResultRef.current?.(t);
    };
    try {
      const recognition = new SpeechRecognitionClass();
      // Always continuous: we decide when the phrase ends (the browser's own cut-off is too eager and splits
      // "เพิ่มผักกระเพรา" from its quantity). Push-to-talk stops the session itself once the phrase is handed on.
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      // Hand on everything not yet sent, as one utterance
      const flush = () => {
        clearTimeout(silenceTimer);
        if (!pending) return;
        const { tail, snapshot } = pending;
        pending = null;
        snapshot.forEach(([i, t]) => committed.set(i, t));
        emit(tail);
        if (!alwaysOnRef.current) {
          try {
            recognition.stop();
          } catch {
            // already stopped
          }
        }
      };

      recognition.onstart = () => {
        committed.clear();
        pending = null;
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onend = () => {
        flush(); // the session is over, nothing more can be added to the pending phrase
        setIsListening(false);
        // Browsers end recognition after each phrase/silence; reopen the mic while hands-free is on
        if (alwaysOnRef.current && !disposed) {
          setTimeout(() => {
            if (!alwaysOnRef.current || disposed) return;
            try {
              recognition.start();
            } catch {
              // already started
            }
          }, 100);
        }
      };

      recognition.onerror = (event: { error: string }) => {
        setIsListening(false);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          alwaysOnRef.current = false; // mic denied: don't loop
        }
        // Ignore "no-speech" or "aborted" as normal user behaviors
        if (event.error !== "no-speech" && event.error !== "aborted") {
          console.warn("Speech recognition error:", event.error);
          setErrorMessage(event.error);
          onErrorRef.current?.(event.error);
        }
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        clearTimeout(silenceTimer);
        const results = Array.from({ length: event.results.length }, (_, i) => {
          const r = event.results[i];
          return r ? { text: r[0].transcript, isFinal: r.isFinal } : undefined;
        }) as { text: string; isFinal: boolean }[];
        if (shouldIgnoreRef.current?.()) {
          // Our own voice: mark it as used, otherwise it comes back later glued to the user's next phrase
          results.forEach((r, i) => r && committed.set(i, r.text));
          pending = null;
          setInterimTranscript("");
          return;
        }
        const { tail, snapshot, lastIsFinal } = collectUnsent(results, committed);
        if (!tail.trim()) {
          pending = null;
          setInterimTranscript("");
          return;
        }
        pending = { tail, snapshot };
        setInterimTranscript(tail);
        silenceTimer = setTimeout(flush, endpointDelay(tail, lastIsFinal));
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.error("Failed to initialize SpeechRecognition:", e);
    }

    return () => {
      disposed = true;
      clearTimeout(silenceTimer);
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore abort cleanup error
      }
    };
  }, [lang]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      setErrorMessage(null);
      setTranscript("");
      setInterimTranscript("");
      recognitionRef.current.abort(); // Clear any previous instance
      recognitionRef.current.start();
    } catch (e) {
      console.warn("Could not start recognition:", e);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (e) {
      console.warn("Could not stop recognition:", e);
    }
  }, []);

  useEffect(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      if (alwaysOn) rec.start();
      else rec.abort();
    } catch {
      // already started / not started
    }
  }, [alwaysOn]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
    setTranscript,
  };
}
