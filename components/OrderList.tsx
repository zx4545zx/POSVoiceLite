"use client";

import { OrderItem } from "@/types/pos";
import { Plus, Minus, Trash2, ShoppingBag } from "lucide-react";

interface OrderListProps {
  items: OrderItem[];
  onUpdateQty: (name: string, qty: number) => void;
  onRemoveItem: (name: string) => void;
}

export function OrderList({ items, onUpdateQty, onRemoveItem }: OrderListProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 select-none">
        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-3 text-gray-300">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <p className="font-medium text-gray-600 text-base">ยังไม่มีรายการในบิล</p>
        <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
          แตะปุ่มไมโครโฟนด้านล่างแล้วพูด เช่น
          <br />
          <span className="text-emerald-600 font-semibold">&ldquo;กะเพราหมูสอง&rdquo;</span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-gray-100">
      {items.map((item) => (
        <div
          key={item.id + item.name}
          className="py-3.5 flex items-center justify-between group transition-colors"
        >
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-gray-900 text-base leading-snug break-words min-w-0">
                {item.name}
              </span>
              <span className="text-sm font-bold text-gray-900 shrink-0">
                ฿{item.total.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500 mt-0.5">
              <span>฿{item.price.toLocaleString()} / รายการ</span>
            </div>
          </div>

          {/* Quick touch adjuster */}
          <div className="flex items-center space-x-1.5 bg-gray-100/80 rounded-lg p-1">
            <button
              onClick={() => onUpdateQty(item.name, item.qty - 1)}
              className="w-7 h-7 rounded-md bg-white shadow-xs flex items-center justify-center text-gray-600 active:scale-95 transition-transform"
              aria-label="ลดจำนวน"
            >
              {item.qty === 1 ? (
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
            </button>
            <span className="w-6 text-center font-bold text-sm text-gray-800">
              {item.qty}
            </span>
            <button
              onClick={() => onUpdateQty(item.name, item.qty + 1)}
              className="w-7 h-7 rounded-md bg-white shadow-xs flex items-center justify-center text-gray-600 active:scale-95 transition-transform"
              aria-label="เพิ่มจำนวน"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
