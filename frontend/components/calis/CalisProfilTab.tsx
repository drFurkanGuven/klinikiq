"use client";

import { AccountSettingsPanel } from "@/components/account/AccountSettingsPanel";

export function CalisProfilTab() {
  return (
    <div className="space-y-4">
      <p className="text-xs font-medium" style={{ color: "var(--muted)" }}>
        Profil bilgileri, güvenlik ve uygulama ayarları
      </p>
      <AccountSettingsPanel />
    </div>
  );
}
