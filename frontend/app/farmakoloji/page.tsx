"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Farmakoloji modülü — yalnızca interaktif mantık haritaları. */
export default function FarmakolojiPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/farmakoloji/haritalar");
  }, [router]);
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm font-medium" style={{ color: "var(--text-muted)" }}>
      Yönlendiriliyor…
    </div>
  );
}
