"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function QuestionsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/calis/oturum?mode=usmle");
  }, [router]);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <Loader2 className="w-8 h-8 animate-spin opacity-50" />
      <p className="text-sm opacity-60">USMLE gelişmiş moda yönlendiriliyor…</p>
    </div>
  );
}
