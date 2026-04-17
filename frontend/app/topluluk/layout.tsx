import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Topluluk not akışı — KlinikIQ",
  description:
    "Tıp (TUS) için temel ve klinik bilimlere göre sınıflandırılmış topluluk notları. Dal ve konu filtreleriyle keşfet.",
};

export default function ToplulukLayout({ children }: { children: ReactNode }) {
  return children;
}
