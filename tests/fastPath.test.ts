import test, { describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseThaiNumber,
  cleanVoiceCommand,
  parseFastPath,
  extractWakeCommand,
  parseWakeWords,
} from "../lib/nlp/fastPath";
import { collectUnsent, endpointDelay, FINAL_COMPLETE_MS, FINAL_WAIT_MORE_MS, SPEECH_END_MS, SPEECH_WAIT_MORE_MS, tailAfter } from "../lib/nlp/endpointing";
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

describe("multiple items in one utterance", () => {
  test("splits 'ต้มยำกุ้ง 2 ผัดกระเพรา 1' into two addItem actions", () => {
    const r = parseFastPath("ต้มยำกุ้ง 2 ผัดกระเพรา 1", null, []);
    assert.deepEqual(r?.actions, [
      { tool: "addItem", args: { name: "ต้มยำกุ้ง", qty: 2 } },
      { tool: "addItem", args: { name: "ผัดกระเพรา", qty: 1 } },
    ]);
  });

  test("handles Thai number words with spaces and classifiers", () => {
    const r = parseFastPath("ขอ ต้มยำกุ้ง สอง จาน ผัดกระเพรา หนึ่ง", null, []);
    assert.deepEqual(r?.actions, [
      { tool: "addItem", args: { name: "ต้มยำกุ้ง", qty: 2 } },
      { tool: "addItem", args: { name: "ผัดกระเพรา", qty: 1 } },
    ]);
  });

  test("single item still takes the single-item path", () => {
    const r = parseFastPath("ชาเขียว 2", null, []);
    assert.equal(r?.matchedRule, "addItem_trailingQuantity");
  });
});

describe("wake word", () => {
  const cases: [string, string | null][] = [
    ["น้องครับ กระเพราหมู 2", "กระเพราหมู 2"],
    ["น้องคะ คิดเงิน", "คิดเงิน"],
    ["เฮ้ โกโจ กะเพราหมู 2", "กะเพราหมู 2"],
    ["hey gojo checkout", "checkout"],
    ["โกโจ", ""],
    ["น้องครับ", ""],
    ["กะเพราหมู 2", null],
    ["สวัสดีครับ คิดเงิน", null], // generic greetings must not trigger hands-free
    ["พี่ครับ คิดเงิน", null],
    ["ลูกค้าบอกน้องครับ", null], // only at the start
  ];
  for (const [input, expected] of cases) {
    test(JSON.stringify(input), () => assert.equal(extractWakeCommand(input), expected));
  }
});

describe("custom wake words", () => {
  test("parseWakeWords trims, dedupes, drops short words, caps at 5", () => {
    assert.deepEqual(parseWakeWords(" น้องครับ , โกโจ,โกโจ,ค่ะ,ab, a b ,x y z,สวัสดีร้าน,เจ้านาย,ซุปเปอร์"), [
      "น้องครับ", "โกโจ", "x y z", "สวัสดีร้าน", "เจ้านาย",
    ]);
    assert.deepEqual(parseWakeWords(""), []);
  });

  test("uses only the given words", () => {
    assert.equal(extractWakeCommand("สวัสดีร้าน กะเพราหมู 2", ["สวัสดีร้าน"]), "กะเพราหมู 2");
    assert.equal(extractWakeCommand("น้องครับ กะเพราหมู 2", ["สวัสดีร้าน"]), null);
  });

  test("tolerates spaces the speech engine adds inside the word", () => {
    assert.equal(extractWakeCommand("สวัสดี ร้าน คิดเงิน", ["สวัสดีร้าน"]), "คิดเงิน");
    assert.equal(extractWakeCommand("น้อง ครับ คิดเงิน"), "คิดเงิน");
  });

  test("regex characters in a custom word are escaped; empty list never matches", () => {
    assert.equal(extractWakeCommand("a.b c", ["a.b"]), "c");
    assert.equal(extractWakeCommand("axb c", ["a.b"]), null);
    assert.equal(extractWakeCommand("โกโจ", []), null);
  });
});

