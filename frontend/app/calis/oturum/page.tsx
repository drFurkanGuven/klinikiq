"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import DailySession from "./DailySession";
import { Loader2 } from "lucide-react";

const AcilSession = dynamic(
  () => import("@/app/simulasyon/acil/AcilSession"),
  { ssr: false, loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin opacity-50" />
    </div>
  ) },
);

function OturumRouter() {
  const mode = useSearchParams().get("mode");
  if (mode === "acil") return <AcilSession />;
  if (mode === "usmle") return <DailySession mode="usmle" />;
  return <DailySession mode="daily" />;
}

export default function CalisOturumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin opacity-50" />
        </div>
      }
    >
      <OturumRouter />
    </Suspense>
  );
}
