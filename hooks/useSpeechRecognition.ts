"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";

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
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition({
  lang = "th-TH",
  alwaysOn = false,
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
  useEffect(() => {
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
    try {
      const recognition = new SpeechRecognitionClass();
      // Hands-free: one long session instead of reopening the mic after every phrase (gaps lose speech)
      recognition.continuous = alwaysOnRef.current;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onend = () => {
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
        let currentInterim = "";
        let currentFinal = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            currentFinal += item[0].transcript;
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (currentFinal) {
          const trimmedFinal = currentFinal.trim();
          setTranscript(trimmedFinal);
          setInterimTranscript("");
          onResultRef.current?.(trimmedFinal);
        } else if (currentInterim) {
          setInterimTranscript(currentInterim);
        }
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.error("Failed to initialize SpeechRecognition:", e);
    }

    return () => {
      disposed = true;
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
