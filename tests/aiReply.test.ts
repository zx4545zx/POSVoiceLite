import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { safeModelQuestion } from "../lib/nlp/aiReply";

describe("safeModelQuestion", () => {
  test("keeps genuine clarifying questions", () => {
    for (const q of ["เค้ก กี่บาท?", "รับเมนูไหนคะ", "ต้องการกี่จานครับ", "ราคาเท่าไหร่"]) {
      assert.equal(safeModelQuestion(q), q);
    }
  });

  test("drops text that claims the bill was changed", () => {
    for (const t of ["เพิ่มเค้กแล้วค่ะ", "เพิ่มเค้ก 1 รายการเรียบร้อยแล้ว", "คิดเงินเรียบร้อย", "ลบโค้กออกแล้ว"]) {
      assert.equal(safeModelQuestion(t), undefined);
    }
  });

  test("drops a confirmation even when phrased with a trailing question", () => {
    assert.equal(safeModelQuestion("เพิ่มเค้กแล้วค่ะ รับอะไรเพิ่มไหม"), undefined);
  });

  test("drops statements and empty input", () => {
    assert.equal(safeModelQuestion("สวัสดีค่ะ"), undefined);
    assert.equal(safeModelQuestion("   "), undefined);
    assert.equal(safeModelQuestion(undefined), undefined);
  });
});
