"use client";

import { useState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Order } from "@/types/pos";

interface CheckoutSuccessModalProps {
  order: Order | null;
  onNextOrder: () => void;
  shopName: string;
}

export function CheckoutSuccessModal({
  order,
  onNextOrder,
  shopName,
}: CheckoutSuccessModalProps) {
  const [cashReceived, setCashReceived] = useState<number | null>(null);

  if (!order) return null;

  const total = order.total;
  const change = cashReceived !== null ? Math.max(0, cashReceived - total) : null;

  // Suggest bills higher than or equal to total
  const bills = [total, 100, 500, 1000].filter(
    (b, idx, arr) => b >= total && arr.indexOf(b) === idx
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {shopName || "POS Voice Lite"}
        </span>
        <h2 className="text-xl font-bold text-gray-900 mt-0.5">
          คิดเงินเรียบร้อย
        </h2>

        {/* Amount Pill */}
        <div className="my-3 py-2 bg-emerald-50 rounded-2xl border border-emerald-100">
          <span className="text-xs text-emerald-800 font-medium block">
            ยอดที่ต้องชำระ
          </span>
          <span className="text-3xl font-black text-emerald-700">
            ฿{total.toLocaleString()}
          </span>
        </div>

        {/* Items summary */}
        <div className="text-left bg-gray-50 p-3 rounded-xl border border-gray-150 text-xs text-gray-600 space-y-1 my-2">
          <div className="flex justify-between font-mono text-[11px] text-gray-400">
            <span>{order.orderId}</span>
            <span>
              {new Date(order.datetime).toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <p className="font-medium text-gray-800 pt-1 border-t border-gray-200/60 leading-relaxed">
            {order.items}
          </p>
        </div>

        {/* Change Calculator */}
        <div className="mt-2 text-left">
          <span className="text-xs font-semibold text-gray-500 block mb-1">
            คำนวณเงินทอน (รับเงินมา):
          </span>
          <div className="flex space-x-1.5 overflow-x-auto pb-1">
            {bills.map((bill) => (
              <button
                key={bill}
                onClick={() => setCashReceived(bill)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  cashReceived === bill
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                ฿{bill.toLocaleString()}
              </button>
            ))}
          </div>

          {change !== null && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-center justify-between text-xs font-bold">
              <span>เงินทอน:</span>
              <span className="text-base text-amber-700">฿{change.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Next Order Button */}
        <button
          onClick={onNextOrder}
          className="mt-5 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all"
        >
          <span>รับลูกค้าคนถัดไป</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
