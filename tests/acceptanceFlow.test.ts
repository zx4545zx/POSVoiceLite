import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { allowedAiActions } from "../lib/nlp/aiReply";
import {
  executeMultiplePOSTools,
  executePOSTool,
  initialCartState,
} from "../lib/pos/orderEngine";
import { CartState, PendingAction, Product } from "../types/pos";

describe("Target v1 Primary Acceptance Test", () => {
  // Acceptance Flow:
  // 1. User starts fresh with an empty product catalog (or product with no price)
  let products: Product[] = [];
  let cart: CartState = initialCartState;
  let pendingAction: PendingAction = null;
  let lastSpokenText = "";

  test("Step 1-4: New user starts session with empty cart", () => {
    assert.equal(cart.items.length, 0);
    assert.equal(cart.total, 0);
    assert.equal(pendingAction, null);
  });

  test("Step 5-6: User says 'กะเพราหมูสอง' -> system asks 'กะเพราหมู กี่บาท?'", () => {
    // Simulated Gemini tool call; model interpretation is not exercised by this test.
    const result = executePOSTool(
      { tool: "addItem", args: { name: "กะเพราหมู", qty: 2 } },
      cart,
      products,
      pendingAction
    );

    // Verify price is unknown -> enters WAITING_PRODUCT_PRICE
    assert.equal(result.cart.items.length, 0, "Item not added yet because price is unknown");
    assert.ok(result.pendingAction);
    assert.equal(result.pendingAction?.type, "WAITING_PRODUCT_PRICE");
    assert.equal(result.pendingAction?.productName, "กะเพราหมู");
    assert.equal(result.pendingAction?.qty, 2);
    assert.equal(result.responseText, "กะเพราหมู กี่บาท?");

    // Update state for next step
    cart = result.cart;
    products = result.products;
    pendingAction = result.pendingAction;
    lastSpokenText = result.responseText;
  });

  test("Step 7-8: User says '60 บาท' -> price set to 60, added x2 = 120 บาท", () => {
    assert.ok(pendingAction);
    assert.equal(lastSpokenText, "กะเพราหมู กี่บาท?");

    const actions = allowedAiActions([
      { tool: "setProductPrice", args: { name: "กะเพราหมู", price: 60 } },
      { tool: "addItem", args: { name: "กะเพราหมู", qty: 2 } },
    ], "60 บาท", pendingAction);
    const result = executeMultiplePOSTools(
      actions,
      cart,
      products,
      pendingAction
    );

    // Verify updated cart
    assert.equal(result.cart.items.length, 1);
    assert.equal(result.cart.items[0].name, "กะเพราหมู");
    assert.equal(result.cart.items[0].price, 60);
    assert.equal(result.cart.items[0].qty, 2);
    assert.equal(result.cart.items[0].total, 120);
    assert.equal(result.cart.total, 120);

    // Verify pending action cleared
    assert.equal(result.pendingAction, null);

    // Verify product saved in catalog for future orders
    const savedProd = result.products.find((p) => p.name === "กะเพราหมู");
    assert.ok(savedProd);
    assert.equal(savedProd.price, 60);
    assert.ok(result.needsProductSave);

    // Verify response voice
    assert.equal(result.responseText, "เพิ่มกะเพราหมู 2 แล้ว");

    cart = result.cart;
    products = result.products;
    pendingAction = result.pendingAction;
    lastSpokenText = result.responseText;
  });

  test("Step 9-10: User says 'คิดเงิน' -> checkout order total 120 and ready for Google Sheets", () => {
    const result = executePOSTool(
      { tool: "checkout" },
      cart,
      products,
      pendingAction
    );

    // Verify completed order record
    assert.ok(result.completedOrder);
    assert.equal(result.completedOrder?.total, 120);
    assert.equal(result.completedOrder?.subtotal, 120);
    assert.equal(result.completedOrder?.discount, 0);
    assert.ok(result.completedOrder?.items.includes("กะเพราหมู x2"));
    assert.ok(result.completedOrder?.orderId.startsWith("ORD-"));

    // Verify cart is reset
    assert.equal(result.cart.items.length, 0);
    assert.equal(result.cart.total, 0);

    // Verify voice confirmation
    assert.ok(result.responseText.includes("คิดเงินเรียบร้อย รวม 120 บาท"));

    cart = result.cart;
    products = result.products;
    pendingAction = result.pendingAction;
  });

  test("Subsequent order: 'กะเพราหมูหนึ่ง' immediately adds item because price is now known", () => {
    const result = executePOSTool(
      { tool: "addItem", args: { name: "กะเพราหมู", qty: 1 } },
      cart,
      products,
      null
    );

    // Price is already 60 -> does NOT ask price again!
    assert.equal(result.pendingAction, null);
    assert.equal(result.cart.items.length, 1);
    assert.equal(result.cart.items[0].qty, 1);
    assert.equal(result.cart.items[0].total, 60);
    assert.equal(result.cart.total, 60);
    assert.equal(result.responseText, "เพิ่มกะเพราหมู 1 แล้ว");
  });
});
