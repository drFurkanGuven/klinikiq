import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KlinikIQ — TUS Hazırlık Platformu",
  description:
    "Yapay zeka ile hasta simülasyonu yaparak TUS'a hazırlanın. Gerçekçi klinik vakalar, anlık geri bildirim ve kapsamlı eğitim raporları.",
  keywords: "TUS hazırlık, tıp öğrencisi, hasta simülasyonu, klinik vaka, yapay zeka",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
