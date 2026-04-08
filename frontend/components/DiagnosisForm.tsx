"use client";
import { useState } from "react";
import { X, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";

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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative glass rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Tanıları Gir</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              En önemli tanıyı önce yaz (maks. 5)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {diagnoses.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs text-blue-400 font-bold">{i + 1}</span>
              </div>
              <input
                value={d}
                onChange={(e) => updateDiagnosis(i, e.target.value)}
                placeholder={
                  i === 0 ? "Ön tanı (en olası)" : `Alternatif tanı ${i + 1}`
                }
                className="input-focus flex-1 bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 text-sm"
              />
              {diagnoses.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeDiagnosis(i)}
                  className="w-8 h-8 rounded-lg hover:bg-red-500/10 hover:text-red-400 text-slate-500 flex items-center justify-center transition-colors"
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
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors px-2 py-1"
            >
              <Plus className="w-4 h-4" />
              Tanı Ekle
            </button>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm transition-colors"
            >
              İptal
            </button>
            <button
              id="diagnosis-submit"
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-2.5 rounded-xl transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Kaydediliyor...
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
