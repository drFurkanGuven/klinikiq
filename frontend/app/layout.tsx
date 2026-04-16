import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AppInit } from "@/components/AppInit";

export const metadata: Metadata = {
  title: "KlinikIQ — TUS Hazırlık Platformu",
  description:
    "Yapay zeka ile hasta simülasyonu yaparak TUS'a hazırlanın. Gerçekçi klinik vakalar, anlık geri bildirim ve kapsamlı eğitim raporları.",
  keywords: "TUS hazırlık, tıp öğrencisi, hasta simülasyonu, klinik vaka, yapay zeka",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="min-h-screen antialiased transition-colors duration-300">
        <ThemeProvider>
          <AppInit />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
