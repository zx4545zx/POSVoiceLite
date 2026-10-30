"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { endpointDelay, tailAfter } from "@/lib/nlp/endpointing";

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
    const emit = (text: string) => {
      const t = text.trim();
      if (!t) return;
      setTranscript(t);
      setInterimTranscript("");
      onResultRef.current?.(t);
    };
    try {
      const recognition = new SpeechRecognitionClass();
      // Hands-free: one long session instead of reopening the mic after every phrase (gaps lose speech)
      recognition.continuous = alwaysOnRef.current;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        committed.clear();
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onend = () => {
        clearTimeout(silenceTimer);
        setIsListening(false);
        // Browsers end recognition after each phrase/silence; reopen the mic while hands-free is on
        if (alwaysOnRef.current && !disposed) {
          setTimeout(() => {
            if (!alwaysOnRef.current || disposed) return;
            try {
              recognition.continuous = true;
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
        if (shouldIgnoreRef.current?.()) {
          setInterimTranscript("");
          return;
        }
        let pending: { index: number; text: string } | null = null;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          const text = item[0].transcript;
          if (item.isFinal) {
            emit(tailAfter(committed.get(i), text));
            committed.delete(i);
          } else {
            pending = { index: i, text };
          }
        }

        if (pending) {
          const { index, text } = pending;
          const pendingTail = tailAfter(committed.get(index), text);
          setInterimTranscript(pendingTail);
          // Browsers can take seconds to mark a phrase final (esp. continuous mode): a pause means it ended
          silenceTimer = setTimeout(() => {
            committed.set(index, text);
            emit(pendingTail);
          }, endpointDelay(pendingTail));
        }
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
      rec.continuous = alwaysOn;
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
