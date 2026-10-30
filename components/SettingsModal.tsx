"use client";

import { useState } from "react";
import {
  X,
  Volume2,
  Mic,
  ExternalLink,
  LogOut,
  Save,
  CheckCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { Product, Settings, UserSession } from "@/types/pos";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSaveSettings: (settings: Partial<Settings>) => Promise<void>;
  session: UserSession | null;
  onLogout: () => void;
  onTestVoice: () => void;
  onTestMic: () => void;
  products: Product[];
  onUpdateProduct: (product: Product) => Promise<void>;
  onAddProduct: (product: Product) => Promise<void>;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  session,
  onLogout,
  onTestVoice,
  onTestMic,
  products,
  onUpdateProduct,
  onAddProduct,
}: SettingsModalProps) {
  const [shopName, setShopName] = useState(settings.shopName || "ร้านของฉัน");
  const [voiceEnabled, setVoiceEnabled] = useState(settings.voiceEnabled);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New product inline form
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [activeTab, setActiveTab] = useState<"settings" | "products">("settings");

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings({ shopName, voiceEnabled });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newProdPrice);
    if (!newProdName.trim() || isNaN(price) || price < 0) return;

    const newProd: Product = {
      id: `P${String(products.length + 1).padStart(3, "0")}`,
      name: newProdName.trim(),
      price,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onAddProduct(newProd);
    setNewProdName("");
    setNewProdPrice("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-150 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-gray-900">ตั้งค่าระบบ</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            aria-label="ปิด"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-150 px-5 bg-gray-50/50">
          <button
            onClick={() => setActiveTab("settings")}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors ${
              activeTab === "settings"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            ตั้งค่าทั่วไป
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`py-2.5 px-4 font-semibold text-xs border-b-2 transition-colors ${
              activeTab === "products"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            รายการสินค้า ({products.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {activeTab === "settings" ? (
            <>
              {/* Form Settings */}
              <form onSubmit={handleSave} className="space-y-4">
                {/* Shop Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    ชื่อร้าน
                  </label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="เช่น ร้านข้าวกะเพราคุณป้า"
                    className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                {/* Voice Enabled Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-150">
                  <div className="flex items-center space-x-2.5">
                    <Volume2 className="w-5 h-5 text-gray-600" />
                    <div>
                      <span className="text-sm font-semibold text-gray-900 block">
                        เสียงตอบกลับ
                      </span>
                      <span className="text-xs text-gray-500">
                        พูดทวนคำสั่งเมื่อทำงานสำเร็จ
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={voiceEnabled}
                      onChange={(e) => setVoiceEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Save button */}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center space-x-2 shadow-sm"
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-200" />
                      <span>บันทึกสำเร็จ</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}</span>
                    </>
                  )}
                </button>
              </form>

              {/* Hardware / Audio Tests */}
              <div className="pt-2 border-t border-gray-150">
                <span className="text-xs font-semibold text-gray-500 block mb-2">
                  ทดสอบอุปกรณ์
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onTestMic}
                    className="p-3 bg-gray-100 hover:bg-gray-150 active:scale-95 rounded-xl text-left transition-all"
                  >
                    <Mic className="w-4 h-4 text-emerald-600 mb-1" />
                    <span className="text-xs font-semibold text-gray-900 block">
                      🎤 ทดสอบไมค์
                    </span>
                    <span className="text-[10px] text-gray-500">
                      ตรวจการรับเสียง
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onTestVoice}
                    className="p-3 bg-gray-100 hover:bg-gray-150 active:scale-95 rounded-xl text-left transition-all"
                  >
                    <Volume2 className="w-4 h-4 text-indigo-600 mb-1" />
                    <span className="text-xs font-semibold text-gray-900 block">
                      🔊 ทดสอบเสียง
                    </span>
                    <span className="text-[10px] text-gray-500">
                      ตรวจการพูดออกเสียง
                    </span>
                  </button>
                </div>
              </div>

              {/* Google Sheets Account Connection */}
              <div className="pt-2 border-t border-gray-150 space-y-3">
                <span className="text-xs font-semibold text-gray-500 block">
                  บัญชี Google Sheets
                </span>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-150 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">
                        {session?.user?.name || "ไม่ทราบชื่อผู้ใช้"}
                      </span>
                      <span className="text-[11px] text-gray-500 block">
                        {session?.user?.email || "ยังไม่ได้เชื่อมต่อ"}
                      </span>
                    </div>
                    {session?.isMock && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                        Demo
                      </span>
                    )}
                  </div>

                  {session?.spreadsheetUrl && !session.isMock && (
                    <a
                      href={session.spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center text-xs font-semibold text-emerald-600 hover:underline pt-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" /> เปิดดูตาราง Google
                      Sheets
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center space-x-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            </>
          ) : (
            /* Products Management Tab */
            <div className="space-y-4">
              {/* Add product form */}
              <form
                onSubmit={handleCreateProduct}
                className="p-3 bg-gray-50 rounded-xl border border-gray-150 space-y-2"
              >
                <span className="text-xs font-bold text-gray-800 block">
                  + เพิ่มเมนูใหม่
                </span>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="ชื่อเมนู เช่น ผัดไทย"
                    className="w-full sm:flex-1 sm:w-auto min-w-0 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none"
                  />
                  <input
                    type="number"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(e.target.value)}
                    placeholder="ราคา (บาท)"
                    className="flex-1 sm:flex-none sm:w-28 min-w-0 px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newProdName.trim() || !newProdPrice}
                    className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-lg active:scale-95 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Product list */}
              <div className="divide-y divide-gray-100">
                {products.map((prod) => (
                  <div
                    key={prod.id}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-gray-900 block truncate">
                        {prod.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        รหัส: {prod.id}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        ฿{prod.price}
                      </span>
                      <button
                        onClick={() =>
                          onUpdateProduct({ ...prod, active: !prod.active })
                        }
                        className="p-1 text-gray-400 hover:text-red-500"
                        title={prod.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
