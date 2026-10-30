"use client";

import { CartState } from "@/types/pos";

interface OrderSummaryProps {
  cart: CartState;
}

export function OrderSummary({ cart }: OrderSummaryProps) {
  return (
    <div className="bg-white border-t border-gray-150 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
      {cart.discount > 0 && (
        <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
          <span>ยอดรวม</span>
          <span>฿{cart.subtotal.toLocaleString()}</span>
        </div>
      )}

      {cart.discount > 0 && (
        <div className="flex justify-between items-center text-xs text-brand-600 font-medium mb-1">
          <span>ส่วนลด</span>
          <span>-฿{cart.discount.toLocaleString()}</span>
        </div>
      )}

      <div className="flex justify-between items-baseline pt-1">
        <div>
          <span className="text-sm font-medium text-gray-600">รวม</span>
          <span className="text-xs text-gray-400 ml-1.5">
            ({cart.items.reduce((s, i) => s + i.qty, 0)} รายการ)
          </span>
        </div>
        <div className="text-2xl font-black text-gray-950 tracking-tight">
          ฿{cart.total.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
