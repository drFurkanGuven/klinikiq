"use client";
import { Check, AlertCircle } from "lucide-react";
import { nativeClient } from "@/lib/native";

interface PremiumAlertProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "info" | "warning" | "success";
}

export default function PremiumAlert({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Tamam",
  cancelText = "Vazgeç",
  type = "info",
}: PremiumAlertProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          nativeClient.impact();
          onClose();
        }}
        aria-hidden
      />

      <div
        className="relative w-full max-w-md card overflow-hidden animate-fade-in-up rounded-t-lg sm:rounded-lg"
        style={{ background: "var(--surface)" }}
        role="dialog"
        aria-modal="true"
      >
        <div className="w-10 h-1 rounded-full mx-auto mt-3 mb-1 sm:hidden bg-border" />

        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-md flex items-center justify-center border shrink-0"
              style={{
                background:
                  type === "warning"
                    ? "var(--destructive-muted)"
                    : "var(--accent-muted)",
                color:
                  type === "warning" ? "var(--destructive)" : "var(--accent)",
                borderColor: "var(--border)",
              }}
            >
              {type === "warning" ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </div>
            <h3
              className="text-lg font-semibold pt-1"
              style={{ color: "var(--foreground)" }}
            >
              {title}
            </h3>
          </div>

          <p
            className="text-sm leading-relaxed mb-6"
            style={{ color: "var(--muted)" }}
          >
            {message}
          </p>

          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                nativeClient.impact();
                onClose();
              }}
              className="btn-secondary flex-1 py-2.5 text-sm"
            >
              {cancelText}
            </button>
            {onConfirm && (
              <button
                type="button"
                onClick={() => {
                  nativeClient.impact();
                  onConfirm();
                  onClose();
                }}
                className="btn-primary flex-1 py-2.5 text-sm"
              >
                {confirmText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
