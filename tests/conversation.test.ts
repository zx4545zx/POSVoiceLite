import test from "node:test";
import assert from "node:assert/strict";
import { appendExchange, validHistory } from "../lib/nlp/conversation";
import { parseFastPath } from "../lib/nlp/fastPath";
import { executeMultiplePOSTools, initialCartState } from "../lib/pos/orderEngine";

test("keeps bounded pairs and validates untrusted history", () => {
  let history = appendExchange([], "สวัสดี", "สวัสดีค่ะ");
  for (let i = 0; i < 10; i++) history = appendExchange(history, `คำถาม ${i}`, `คำตอบ ${i}`);
  assert.equal(history.length, 20);
  assert.equal(history[0].text, "คำถาม 0");
  assert.deepEqual(validHistory(history), history);
  assert.equal(validHistory([{ role: "model", text: "x" }]), null);
  assert.equal(validHistory([{ role: "user", text: "x" }, { role: "model", text: "x".repeat(501) }]), null);
  assert.equal(validHistory([...history, ...history]), null);
});

test("leaves references to earlier turns for AI", () => {
  assert.equal(parseFastPath("เอาเหมือนเดิมสอง", null, []), null);
  assert.equal(parseFastPath("เพิ่มเมนูนั้น 2", null, []), null);
});

test("reports a clear only when the clear action actually runs", () => {
  const clear = { tool: "clearOrder" as const };
  assert.equal(executeMultiplePOSTools([clear], initialCartState, [], null).clearedOrder, true);
  assert.equal(executeMultiplePOSTools([{ tool: "addItem", args: { name: "ข้าว", qty: 1 } }, clear], initialCartState, [], null).clearedOrder, false);
});
