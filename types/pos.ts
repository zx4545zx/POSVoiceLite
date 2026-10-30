export interface Product {
  id: string;
  name: string;
  price: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  total: number;
}

export interface Order {
  orderId: string;
  datetime: string;
  items: string; // readable summary: e.g. "กะเพราหมู x2 (฿120), โค้ก x1 (฿20)"
  subtotal: number;
  discount: number;
  total: number;
}

export interface Settings {
  shopName: string;
  voiceEnabled: boolean;
  language: string;
  spreadsheetId?: string;
  spreadsheetUrl?: string;
}

export type PendingAction =
  | {
      type: "WAITING_PRODUCT_PRICE";
      productName: string;
      qty: number;
      /** Actions from the same utterance still to run once this price is answered */
      rest?: POSToolAction[];
    }
  | null;

export type POSToolName =
  | "addItem"
  | "removeItem"
  | "updateQty"
  | "getProductPrice"
  | "setProductPrice"
  | "getTotal"
  | "addDiscount"
  | "checkout"
  | "clearOrder";

export type POSToolAction =
  | { tool: "addItem"; args: { name: string; qty: number } }
  | { tool: "removeItem"; args: { name: string; qty?: number } }
  | { tool: "updateQty"; args: { name: string; qty: number } }
  | { tool: "getProductPrice"; args: { name: string } }
  | { tool: "setProductPrice"; args: { name: string; price: number } }
  | { tool: "getTotal"; args?: Record<string, never> }
  | { tool: "addDiscount"; args: { value: number } }
  | { tool: "checkout"; args?: Record<string, never> }
  | { tool: "clearOrder"; args?: Record<string, never> };

export interface CartState {
  items: OrderItem[];
  discount: number;
  subtotal: number;
  total: number;
}

export interface UserSession {
  isLoggedIn: boolean;
  isMock: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    image?: string;
  };
  spreadsheetId?: string;
  spreadsheetUrl?: string;
}
