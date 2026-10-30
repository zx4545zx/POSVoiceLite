import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  executePOSTool,
  executeMultiplePOSTools,
  initialCartState,
} from "../lib/pos/orderEngine";
import { Product } from "../types/pos";

describe("POS Order Engine", () => {
  const initialProducts: Product[] = [
    {
      id: "P001",
      name: "กะเพราหมู",
      price: 60,
      active: true,
      createdAt: "2026-10-30",
      updatedAt: "2026-10-30",
    },
    {
      id: "P002",
      name: "โค้ก",
      price: 20,
      active: true,
      createdAt: "2026-10-30",
      updatedAt: "2026-10-30",
    },
  ];

  test("adds known item with quantity to empty cart", () => {
    const res = executePOSTool(
      { tool: "addItem", args: { name: "กะเพราหมู", qty: 2 } },
      initialCartState,
      initialProducts,
      null
    );

    assert.equal(res.cart.items.length, 1);
    assert.equal(res.cart.items[0].name, "กะเพราหมู");
    assert.equal(res.cart.items[0].qty, 2);
    assert.equal(res.cart.items[0].total, 120);
    assert.equal(res.cart.subtotal, 120);
    assert.equal(res.cart.total, 120);
    assert.equal(res.responseText, "เพิ่มกะเพราหมู 2 แล้ว");
  });

  test("triggers WAITING_PRODUCT_PRICE when product has unknown price", () => {
    const res = executePOSTool(
      { tool: "addItem", args: { name: "ข้าวผัดปู", qty: 1 } },
      initialCartState,
      initialProducts,
      null
    );

    assert.equal(res.cart.items.length, 0); // Not added yet
    assert.ok(res.pendingAction);
    assert.equal(res.pendingAction?.type, "WAITING_PRODUCT_PRICE");
    assert.equal(res.pendingAction?.productName, "ข้าวผัดปู");
    assert.equal(res.pendingAction?.qty, 1);
    assert.equal(res.responseText, "ข้าวผัดปู กี่บาท?");
  });

  test("sets product price and adds item during missing price conversation", () => {
    const pending = {
      type: "WAITING_PRODUCT_PRICE" as const,
      productName: "ข้าวผัดปู",
      qty: 1,
    };

    const res = executeMultiplePOSTools(
      [
        { tool: "setProductPrice", args: { name: "ข้าวผัดปู", price: 80 } },
        { tool: "addItem", args: { name: "ข้าวผัดปู", qty: 1 } },
      ],
      initialCartState,
      initialProducts,
      pending
    );

    assert.equal(res.cart.items.length, 1);
    assert.equal(res.cart.items[0].name, "ข้าวผัดปู");
    assert.equal(res.cart.items[0].price, 80);
    assert.equal(res.cart.items[0].qty, 1);
    assert.equal(res.cart.total, 80);
    assert.equal(res.pendingAction, null); // Pending cleared
    assert.ok(res.products.find((p) => p.name === "ข้าวผัดปู" && p.price === 80));
    assert.equal(res.responseText, "เพิ่มข้าวผัดปู 1 แล้ว");
  });

  test("calculates discounts accurately", () => {
    // Start with กะเพราหมู x2 (120) and โค้ก x1 (20) = 140
    let state = executePOSTool(
      { tool: "addItem", args: { name: "กะเพราหมู", qty: 2 } },
      initialCartState,
      initialProducts,
      null
    );
    state = executePOSTool(
      { tool: "addItem", args: { name: "โค้ก", qty: 1 } },
      state.cart,
      state.products,
      null
    );

    assert.equal(state.cart.subtotal, 140);
    assert.equal(state.cart.total, 140);

    // Apply discount 10 baht
    state = executePOSTool(
      { tool: "addDiscount", args: { value: 10 } },
      state.cart,
      state.products,
      null
    );

    assert.equal(state.cart.discount, 10);
    assert.equal(state.cart.total, 130);
    assert.equal(state.responseText, "ลด 10 บาทแล้ว");
  });

  test("checkout creates order record and resets cart", () => {
    let state = executePOSTool(
      { tool: "addItem", args: { name: "กะเพราหมู", qty: 2 } },
      initialCartState,
      initialProducts,
      null
    );
    state = executePOSTool(
      { tool: "checkout" },
      state.cart,
      state.products,
      null
    );

    assert.ok(state.completedOrder);
    assert.equal(state.completedOrder?.total, 120);
    assert.equal(state.cart.items.length, 0); // Cart is cleared
    assert.equal(state.cart.total, 0);
    assert.ok(state.responseText.includes("คิดเงินเรียบร้อย รวม 120 บาท"));
  });

  test("clears order properly", () => {
    let state = executePOSTool(
      { tool: "addItem", args: { name: "โค้ก", qty: 2 } },
      initialCartState,
      initialProducts,
      null
    );
    assert.equal(state.cart.items.length, 1);

    state = executePOSTool(
      { tool: "clearOrder" },
      state.cart,
      state.products,
      null
    );
    assert.equal(state.cart.items.length, 0);
    assert.equal(state.responseText, "ล้างบิลแล้ว");
  });
});
