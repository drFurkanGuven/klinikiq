"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Eski URL — farmakoloji ile ilişkili değildi; simülasyon modülüne taşındı. */
export default function FarmakolojiAcilMcqRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/simulasyon/acil");
  }, [router]);
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm font-medium" style={{ color: "var(--text-muted)" }}>
      Yönlendiriliyor…
    </div>
  );
}
