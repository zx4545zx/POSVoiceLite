import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { isModelQuestion, safeModelReply } from "../lib/nlp/aiReply";

describe("safeModelReply", () => {
  test("keeps general replies and clarifying questions", () => {
    for (const text of ["สวัสดีค่ะ", "วันนี้อากาศดีนะคะ", "เค้ก กี่บาท?", "รับเมนูไหนคะ"]) {
      assert.equal(safeModelReply(text), text);
    }
  });

  test("drops text that claims the bill was changed, even with a question", () => {
    for (const text of ["เพิ่มเค้กแล้วค่ะ", "คิดเงินเรียบร้อย", "ลบโค้กออกแล้ว", "เพิ่มเค้กแล้วค่ะ รับอะไรเพิ่มไหม"]) {
      assert.equal(safeModelReply(text), undefined);
    }
  });

  test("uses ค่ะ instead of ครับ", () => {
    assert.equal(safeModelReply("สวัสดีครับ"), "สวัสดีค่ะ");
  });

  test("drops empty input", () => {
    assert.equal(safeModelReply("   "), undefined);
    assert.equal(safeModelReply(undefined), undefined);
  });
});

test("identifies questions for hands-free follow-up", () => {
  assert.equal(isModelQuestion("รับเมนูไหนคะ"), true);
  assert.equal(isModelQuestion("สวัสดีค่ะ"), false);
});

import { allowedAiActions, priceWasSpoken } from "../lib/nlp/aiReply";
import { POSToolAction } from "../types/pos";

describe("allowedAiActions: the model may not invent prices", () => {
  const set = (name: string, price: number): POSToolAction => ({ tool: "setProductPrice", args: { name, price } });
  const add = (name: string, qty: number): POSToolAction => ({ tool: "addItem", args: { name, qty } });

  test("the reported case: ฿1 copied from a quantity is dropped, the addItems stay", () => {
    const actions = [add("กระเพรา", 2), add("ต้มยำกุ้ง", 1), add("ผัดไทย", 2), set("กระเพรา", 1), set("ผัดไทย", 1)];
    const kept = allowedAiActions(actions, "กระเพรา 2 ต้มยำกุ้ง 1 ผัดไทย 2", undefined);
    assert.deepEqual(kept, [add("กระเพรา", 2), add("ต้มยำกุ้ง", 1), add("ผัดไทย", 2)]);
  });

  test("answering the price question keeps the price", () => {
    const pending = { type: "WAITING_PRODUCT_PRICE" as const, productName: "ผัดไทย", qty: 2 };
    assert.equal(allowedAiActions([set("ผัดไทย", 60)], "หกสิบบาท", pending).length, 1);
    assert.equal(allowedAiActions([set("ผัดไทย", 60)], "60", pending).length, 1);
  });

  test("requires a price cue when a price answer repeats the ordered quantity", () => {
    const pending = { type: "WAITING_PRODUCT_PRICE" as const, productName: "ผัดไทย", qty: 2 };
    assert.equal(allowedAiActions([set("ผัดไทย", 2)], "2", pending).length, 0);
    assert.equal(allowedAiActions([set("ผัดไทย", 2)], "2 บาท", pending).length, 1);
  });

  test("a price for a different product than the one being asked is dropped", () => {
    const pending = { type: "WAITING_PRODUCT_PRICE" as const, productName: "ผัดไทย", qty: 2 };
    assert.equal(allowedAiActions([set("โค้ก", 60)], "60", pending).length, 0);
  });

  test("an explicit price statement works without a pending question", () => {
    assert.equal(allowedAiActions([set("โค้ก", 25)], "ตั้งราคาโค้ก 25 บาท", undefined).length, 1);
    assert.equal(allowedAiActions([set("โค้ก", 25)], "โค้ก 25", undefined).length, 0); // no price cue
  });

  test("a price that was not spoken at all is dropped even with a cue", () => {
    assert.equal(allowedAiActions([set("โค้ก", 99)], "ราคาโค้ก 25 บาท", undefined).length, 0);
  });

  test("priceWasSpoken reads digits, Thai numerals and Thai words", () => {
    assert.equal(priceWasSpoken("๖๐ บาท", 60), true);
    assert.equal(priceWasSpoken("หกสิบ", 60), true);
    assert.equal(priceWasSpoken("โค้ก 2", 1), false);
  });
});
