import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "TUS not akışı — KlinikIQ",
  description:
    "Tıp (TUS) notlarını temel ve klinik bilimlere göre filtrele; beğen, kaydet, paylaş.",
};

export default function ToplulukLayout({ children }: { children: ReactNode }) {
  return children;
}
