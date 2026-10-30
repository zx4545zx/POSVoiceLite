import {
  CartState,
  Order,
  OrderItem,
  PendingAction,
  POSToolAction,
  Product,
} from "@/types/pos";

export interface ToolExecutionResult {
  cart: CartState;
  products: Product[];
  pendingAction: PendingAction;
  completedOrder?: Order;
  responseText: string;
  speak: boolean;
  needsProductSave?: Product;
}

export const initialCartState: CartState = {
  items: [],
  discount: 0,
  subtotal: 0,
  total: 0,
};

/**
 * Recalculates subtotal and total for a cart
 */
export function recalculateCart(items: OrderItem[], discount: number): CartState {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const total = Math.max(0, subtotal - discount);
  return {
    items,
    discount,
    subtotal,
    total,
  };
}

/**
 * Finds a product in the catalog by name (case-insensitive & trimmed)
 */
export function findProductByName(products: Product[], name: string): Product | undefined {
  const target = name.trim().toLowerCase();
  return products.find(
    (p) => p.name.trim().toLowerCase() === target && p.active !== false
  );
}

/**
 * Formats order items into a clean human-readable summary string for the Orders Sheet
 */
export function formatOrderItemsSummary(items: OrderItem[]): string {
  return items.map((i) => `${i.name} x${i.qty} (฿${i.total})`).join(", ");
}

/**
 * Generates a short, clean Order ID
 */
