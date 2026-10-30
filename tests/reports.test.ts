import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { bangkokDate, ordersToCsv, parseOrderItems, summarize } from "../lib/pos/reports";
import { Order } from "../types/pos";

const order = (id: string, datetime: string, items: string, total: number, discount = 0): Order => ({
  orderId: id, datetime, items, subtotal: total + discount, discount, total,
});

// 2026-10-30 12:00 Bangkok = 05:00Z
const NOW = new Date("2026-10-30T05:00:00Z");
const orders = [
  order("A", "2026-10-30T03:00:00Z", "กะเพราหมู x2 (฿120), โค้ก x1 (฿20)", 140),
  order("B", "2026-10-30T04:00:00Z", "โค้ก x3 (฿60)", 50, 10),
  order("C", "2026-10-27T10:00:00Z", "กะเพราหมู x1 (฿60)", 60),
  order("D", "2026-09-01T10:00:00Z", "ชาเย็น x1 (฿30)", 30),
  order("E", "not-a-date", "x x1 (฿1)", 1),
];

describe("reports", () => {
  test("parseOrderItems reads the engine's summary format", () => {
    assert.deepEqual(parseOrderItems("กะเพราหมู x2 (฿120), โค้ก x1 (฿20)"), [
      { name: "กะเพราหมู", qty: 2, amount: 120 },
      { name: "โค้ก", qty: 1, amount: 20 },
    ]);
  });

  test("bangkokDate rolls over at 17:00Z", () => {
    assert.equal(bangkokDate("2026-10-30T16:59:00Z"), "2026-10-30");
    assert.equal(bangkokDate("2026-10-30T17:00:00Z"), "2026-10-31");
  });

  test("today: totals, discount, average, top items; bad dates ignored", () => {
    const r = summarize(orders, "today", NOW);
    assert.equal(r.bills, 2);
    assert.equal(r.revenue, 190);
    assert.equal(r.discount, 10);
    assert.equal(r.avgBill, 95);
    assert.deepEqual(r.top[0], { name: "โค้ก", qty: 4, amount: 80 });
    assert.equal(r.peakHour, 10); // 03:00Z = 10:00 Bangkok (tie broken by earliest hour)
  });

  test("7d fills missing days with zeros", () => {
    const r = summarize(orders, "7d", NOW);
    assert.equal(r.daily.length, 7);
    assert.equal(r.daily[0].date, "2026-10-24");
    assert.equal(r.bills, 3);
    assert.equal(r.daily.find((d) => d.date === "2026-10-28")?.total, 0);
    assert.equal(r.daily.find((d) => d.date === "2026-10-27")?.total, 60);
  });

  test("all shows only days with sales; empty input is safe", () => {
    assert.equal(summarize(orders, "all", NOW).daily.length, 3);
    const empty = summarize([], "30d", NOW);
    assert.equal(empty.bills, 0);
    assert.equal(empty.avgBill, 0);
    assert.equal(empty.peakHour, null);
  });

  test("CSV escapes quotes and starts with BOM", () => {
    const csv = ordersToCsv([order("A", "2026-10-30T03:00:00Z", 'say "hi", ok x1 (฿1)', 1)]);
    assert.ok(csv.startsWith("﻿"));
    assert.ok(csv.includes('"say ""hi"", ok x1 (฿1)"'));
  });
});
