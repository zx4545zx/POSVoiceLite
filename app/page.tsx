"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Header } from "@/components/Header";
import { OrderList } from "@/components/OrderList";
import { OrderSummary } from "@/components/OrderSummary";
import { BottomControls } from "@/components/BottomControls";
import { WakeWordBanner } from "@/components/WakeWordToggle";
import { VoiceFeedbackBar } from "@/components/VoiceFeedbackBar";
import { PendingPricePrompt } from "@/components/PendingPricePrompt";
import { SettingsModal } from "@/components/SettingsModal";
import { CheckoutSuccessModal } from "@/components/CheckoutSuccessModal";
import { ManualCommandInput } from "@/components/ManualCommandInput";
import { LoginScreen } from "@/components/LoginScreen";

import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";

import {
  CartState,
  Order,
  PendingAction,
  POSToolAction,
  Product,
  Settings,
  UserSession,
} from "@/types/pos";
import {
  executeMultiplePOSTools,
  executePOSTool,
  initialCartState,
} from "@/lib/pos/orderEngine";
import { DEFAULT_WAKE_WORDS, extractWakeCommand, parseFastPath } from "@/lib/nlp/fastPath";

export default function Home() {
  // Session & Auth state
  const [session, setSession] = useState<UserSession | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  // Shop Settings & Catalog
  const [settings, setSettings] = useState<Settings>({
    shopName: "ร้านของฉัน",
    voiceEnabled: true,
    language: "th-TH",
  });
  const [products, setProducts] = useState<Product[]>([]);

  // POS State
  const [cart, setCart] = useState<CartState>(initialCartState);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [lastResponseText, setLastResponseText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // UI Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // References for latest state inside callbacks
  const cartRef = useRef(cart);
  const productsRef = useRef(products);
  const pendingActionRef = useRef(pendingAction);
  useEffect(() => {
    cartRef.current = cart;
    productsRef.current = products;
    pendingActionRef.current = pendingAction;
  });

  // Text to Speech
  const { speak, isSpeaking } = useSpeechSynthesis({
    voiceEnabled: settings.voiceEnabled,
    lang: settings.language || "th-TH",
  });

  // Check auth session on load
  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setIsConfigured(Boolean(data.isConfigured));
        if (data.isLoggedIn) {
          setSession(data);
          // Fetch initial sheet data
          const sheetRes = await fetch("/api/sheet/init");
          if (sheetRes.ok) {
            const sheetData = await sheetRes.json();
            if (sheetData.products) setProducts(sheetData.products);
            if (sheetData.settings) {
              setSettings((prev) => ({
                ...prev,
                ...sheetData.settings,
                spreadsheetId: sheetData.spreadsheetId,
                spreadsheetUrl: sheetData.spreadsheetUrl,
              }));
            }
          }
        } else {
          setSession(null);
        }
      }
    } catch (e) {
      console.error("Error loading session:", e);
    } finally {
      setIsSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time session fetch on mount
    loadSession();
  }, [loadSession]);

  // Core Command Dispatcher
  const processCommand = useCallback(
    async (rawCommand: string) => {
      if (!rawCommand) return;
      askedQuestionRef.current = false;
      setIsProcessing(true);

      const currentCart = cartRef.current;
      const currentProducts = productsRef.current;
      const currentPending = pendingActionRef.current;

      try {
        // Step 1: Fast Path Check (Regex / Local Thai NLP)
        const fastResult = parseFastPath(
          rawCommand,
          currentPending,
          currentProducts
        );

        if (fastResult && fastResult.actions.length > 0) {
          // Fast Path Matched! Execute POS Tool actions locally
          const result = executeMultiplePOSTools(
            fastResult.actions,
            currentCart,
            currentProducts,
            currentPending
          );

          // Update UI state immediately!
          setCart(result.cart);
          setProducts(result.products);
          setPendingAction(result.pendingAction);
          setLastResponseText(result.responseText);

          if (result.completedOrder) {
            setCompletedOrder(result.completedOrder);
            // Asynchronously append to Google Sheets
            fetch("/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(result.completedOrder),
            }).catch((err) => console.error("Failed to append order:", err));
          }

          if (result.needsProductSave) {
            // Asynchronously save/update product in Google Sheets
            fetch("/api/products", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(result.needsProductSave),
            }).catch((err) => console.error("Failed to save product:", err));
          }

          // Browser Text-to-Speech responds
          if (result.speak && result.responseText) {
            speak(result.responseText);
          }

          return;
        }

        // Step 2: Uncertain -> Call Gemini AI Tool Calling endpoint
        const aiRes = await fetch("/api/ai/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: rawCommand,
            pendingAction: currentPending,
            products: currentProducts,
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();

          if (aiData.actions && aiData.actions.length > 0) {
            const result = executeMultiplePOSTools(
              aiData.actions as POSToolAction[],
              currentCart,
              currentProducts,
              currentPending
            );

            // Update UI immediately!
            setCart(result.cart);
            setProducts(result.products);
            setPendingAction(result.pendingAction);
            setLastResponseText(result.responseText);

            if (result.completedOrder) {
              setCompletedOrder(result.completedOrder);
              fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result.completedOrder),
              }).catch((err) => console.error("Failed to append order:", err));
            }

            if (result.needsProductSave) {
              fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(result.needsProductSave),
              }).catch((err) => console.error("Failed to save product:", err));
            }

            if (result.speak && result.responseText) {
              speak(result.responseText);
            }
          } else if (aiData.question) {
            // Gemini asked a short clarifying question
            askedQuestionRef.current = true;
            setLastResponseText(aiData.question);
            speak(aiData.question);
          } else {
            setLastResponseText("ไม่เข้าใจคำสั่ง กรุณาลองใหม่อีกครั้ง");
            speak("ไม่เข้าใจคำสั่ง");
          }
        }
      } catch (err) {
        console.error("Command processing error:", err);
        setLastResponseText("เกิดข้อผิดพลาดในการประมวลผล");
      } finally {
        setIsProcessing(false);
      }
    },
    [speak]
  );

  // Hands-free wake word mode (off by default; the switch and warnings live in Settings).
  // Two states: background (mic open, UI quiet, only a wake word counts) and a "session" that starts at the
  // wake word and lasts until the task is done (e.g. while waiting for a price answer), then goes back to background.
  const [wakeMode, setWakeMode] = useState(false);
  const [wakeActive, setWakeActive] = useState(false);
  const [lastHeard, setLastHeard] = useState("");
  const wakeWords = settings.wakeWords?.length ? settings.wakeWords : DEFAULT_WAKE_WORDS;
  const wakeModeRef = useRef(false);
  const sessionUntilRef = useRef(0);
  const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const askedQuestionRef = useRef(false);
  useEffect(() => {
    wakeModeRef.current = wakeMode;
  });

  const endSession = useCallback(() => {
    clearTimeout(sessionTimerRef.current);
    sessionUntilRef.current = 0; // stop accepting wake-less speech immediately...
    sessionTimerRef.current = setTimeout(() => setWakeActive(false), 1200); // ...but let the UI show the result briefly
  }, []);
  const startSession = useCallback((ms: number) => {
    clearTimeout(sessionTimerRef.current);
    sessionUntilRef.current = Date.now() + ms;
    setWakeActive(true);
    sessionTimerRef.current = setTimeout(() => {
      sessionUntilRef.current = 0;
      setWakeActive(false);
    }, ms);
  }, []);
  const changeWakeMode = useCallback(
    (enabled: boolean) => {
      setWakeMode(enabled);
      if (!enabled) endSession();
    },
    [endSession]
  );

  // Commands spoken while another is still being processed (e.g. an AI round trip) are queued, not dropped
  const commandQueueRef = useRef<string[]>([]);
  const drainingRef = useRef(false);
  const handleProcessCommand = useCallback(
    async (rawCommand: string) => {
      if (!rawCommand) return;
      commandQueueRef.current.push(rawCommand);
      if (drainingRef.current) return;
      drainingRef.current = true;
      try {
        while (commandQueueRef.current.length > 0) {
          await processCommand(commandQueueRef.current.shift()!);
          // Let React commit the new cart/products so the refs processCommand reads are current
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
        // Task finished: keep listening only if it is waiting on the user (price answer / AI question)
        if (wakeModeRef.current) {
          if (pendingActionRef.current || askedQuestionRef.current) startSession(15000);
          else endSession();
        }
      } finally {
        drainingRef.current = false;
      }
    },
    [processCommand, startSession, endSession]
  );

  // Web Speech Recognition
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    errorMessage,
    toggleListening,
  } = useSpeechRecognition({
    lang: settings.language || "th-TH",
    alwaysOn: wakeMode,
    onError: (err) => {
      if (err === "not-allowed" || err === "service-not-allowed") changeWakeMode(false);
    },
    onResult: (finalText) => {
      if (!wakeMode) {
        handleProcessCommand(finalText);
        return;
      }
      // Ignore our own TTS being picked up by the mic
      if (isSpeaking()) return;
      const afterWake = extractWakeCommand(finalText, wakeWords);
      const inSession = Date.now() < sessionUntilRef.current;
      if (afterWake === null && !inSession) {
        // Background: stay quiet, just remember what was heard so a misheard wake word is diagnosable
        setLastHeard(finalText);
        return;
      }
      const command = afterWake ?? finalText;
      if (!command) {
        startSession(10000);
        setLastResponseText("ครับ?");
        speak("ครับ");
        return;
      }
      startSession(20000); // covers processing; the queue drain decides whether to continue or go back to background
      handleProcessCommand(command);
    },
  });

  // In hands-free mode the mic is already open, so pressing it just starts a session (same as saying the wake word)
  const handleMicToggle = () => {
    if (wakeMode) {
      startSession(10000);
      setLastResponseText("ครับ?");
    } else {
      toggleListening();
    }
  };

  // Manual actions
  const handleUpdateQty = (name: string, qty: number) => {
    const res = executePOSTool(
      { tool: "updateQty", args: { name, qty } },
      cart,
      products,
      pendingAction
    );
    setCart(res.cart);
    setLastResponseText(res.responseText);
    if (res.responseText) speak(res.responseText);
  };

  const handleRemoveItem = (name: string) => {
    const res = executePOSTool(
      { tool: "removeItem", args: { name } },
      cart,
      products,
      pendingAction
    );
    setCart(res.cart);
    setLastResponseText(res.responseText);
    if (res.responseText) speak(res.responseText);
  };

  const handleClearOrder = () => {
    const res = executePOSTool(
      { tool: "clearOrder" },
      cart,
      products,
      pendingAction
    );
    setCart(res.cart);
    setPendingAction(null);
    setLastResponseText(res.responseText);
    speak(res.responseText);
  };

  const handleCheckout = () => {
    const res = executePOSTool(
      { tool: "checkout" },
      cart,
      products,
      pendingAction
    );
    setCart(res.cart);
    setLastResponseText(res.responseText);
    if (res.completedOrder) {
      setCompletedOrder(res.completedOrder);
      fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(res.completedOrder),
      }).catch((err) => console.error("Failed to append order:", err));
    }
    speak(res.responseText);
  };

  const handleSetProductPrice = async (name: string, price: number) => {
    const res = executeMultiplePOSTools(
      [
        { tool: "setProductPrice", args: { name, price } },
        { tool: "addItem", args: { name, qty: pendingAction?.qty || 1 } },
      ],
      cart,
      products,
      pendingAction
    );

    setCart(res.cart);
    setProducts(res.products);
    setPendingAction(null);
    setLastResponseText(res.responseText);

    if (res.needsProductSave) {
      fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(res.needsProductSave),
      }).catch((err) => console.error("Failed to save product:", err));
    }

    speak(res.responseText);
  };

  const handleSaveSettings = async (updated: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updated }));
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  };

  const handleAddProduct = async (newProd: Product) => {
    setProducts((prev) => [...prev, newProd]);
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProd),
    });
  };

  const handleUpdateProduct = async (prod: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === prod.id ? prod : p)));
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prod),
    });
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    setIsSettingsOpen(false);
  };

  const handleLoginDemo = async () => {
    const res = await fetch("/api/auth/demo", { method: "POST" });
    if (res.ok) {
      await loadSession();
    }
  };

  // Test microphone
  const handleTestMic = () => {
    toggleListening();
  };

  // Test audio voice
  const handleTestVoice = () => {
    speak("ทดสอบระบบเสียงภาษาไทย สำเร็จแล้วค่ะ");
  };

  // 1. Loading screen
  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-2 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-bold text-lg">
            POS
          </div>
          <span className="text-xs font-semibold text-gray-400">
            กำลังโหลดระบบ...
          </span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated -> Show Login Screen
  if (!session?.isLoggedIn) {
    return (
      <LoginScreen
        onLoginDemo={handleLoginDemo}
        isConfigured={isConfigured}
      />
    );
  }

  // 3. Main Voice POS Interface
  return (
    <main className="min-h-dvh w-full max-w-md md:max-w-2xl lg:max-w-5xl mx-auto bg-white flex flex-col justify-between lg:grid lg:grid-cols-[1fr_400px] lg:grid-rows-[auto_1fr] lg:justify-normal shadow-2xl overflow-hidden relative">
      {/* Header with shop name & settings */}
      <div className="lg:col-span-2">
        <Header
          shopName={settings.shopName}
          session={session}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      </div>

      {/* Main Order Items View */}
      <div className="flex-1 flex flex-col overflow-hidden relative lg:row-start-2">
        <OrderList
          items={cart.items}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
        />

        {/* Missing Product Price prompt banner */}
        <PendingPricePrompt
          pendingAction={pendingAction}
          onSetPrice={handleSetProductPrice}
          onCancel={() => setPendingAction(null)}
        />

        {/* Live speech recognition and TTS feedback bar */}
        <VoiceFeedbackBar
          transcript={wakeMode && !wakeActive ? "" : transcript}
          interimTranscript={wakeMode && !wakeActive ? "" : interimTranscript}
          responseText={lastResponseText}
          isProcessing={isProcessing}
          errorMessage={errorMessage}
        />
      </div>

      {/* Right column on desktop: summary + controls */}
      <div className="flex flex-col lg:row-start-2 lg:col-start-2 lg:border-l lg:border-gray-100 lg:justify-end">
      {/* Cart Summary */}
      <OrderSummary cart={cart} />

      {/* Manual Keyboard Command Drawer */}
      <ManualCommandInput
        isOpen={isKeyboardOpen}
        onSendCommand={handleProcessCommand}
        isProcessing={isProcessing}
      />

      {wakeMode && <WakeWordBanner wakeWords={wakeWords} lastHeard={lastHeard} onTurnOff={() => changeWakeMode(false)} />}

      {/* Bottom Controls (Clear, Large Mic Push-to-Talk, Checkout) */}
      <BottomControls
        itemCount={cart.items.length}
        total={cart.total}
        isListening={wakeMode ? wakeActive : isListening}
        isSupported={isSupported}
        onToggleListening={handleMicToggle}
        onClearOrder={handleClearOrder}
        onCheckout={handleCheckout}
        onToggleKeyboard={() => setIsKeyboardOpen((prev) => !prev)}
        isKeyboardOpen={isKeyboardOpen}
      />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        session={session}
        onLogout={handleLogout}
        onTestVoice={handleTestVoice}
        onTestMic={handleTestMic}
        products={products}
        onUpdateProduct={handleUpdateProduct}
        onAddProduct={handleAddProduct}
        wakeMode={wakeMode}
        wakeModeSupported={isSupported}
        onWakeModeChange={changeWakeMode}
      />

      {/* Checkout Success Modal */}
      <CheckoutSuccessModal
        order={completedOrder}
        onNextOrder={() => setCompletedOrder(null)}
        shopName={settings.shopName}
      />
    </main>
  );
}
