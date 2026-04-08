"use client";
import { useState } from "react";
import { X, Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";

interface Props {
  onSubmit: (diagnoses: string[]) => Promise<void>;
  onClose: () => void;
}

export default function DiagnosisForm({ onSubmit, onClose }: Props) {
  const [diagnoses, setDiagnoses] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addDiagnosis() {
    if (diagnoses.length < 5) {
      setDiagnoses([...diagnoses, ""]);
    }
  }

  function removeDiagnosis(i: number) {
    setDiagnoses(diagnoses.filter((_, idx) => idx !== i));
  }

  function updateDiagnosis(i: number, val: string) {
    const updated = [...diagnoses];
    updated[i] = val;
    setDiagnoses(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const filtered = diagnoses.filter((d) => d.trim());
    if (filtered.length === 0) {
      setError("En az bir tanı girmelisiniz.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onSubmit(filtered);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Tanılar kaydedilemedi.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />      <div className="relative glass rounded-3xl shadow-2xl w-full max-w-md p-6 z-10 border transition-all" 
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black tracking-tight" style={{ color: "var(--text-navy)" }}>Tanıları Gir</h2>
            <p className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-60" style={{ color: "var(--text-muted)" }}>
              En önemli tanıyı önce yaz (maks. 5)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 active:scale-90 border shadow-sm"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)", borderColor: "var(--border)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5 text-sm font-bold border"
            style={{ background: "var(--error-light)", color: "var(--text-red)", borderColor: "var(--error-light)" }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {diagnoses.map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-black text-[10px] shadow-sm border"
                style={{ background: "var(--primary-light)", color: "var(--primary)", borderColor: "var(--primary-light)" }}>
                {i + 1}
              </div>
              <input
                value={d}
                onChange={(e) => updateDiagnosis(i, e.target.value)}
                placeholder={
                  i === 0 ? "Ön tanı (en olası)" : `Alternatif hastalık ${i + 1}`
                }
                className="input-focus flex-1 border rounded-xl px-4 py-3 text-sm transition-all"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-navy)" }}
              />
              {diagnoses.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDiagnosis(i)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:text-red-500 opacity-40 hover:opacity-100"
                  style={{ color: "var(--text-navy)" }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          {diagnoses.length < 5 && (
            <button
              type="button"
              onClick={addDiagnosis}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all hover:translate-x-1 px-1 mt-2"
              style={{ color: "var(--primary)" }}
            >
              <Plus className="w-4 h-4" />
              Tanı Ekle
            </button>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl border font-bold text-xs font-black uppercase tracking-widest transition-all hover:bg-black/5"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            >
              İptal
            </button>
            <button
              id="diagnosis-submit"
              type="submit"
              disabled={loading}
              className="flex-1 text-white font-black py-3.5 rounded-2xl transition-all text-sm shadow-xl active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 group relative overflow-hidden"
              style={{ background: "var(--primary)" }}
            >
              <div className="absolute inset-0 bg-white/10 w-0 group-hover:w-full transition-all duration-300" />
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  İşleniyor...
                </>
              ) : (
                "Tanıları Kaydet"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
