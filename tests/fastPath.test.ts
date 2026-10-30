import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseThaiNumber,
  cleanVoiceCommand,
  parseFastPath,
} from "../lib/nlp/fastPath";
import { Product } from "../types/pos";

describe("Thai Number Parser", () => {
  test("parses single Thai digits", () => {
    assert.equal(parseThaiNumber("หนึ่ง"), 1);
    assert.equal(parseThaiNumber("สอง"), 2);
    assert.equal(parseThaiNumber("สาม"), 3);
    assert.equal(parseThaiNumber("สิบ"), 10);
    assert.equal(parseThaiNumber("ยี่สิบ"), 20);
  });

  test("parses composite Thai numbers", () => {
    assert.equal(parseThaiNumber("หกสิบ"), 60);
    assert.equal(parseThaiNumber("หกสิบห้า"), 65);
    assert.equal(parseThaiNumber("หนึ่งร้อย"), 100);
    assert.equal(parseThaiNumber("ร้อยยี่สิบ"), 120);
  });

  test("parses arabic digits in Thai contexts", () => {
    assert.equal(parseThaiNumber("60"), 60);
    assert.equal(parseThaiNumber("60 บาท"), 60);
    assert.equal(parseThaiNumber("2"), 2);
  });
});

describe("Wake Word and Filler Cleaner", () => {
  test("strips wake words like เฮ้ Gojo", () => {
    assert.equal(cleanVoiceCommand("เฮ้ Gojo กะเพราหมูสอง"), "กะเพราหมูสอง");
    assert.equal(cleanVoiceCommand("Hey Gojo โค้กหนึ่ง"), "โค้กหนึ่ง");
    assert.equal(cleanVoiceCommand("โกโจ คิดเงิน"), "คิดเงิน");
    assert.equal(cleanVoiceCommand("สวัสดีครับ กะเพราหมูสอง"), "กะเพราหมูสอง");
  });

  test("strips polite trailing particles", () => {
    assert.equal(cleanVoiceCommand("คิดเงินครับ"), "คิดเงิน");
    assert.equal(cleanVoiceCommand("ล้างบิลนะคะ"), "ล้างบิล");
    assert.equal(cleanVoiceCommand("เช็คบิลด้วยครับ"), "เช็คบิล");
  });
});

describe("Fast Path Intent Parser", () => {
  const sampleProducts: Product[] = [
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

  test("matches instant checkout commands", () => {
    const res = parseFastPath("คิดเงิน", null, sampleProducts);
    assert.ok(res);
    assert.equal(res.actions[0].tool, "checkout");

    const res2 = parseFastPath("ปิดบิลครับ", null, sampleProducts);
    assert.ok(res2);
    assert.equal(res2.actions[0].tool, "checkout");
  });

  test("matches instant clear order commands", () => {
    const res = parseFastPath("ล้างบิล", null, sampleProducts);
    assert.ok(res);
    assert.equal(res.actions[0].tool, "clearOrder");

    const res2 = parseFastPath("ยกเลิกบิล", null, sampleProducts);
    assert.ok(res2);
    assert.equal(res2.actions[0].tool, "clearOrder");
  });

  test("matches instant total inquiries", () => {
    const res = parseFastPath("ยอดเท่าไหร่", null, sampleProducts);
    assert.ok(res);
    assert.equal(res.actions[0].tool, "getTotal");

    const res2 = parseFastPath("รวมเท่าไหร่", null, sampleProducts);
    assert.ok(res2);
    assert.equal(res2.actions[0].tool, "getTotal");
  });

  test("matches discount commands", () => {
    const res = parseFastPath("ลด 10 บาท", null, sampleProducts);
    assert.ok(res);
    assert.equal(res.actions[0].tool, "addDiscount");
    if (res.actions[0].tool === "addDiscount") {
      assert.equal(res.actions[0].args.value, 10);
    }
  });

  test("matches known products with quantities", () => {
    const res = parseFastPath("กะเพราหมูสอง", null, sampleProducts);
    assert.ok(res);
    assert.equal(res.actions[0].tool, "addItem");
    if (res.actions[0].tool === "addItem") {
      assert.equal(res.actions[0].args.name, "กะเพราหมู");
      assert.equal(res.actions[0].args.qty, 2);
    }

    const res2 = parseFastPath("โค้ก 1", null, sampleProducts);
    assert.ok(res2);
    assert.equal(res2.actions[0].tool, "addItem");
    if (res2.actions[0].tool === "addItem") {
      assert.equal(res2.actions[0].args.name, "โค้ก");
      assert.equal(res2.actions[0].args.qty, 1);
    }
  });

  test("matches remove and update quantity commands", () => {
    const res = parseFastPath("ลบกะเพราหมูหนึ่ง", null, sampleProducts);
    assert.ok(res);
    assert.equal(res.actions[0].tool, "removeItem");
    if (res.actions[0].tool === "removeItem") {
      assert.equal(res.actions[0].args.name, "กะเพราหมู");
      assert.equal(res.actions[0].args.qty, 1);
    }

    const res2 = parseFastPath("กะเพราหมูเหลือหนึ่ง", null, sampleProducts);
    assert.ok(res2);
    assert.equal(res2.actions[0].tool, "updateQty");
    if (res2.actions[0].tool === "updateQty") {
      assert.equal(res2.actions[0].args.name, "กะเพราหมู");
      assert.equal(res2.actions[0].args.qty, 1);
    }

    const res3 = parseFastPath("กะเพราหมูกี่บาท", null, sampleProducts);
    assert.ok(res3);
    assert.equal(res3.actions[0].tool, "getProductPrice");
    if (res3.actions[0].tool === "getProductPrice") {
      assert.equal(res3.actions[0].args.name, "กะเพราหมู");
    }
  });

  test("resolves pending price prompt automatically", () => {
    const pending = {
      type: "WAITING_PRODUCT_PRICE" as const,
      productName: "กะเพราหมู",
      qty: 2,
    };

    const res = parseFastPath("60 บาท", pending, sampleProducts);
    assert.ok(res);
    assert.equal(res.actions.length, 2);
    assert.equal(res.actions[0].tool, "setProductPrice");
    if (res.actions[0].tool === "setProductPrice") {
      assert.equal(res.actions[0].args.name, "กะเพราหมู");
      assert.equal(res.actions[0].args.price, 60);
    }
    assert.equal(res.actions[1].tool, "addItem");
    if (res.actions[1].tool === "addItem") {
      assert.equal(res.actions[1].args.name, "กะเพราหมู");
      assert.equal(res.actions[1].args.qty, 2);
    }
  });
});
