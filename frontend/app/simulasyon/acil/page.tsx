"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AcilRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/calis/oturum?mode=acil");
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin opacity-50" />
    </div>
  );
}
