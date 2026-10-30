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

  test("drops empty input", () => {
    assert.equal(safeModelReply("   "), undefined);
    assert.equal(safeModelReply(undefined), undefined);
  });
});

test("identifies questions for hands-free follow-up", () => {
  assert.equal(isModelQuestion("รับเมนูไหนคะ"), true);
  assert.equal(isModelQuestion("สวัสดีค่ะ"), false);
});
