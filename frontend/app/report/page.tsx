"use client";
import { Suspense } from "react";
import ReportPageContent from "./ReportContent";

export default function Page() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center font-black uppercase tracking-widest opacity-20">Rapor Hazırlanıyor...</div>}>
      <ReportPageContent />
    </Suspense>
  );
}
