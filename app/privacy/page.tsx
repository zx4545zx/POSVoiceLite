import type { Metadata } from "next";

export const metadata: Metadata = { title: "นโยบายความเป็นส่วนตัว - POS Voice Lite" };

export default function PrivacyPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 text-gray-800 space-y-4 leading-relaxed">
      <h1 className="text-2xl font-extrabold">นโยบายความเป็นส่วนตัว</h1>
      <p className="text-sm text-gray-500">อัปเดตล่าสุด: 30 ตุลาคม 2569</p>

      <h2 className="text-lg font-bold pt-2">ข้อมูลที่เราเข้าถึง</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>ข้อมูลบัญชี Google: อีเมล ชื่อ และรูปโปรไฟล์ ใช้แสดงผลและระบุตัวผู้ใช้ในแอป</li>
        <li>
          สิทธิ์ <code>drive.file</code>: แอปสร้างและแก้ไขเฉพาะสเปรดชีต &quot;POS Voice Lite&quot;
          ที่แอปสร้างขึ้นเอง ไม่สามารถเข้าถึงไฟล์อื่นใน Google Drive ของคุณ
        </li>
        <li>ข้อมูลร้านค้า: รายการสินค้า ราคา และออเดอร์ที่คุณบันทึก เก็บไว้ในสเปรดชีตของคุณเองเท่านั้น</li>
      </ul>

      <h2 className="text-lg font-bold pt-2">การประมวลผลเสียงและข้อความ</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>
          การแปลงเสียงเป็นข้อความใช้ Web Speech API ของเบราว์เซอร์ ซึ่งผู้ให้บริการเบราว์เซอร์
          (เช่น Google หรือ Apple) อาจประมวลผลเสียงตามนโยบายของตน แอปของเราไม่เก็บไฟล์เสียง
        </li>
        <li>
          เมื่อคำสั่งซับซ้อนเกินกว่าที่แอปแปลความเองได้ ข้อความคำสั่งและรายชื่อสินค้า (ชื่อกับราคา)
          จะถูกส่งไปยัง Google Gemini API เพื่อแปลความหมาย
        </li>
      </ul>

      <h2 className="text-lg font-bold pt-2">การเก็บและการแบ่งปันข้อมูล</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>แอปเก็บเซสชันการล็อกอินไว้ในคุกกี้ (cookie) ของเบราว์เซอร์คุณ และไม่มีฐานข้อมูลของเราเอง</li>
        <li>เราไม่ขายหรือแบ่งปันข้อมูลของคุณกับบุคคลที่สาม นอกจากผู้ให้บริการ Google ตามที่ระบุข้างต้น</li>
      </ul>

      <h2 className="text-lg font-bold pt-2">การลบข้อมูลและเพิกถอนสิทธิ์</h2>
      <p>
        กดออกจากระบบเพื่อลบเซสชันในเบราว์เซอร์ และเพิกถอนสิทธิ์ของแอปได้ที่
        <a className="text-brand-600 underline" href="https://myaccount.google.com/permissions">
          {" "}myaccount.google.com/permissions
        </a>
        ข้อมูลในสเปรดชีตเป็นของคุณ ลบได้โดยตรงใน Google Drive
      </p>

      <h2 className="text-lg font-bold pt-2">ติดต่อ</h2>
      <p>สอบถามเรื่องความเป็นส่วนตัวได้ที่อีเมลผู้พัฒนาแอป</p>
    </main>
  );
}
