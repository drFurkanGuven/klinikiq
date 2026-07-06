"use client";
import React from "react";
import { X, Check, AlertCircle } from "lucide-react";
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
  type = "info"
}: PremiumAlertProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
        onClick={() => { nativeClient.impact(); onClose(); }}
      />
      
      {/* Bottom Sheet Container */}
      <div className="relative w-full max-w-lg glass-card border-metallic animate-fade-in-up 
                   rounded-t-[3.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
           style={{ background: "var(--surface)" }}>
        
        {/* Handle for Mobile Visual */}
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2 sm:hidden" />

        <div className="p-8 sm:p-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-metallic glass"
                 style={{ 
                    background: type === "warning" ? "var(--error-light)" : "var(--primary-light)",
                    color: type === "warning" ? "var(--danger)" : "var(--primary)" 
                 }}>
              {type === "warning" ? <AlertCircle className="w-6 h-6" /> : <Check className="w-6 h-6" />}
            </div>
            <h3 className="text-2xl font-black tracking-tight" style={{ color: "var(--text)" }}>{title}</h3>
          </div>

          <p className="text-base font-medium opacity-70 leading-relaxed mb-10" style={{ color: "var(--text)" }}>
            {message}
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            {onConfirm && (
                <button
                    onClick={() => { nativeClient.impact(); onConfirm(); onClose(); }}
                    className="btn-premium flex-1 py-4.5 text-base order-1 sm:order-2"
                >
                    {confirmText}
                </button>
            )}
            <button
                onClick={() => { nativeClient.impact(); onClose(); }}
                className="flex-1 py-4.5 rounded-2xl font-black text-sm transition-all border-metallic glass 
                         hover:bg-white/5 order-2 sm:order-1"
                style={{ color: "var(--text)" }}
            >
                {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
