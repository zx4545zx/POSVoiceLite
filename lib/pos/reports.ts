import { Order } from "@/types/pos";

export type ReportRange = "today" | "7d" | "30d" | "all";

export interface OrderLine {
  name: string;
  qty: number;
  amount: number;
}

export interface Report {
  bills: number;
  revenue: number;
  discount: number;
  avgBill: number;
  daily: { date: string; total: number; bills: number }[];
  top: OrderLine[];
  peakHour: number | null;
  orders: (Order & { date: string })[];
}

const DAY_MS = 86_400_000;

/** YYYY-MM-DD in Thailand time, or null if the timestamp is unparseable */
export function bangkokDate(iso: string): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(d);
}

function bangkokHour(iso: string): number {
  const h = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    hour12: false,
  }).format(new Date(iso));
  return parseInt(h, 10) % 24;
}

/** Parses "กะเพราหมู x2 (฿120), โค้ก x1 (฿20)" as written by formatOrderItemsSummary */
export function parseOrderItems(summary: string): OrderLine[] {
  const lines: OrderLine[] = [];
  for (const m of summary.matchAll(/(?:^|, )(.+?) x(\d+) \(฿([\d.]+)\)/g)) {
    lines.push({ name: m[1], qty: parseInt(m[2], 10), amount: parseFloat(m[3]) });
  }
  return lines;
}

function addDays(date: string, days: number): string {
  return new Date(Date.parse(date) + days * DAY_MS).toISOString().slice(0, 10);
}

export function summarize(orders: Order[], range: ReportRange, now = new Date()): Report {
  const today = bangkokDate(now.toISOString())!;
  const start =
    range === "today" ? today : range === "7d" ? addDays(today, -6) : range === "30d" ? addDays(today, -29) : null;

  const inRange = orders
    .map((o) => ({ ...o, date: bangkokDate(o.datetime) }))
    .filter((o): o is Order & { date: string } => o.date !== null && (start === null || o.date >= start))
    .sort((a, b) => b.datetime.localeCompare(a.datetime));

  const byDay = new Map<string, { total: number; bills: number }>();
  const byItem = new Map<string, OrderLine>();
  const hourBills = new Array<number>(24).fill(0);
  let revenue = 0;
  let discount = 0;

  for (const o of inRange) {
    revenue += o.total;
    discount += o.discount;
    const day = byDay.get(o.date) ?? { total: 0, bills: 0 };
    day.total += o.total;
    day.bills += 1;
    byDay.set(o.date, day);
    hourBills[bangkokHour(o.datetime)] += 1;
    for (const line of parseOrderItems(o.items)) {
      const cur = byItem.get(line.name) ?? { name: line.name, qty: 0, amount: 0 };
      cur.qty += line.qty;
      cur.amount += line.amount;
      byItem.set(line.name, cur);
    }
  }

  // Fixed ranges show every day (zeros included); "all" shows only days with sales
  const dates: string[] = [];
  if (start === null) dates.push(...[...byDay.keys()].sort());
  else for (let d = start; d <= today; d = addDays(d, 1)) dates.push(d);

  const peak = Math.max(...hourBills);
  return {
    bills: inRange.length,
    revenue,
    discount,
    avgBill: inRange.length ? revenue / inRange.length : 0,
    daily: dates.map((date) => ({ date, ...(byDay.get(date) ?? { total: 0, bills: 0 }) })),
    top: [...byItem.values()].sort((a, b) => b.qty - a.qty || b.amount - a.amount).slice(0, 10),
    peakHour: peak > 0 ? hourBills.indexOf(peak) : null,
    orders: inRange,
  };
}

/** CSV with a BOM so Excel opens Thai text correctly */
export function ordersToCsv(orders: Order[]): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [["orderId", "datetime", "items", "subtotal", "discount", "total"]].concat(
    orders.map((o) => [o.orderId, o.datetime, o.items, String(o.subtotal), String(o.discount), String(o.total)])
  );
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\n");
}
