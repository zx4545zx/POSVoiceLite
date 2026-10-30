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
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition({
  lang = "th-TH",
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
  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) return;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: { error: string }) => {
        setIsListening(false);
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
