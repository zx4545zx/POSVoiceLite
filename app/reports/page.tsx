"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { Order } from "@/types/pos";
import { ordersToCsv, ReportRange, summarize } from "@/lib/pos/reports";

const RANGES: { id: ReportRange; label: string }[] = [
  { id: "today", label: "วันนี้" },
  { id: "7d", label: "7 วัน" },
  { id: "30d", label: "30 วัน" },
  { id: "all", label: "ทั้งหมด" },
];

const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`;
const shortDate = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "UTC" });
const time = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; orders: Order[]; isMock: boolean };

export default function ReportsPage() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [range, setRange] = useState<ReportRange>("today");

  useEffect(() => {
    fetch("/api/orders")
      .then(async (res) => {
        const data = await res.json();
        if (res.status === 401) throw new Error("กรุณาเข้าสู่ระบบก่อน");
        if (!res.ok) throw new Error("โหลดออเดอร์ไม่สำเร็จ ลองใหม่อีกครั้ง");
        setState({ status: "ready", orders: data.orders, isMock: Boolean(data.isMock) });
      })
      .catch((e: Error) => setState({ status: "error", message: e.message }));
  }, []);

  const report = useMemo(
    () => (state.status === "ready" ? summarize(state.orders, range) : null),
    [state, range]
  );

  const downloadCsv = () => {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([ordersToCsv(report.orders)], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `orders-${range}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxDay = report ? Math.max(1, ...report.daily.map((d) => d.total)) : 1;
  const maxTop = report ? Math.max(1, ...report.top.map((t) => t.qty)) : 1;

  return (
    <main className="min-h-dvh w-full max-w-3xl mx-auto bg-white pb-8">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-150 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="p-2 -ml-2 rounded-full text-gray-600 hover:bg-gray-100" aria-label="กลับหน้าขาย">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-bold text-lg flex-1">สรุปยอดขาย</h1>
        <button
          onClick={downloadCsv}
          disabled={!report || report.bills === 0}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 bg-brand-50 px-3 py-1.5 rounded-lg disabled:opacity-40"
        >
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      </header>

      {state.status === "loading" && <p className="p-8 text-center text-sm text-gray-400">กำลังโหลด...</p>}

      {state.status === "error" && (
        <div className="p-8 text-center space-y-3">
          <p className="text-sm text-red-600">{state.message}</p>
          <Link href="/" className="text-sm text-brand-700 underline">กลับหน้าหลัก</Link>
        </div>
      )}

      {state.status === "ready" && report && (
        <div className="p-4 space-y-6">
          {state.isMock && (
            <p className="p-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl">
              โหมดทดลองไม่บันทึกออเดอร์ เข้าสู่ระบบด้วย Google เพื่อดูยอดขายจริง
            </p>
          )}

          <div className="flex gap-2">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  range === r.id ? "bg-brand-600 text-white border-brand-600" : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "ยอดขาย", value: baht(report.revenue) },
              { label: "จำนวนบิล", value: report.bills.toLocaleString() },
              { label: "เฉลี่ยต่อบิล", value: baht(report.avgBill) },
              { label: "ส่วนลดรวม", value: baht(report.discount) },
            ].map((k) => (
              <div key={k.label} className="p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-[11px] text-gray-500">{k.label}</p>
                <p className="text-xl font-extrabold text-gray-900 truncate">{k.value}</p>
              </div>
            ))}
          </div>

          {report.peakHour !== null && (
            <p className="text-xs text-gray-500">
              ช่วงที่ขายดีที่สุด: {String(report.peakHour).padStart(2, "0")}:00-{String(report.peakHour).padStart(2, "0")}:59 น.
            </p>
          )}

          <section>
            <h2 className="text-sm font-bold mb-2">ยอดขายรายวัน</h2>
            {report.daily.length === 0 ? (
              <p className="text-xs text-gray-400">ยังไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-1.5">
                {report.daily.map((d) => (
                  <div key={d.date} className="flex items-center gap-2 text-xs">
                    <span className="w-14 shrink-0 text-gray-500">{shortDate(d.date)}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded">
                      <div className="h-full bg-brand-500 rounded" style={{ width: `${(d.total / maxDay) * 100}%` }} />
                    </div>
                    <span className="w-20 shrink-0 text-right font-semibold">{baht(d.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-bold mb-2">เมนูขายดี (ตามจำนวน)</h2>
            {report.top.length === 0 ? (
              <p className="text-xs text-gray-400">ยังไม่มีข้อมูล</p>
            ) : (
              <div className="space-y-1.5">
                {report.top.map((t, i) => (
                  <div key={t.name} className="flex items-center gap-2 text-xs">
                    <span className="w-4 shrink-0 text-gray-400">{i + 1}</span>
                    <span className="w-28 sm:w-40 shrink-0 truncate font-medium">{t.name}</span>
                    <div className="flex-1 h-4 bg-gray-100 rounded">
                      <div className="h-full bg-teal-400 rounded" style={{ width: `${(t.qty / maxTop) * 100}%` }} />
                    </div>
                    <span className="w-24 shrink-0 text-right">{t.qty} ชิ้น · {baht(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-bold mb-2">ออเดอร์ล่าสุด</h2>
            {report.orders.length === 0 ? (
              <p className="text-xs text-gray-400">ยังไม่มีออเดอร์ในช่วงนี้ (บิลที่ยังไม่คิดเงินจะไม่แสดง)</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {report.orders.slice(0, 20).map((o) => (
                  <li key={o.orderId} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">{time(o.datetime)} · {o.orderId}</p>
                      <p className="text-sm text-gray-800 break-words">{o.items}</p>
                    </div>
                    <span className="text-sm font-bold shrink-0">{baht(o.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
