import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ToplulukNotDetayPage from "./ToplulukNotDetayPage";

function SuspenseFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <Loader2 className="w-10 h-10 animate-spin opacity-40" />
      <p className="text-sm font-medium opacity-60">Yükleniyor…</p>
    </div>
  );
}

export default function ToplulukNotRoutePage() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <ToplulukNotDetayPage />
    </Suspense>
  );
}
