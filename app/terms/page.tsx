import type { Metadata } from "next";

export const metadata: Metadata = { title: "ข้อกำหนดการใช้งาน - POS Voice Lite" };

export default function TermsPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 text-gray-800 space-y-4 leading-relaxed">
      <h1 className="text-2xl font-extrabold">ข้อกำหนดการใช้งาน</h1>
      <p className="text-sm text-gray-500">อัปเดตล่าสุด: 30 ตุลาคม 2569</p>

      <ul className="list-disc pl-6 space-y-2">
        <li>POS Voice Lite เป็นเครื่องมือช่วยบันทึกการขายด้วยเสียงสำหรับร้านค้าขนาดเล็ก</li>
        <li>
          การแปลความคำสั่งเสียงด้วย AI อาจผิดพลาดได้ ผู้ใช้ต้องตรวจสอบรายการและยอดเงินในบิลก่อนคิดเงินทุกครั้ง
        </li>
        <li>ข้อมูลสินค้าและออเดอร์เก็บใน Google Sheets ของผู้ใช้ ผู้ใช้รับผิดชอบการสำรองและดูแลข้อมูลนั้น</li>
        <li>ห้ามใช้แอปในทางที่ผิดกฎหมาย หรือรบกวนการทำงานของระบบ</li>
        <li>
          บริการนี้ให้ใช้ตามสภาพที่เป็นอยู่ โดยไม่รับประกันว่าจะทำงานต่อเนื่องหรือไม่มีข้อผิดพลาด
          และผู้พัฒนาไม่รับผิดชอบต่อความเสียหายจากการใช้งาน เท่าที่กฎหมายอนุญาต
        </li>
        <li>ผู้พัฒนาอาจแก้ไขข้อกำหนดนี้ได้ โดยการใช้งานต่อถือว่ายอมรับข้อกำหนดที่แก้ไข</li>
      </ul>

      <p>
        ดู<a className="text-blue-600 underline" href="/privacy"> นโยบายความเป็นส่วนตัว </a>
        ประกอบ
      </p>
    </main>
  );
}
