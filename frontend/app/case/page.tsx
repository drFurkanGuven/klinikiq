"use client";
import { Suspense } from "react";
import CasePageContent from "./CaseContent";

export default function Page() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center font-black uppercase tracking-widest opacity-20">Bağlanıyor...</div>}>
      <CasePageContent />
    </Suspense>
  );
}
