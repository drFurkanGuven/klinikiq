import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Not paylaş — Topluluk — KlinikIQ",
  description: "Tıp (TUS) sınıflandırmasıyla topluluğa ders notu taslağı hazırlayın.",
};

export default function PaylasLayout({ children }: { children: ReactNode }) {
  return children;
}
