import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Kaydedilenler — KlinikIQ",
  description: "Kaydettiğin TUS notlarına buradan ulaş.",
};

export default function KaydedilenlerLayout({ children }: { children: ReactNode }) {
  return children;
}