describe("endpointing", () => {
  test("tailAfter returns only the not-yet-committed part", () => {
    assert.equal(tailAfter(undefined, "น้องครับ กะเพราหมู 2"), "น้องครับ กะเพราหมู 2");
    assert.equal(tailAfter("น้องครับ กะเพราหมู 2", "น้องครับ กะเพราหมู 2"), "");
    assert.equal(tailAfter("น้องครับ กะเพราหมู", "น้องครับ กะเพราหมู 2").trim(), "2");
    assert.equal(tailAfter("กะเพราหมู 2", "กะเพราหมูสอง"), ""); // reworded final: don't run it twice
  });
});

describe("quantity and ordering regressions", () => {
  const prods = [
    { id: "P1", name: "ผักกระเพรา", price: 60, active: true, createdAt: "", updatedAt: "" },
    { id: "P2", name: "โค้ก", price: 20, active: true, createdAt: "", updatedAt: "" },
  ] as Product[];
  const add = (text: string) => parseFastPath(text, null, prods)?.actions[0];

  test('"เอา X สอง" is an order, not a removal', () => {
    assert.deepEqual(add("เอาผักกระเพราสองครับ"), { tool: "addItem", args: { name: "ผักกระเพรา", qty: 2 } });
    assert.deepEqual(add("เอาโค้ก 1"), { tool: "addItem", args: { name: "โค้ก", qty: 1 } });
  });

  test('"เอา X ออก" and "ลบ X" still remove', () => {
    assert.equal(add("เอาโค้กออก")?.tool, "removeItem");
    assert.equal(add("ลบโค้ก")?.tool, "removeItem");
    assert.equal(add("ยกเลิกโค้ก")?.tool, "removeItem");
  });

  test("Thai numerals are read as quantities", () => {
    assert.deepEqual(add("เพิ่มผักกระเพรา ๒"), { tool: "addItem", args: { name: "ผักกระเพรา", qty: 2 } });
    assert.equal(cleanVoiceCommand("โค้ก ๑๒"), "โค้ก 12");
  });

  test("quantity before the name works for known products", () => {
    assert.deepEqual(add("เพิ่มสองผักกระเพรา"), { tool: "addItem", args: { name: "ผักกระเพรา", qty: 2 } });
    assert.deepEqual(add("เพิ่ม 2 โค้ก"), { tool: "addItem", args: { name: "โค้ก", qty: 2 } });
  });
});

describe("adaptive endpoint delay", () => {
  test("unfinished phrases wait longer than finished ones", () => {
    assert.equal(endpointDelay("เพิ่มผักกระเพรา"), SPEECH_WAIT_MORE_MS);
    assert.equal(endpointDelay("น้องครับ เพิ่มผักกระเพรา"), SPEECH_WAIT_MORE_MS);
    for (const done of ["เพิ่มผักกระเพรา 2", "เพิ่มผักกระเพราสอง", "คิดเงิน", "ล้างบิลด้วยครับ", "ผักกระเพรา 2 จาน", "60 บาท"]) {
      assert.equal(endpointDelay(done), SPEECH_END_MS, done);
    }
  });
});

describe("merging split speech results", () => {
  test("a quantity that arrives as its own result joins the phrase", () => {
    const { tail, lastIsFinal } = collectUnsent(
      [{ text: "น้องครับเพิ่มผัดกระเพรา", isFinal: true }, { text: "2", isFinal: false }],
      new Map()
    );
    assert.equal(tail, "น้องครับเพิ่มผัดกระเพรา2");
    assert.equal(lastIsFinal, false);
  });

  test("already-sent results are skipped, new ones kept", () => {
    const sent = new Map([[0, "น้องครับ คิดเงิน"]]);
    const { tail, snapshot } = collectUnsent(
      [{ text: "น้องครับ คิดเงิน", isFinal: true }, { text: "โค้ก 1", isFinal: true }],
      sent
    );
    assert.equal(tail, "โค้ก 1");
    assert.deepEqual(snapshot.map(([i]) => i), [0, 1]);
  });

  test("browser-final text waits less, unless it still looks unfinished", () => {
    assert.equal(endpointDelay("เพิ่มโค้ก 2", true), FINAL_COMPLETE_MS);
    assert.equal(endpointDelay("เพิ่มโค้ก", true), FINAL_WAIT_MORE_MS);
    assert.equal(endpointDelay("เพิ่มโค้ก", false), SPEECH_WAIT_MORE_MS);
    assert.equal(endpointDelay("เพิ่มโค้ก 2", false), SPEECH_END_MS);
  });
});