export function generateOrderId(): string {
  const dateStr = new Date().toISOString().replace(/\D/g, "").slice(2, 8); // e.g. 261030
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomSuffix}`;
}

/**
 * Executes a single POS tool against the current state
 */
export function executePOSTool(
  action: POSToolAction,
  currentCart: CartState,
  currentProducts: Product[],
  currentPendingAction: PendingAction
): ToolExecutionResult {
  const products = [...currentProducts];
  let items = [...currentCart.items];
  let discount = currentCart.discount;
  let pendingAction = currentPendingAction;
  let responseText = "";
  let completedOrder: Order | undefined = undefined;
  let needsProductSave: Product | undefined = undefined;

  switch (action.tool) {
    case "addItem": {
      const { name, qty } = action.args;
      const cleanName = name.trim();
      const quantity = Math.max(1, Math.round(qty || 1));

      // Look up in products
      const existingProduct = findProductByName(products, cleanName);

      if (!existingProduct || !existingProduct.price || existingProduct.price <= 0) {
        // Unknown price flow!
        pendingAction = {
          type: "WAITING_PRODUCT_PRICE",
          productName: cleanName,
          qty: quantity,
        };
        responseText = `${cleanName} กี่บาท?`;
        return {
          cart: currentCart,
          products,
          pendingAction,
          responseText,
          speak: true,
        };
      }

      // Product is known and priced
      const price = existingProduct.price;
      const existingCartIndex = items.findIndex(
        (i) => i.name.trim().toLowerCase() === cleanName.toLowerCase()
      );

      if (existingCartIndex >= 0) {
        const item = items[existingCartIndex];
        const newQty = item.qty + quantity;
        items[existingCartIndex] = {
          ...item,
          qty: newQty,
          total: newQty * item.price,
        };
      } else {
        items.push({
          id: existingProduct.id || `P-${Date.now()}`,
          name: existingProduct.name,
          price,
          qty: quantity,
          total: price * quantity,
        });
      }

      // If we just resolved a pending action for this item, clear it
      if (
        pendingAction &&
        pendingAction.productName.toLowerCase() === cleanName.toLowerCase()
      ) {
        pendingAction = null;
      }

      responseText = `เพิ่ม${existingProduct.name} ${quantity} แล้ว`;
      break;
    }

    case "setProductPrice": {
      const { name, price } = action.args;
      const cleanName = name.trim();
      const numPrice = Math.max(0, Math.round(price));
      const now = new Date().toISOString();

      let targetProduct = findProductByName(products, cleanName);
      if (targetProduct) {
        targetProduct = {
          ...targetProduct,
          price: numPrice,
          updatedAt: now,
        };
        const idx = products.findIndex((p) => p.id === targetProduct?.id);
        if (idx >= 0) products[idx] = targetProduct;
      } else {
        const newId = `P${String(products.length + 1).padStart(3, "0")}`;
        targetProduct = {
          id: newId,
          name: cleanName,
          price: numPrice,
          active: true,
          createdAt: now,
          updatedAt: now,
        };
        products.push(targetProduct);
      }

      needsProductSave = targetProduct;
      responseText = `ราคา ${cleanName} ${numPrice} บาท`;
      break;
    }

    case "removeItem": {
      const { name, qty } = action.args;
      const cleanName = name.trim().toLowerCase();
      const existingCartIndex = items.findIndex(
        (i) => i.name.trim().toLowerCase() === cleanName
      );

      if (existingCartIndex < 0) {
        responseText = `ไม่พบ ${name} ในบิล`;
      } else {
        const item = items[existingCartIndex];
        if (qty && qty < item.qty) {
          const newQty = item.qty - qty;
          items[existingCartIndex] = {
            ...item,
            qty: newQty,
            total: newQty * item.price,
          };
          responseText = `ลด ${item.name} เหลือ ${newQty} แล้ว`;
        } else {
          items.splice(existingCartIndex, 1);
          responseText = `ลบ ${item.name} แล้ว`;
        }
      }
      break;
    }

    case "updateQty": {
      const { name, qty } = action.args;
      const cleanName = name.trim().toLowerCase();
      const existingCartIndex = items.findIndex(
        (i) => i.name.trim().toLowerCase() === cleanName
      );

      if (existingCartIndex < 0) {
        responseText = `ไม่พบ ${name} ในบิล`;
      } else {
        const item = items[existingCartIndex];
        if (qty <= 0) {
          items.splice(existingCartIndex, 1);
          responseText = `ลบ ${item.name} แล้ว`;
        } else {
          items[existingCartIndex] = {
            ...item,
            qty,
            total: qty * item.price,
          };
          responseText = `${item.name} ${qty} รายการแล้ว`;
        }
      }
      break;
    }

    case "getProductPrice": {
      const { name } = action.args;
      const prod = findProductByName(products, name);
      if (prod && prod.price > 0) {
        responseText = `${prod.name} ราคา ${prod.price} บาท`;
      } else {
        responseText = `ยังไม่มีราคา ${name}`;
      }
      break;
    }

    case "addDiscount": {
      discount = Math.max(0, Math.round(action.args.value));
      responseText = `ลด ${discount} บาทแล้ว`;
      break;
    }

    case "getTotal": {
      const tempCart = recalculateCart(items, discount);
      responseText = `ทั้งหมด ${tempCart.total} บาท`;
      break;
    }

    case "clearOrder": {
      items = [];
      discount = 0;
      pendingAction = null;
      responseText = "ล้างบิลแล้ว";
      break;
    }

    case "checkout": {
      const tempCart = recalculateCart(items, discount);
      if (tempCart.items.length === 0) {
        responseText = "ยังไม่มีรายการในบิล";
        return {
          cart: currentCart,
          products,
          pendingAction,
          responseText,
          speak: true,
        };
      }

      completedOrder = {
        orderId: generateOrderId(),
        datetime: new Date().toISOString(),
        items: formatOrderItemsSummary(tempCart.items),
        subtotal: tempCart.subtotal,
        discount: tempCart.discount,
        total: tempCart.total,
      };

      // Reset cart on successful checkout
      items = [];
      discount = 0;
      pendingAction = null;
      responseText = `คิดเงินเรียบร้อย รวม ${completedOrder.total} บาท`;
      break;
    }
  }

  const newCart = recalculateCart(items, discount);

  return {
    cart: newCart,
    products,
    pendingAction,
    completedOrder,
    responseText,
    speak: true,
    needsProductSave,
  };
}

/**
 * Sequentially executes multiple POS tool actions
 */
export function executeMultiplePOSTools(
  actions: POSToolAction[],
  initialCart: CartState,
  initialProducts: Product[],
  initialPendingAction: PendingAction
): ToolExecutionResult {
  let cart = initialCart;
  let products = initialProducts;
  let pendingAction = initialPendingAction;
  let completedOrder: Order | undefined = undefined;
  const responseTexts: string[] = [];
  let lastProductSave: Product | undefined = undefined;

  const queue = [...actions];
  let carriedRest = initialPendingAction?.rest ?? [];

  while (queue.length > 0) {
    const action = queue.shift()!;
    const res = executePOSTool(action, cart, products, pendingAction);
    cart = res.cart;
    products = res.products;
    const prevPending = pendingAction;
    pendingAction = res.pendingAction;
    if (prevPending && !pendingAction) {
      // Pending price resolved: continue with what the same utterance left behind
      queue.unshift(...carriedRest);
      carriedRest = [];
    } else if (pendingAction && pendingAction !== prevPending) {
      // New "price?" question: park the remaining actions until it is answered
      pendingAction = { ...pendingAction, rest: [...queue] };
      if (res.responseText) responseTexts.push(res.responseText);
      break;
    }
    if (res.completedOrder) {
      completedOrder = res.completedOrder;
    }
    if (res.needsProductSave) {
      lastProductSave = res.needsProductSave;
    }
    if (res.responseText) {
      responseTexts.push(res.responseText);
    }
  }

  // Combine response texts nicely (last one is usually primary for speech)
  const finalResponseText =
    responseTexts.length > 1
      ? responseTexts[responseTexts.length - 1] // e.g. "เพิ่มกะเพราหมู 2 แล้ว"
      : responseTexts[0] || "เรียบร้อย";

  return {
    cart,
    products,
    pendingAction,
    completedOrder,
    responseText: finalResponseText,
    speak: true,
    needsProductSave: lastProductSave,
  };
}
