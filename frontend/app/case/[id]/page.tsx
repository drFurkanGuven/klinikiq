"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { sessionsApi } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import DiagnosisForm from "@/components/DiagnosisForm";
import {
  Activity, FileText, CheckCircle2, ArrowLeft,
  Stethoscope, AlertTriangle, Send, Loader2,
  PanelLeftOpen, PanelLeftClose, Bot, Info, TestTube2, Phone, X, ShieldAlert,
} from "lucide-react";

// --- SABİTLER VE VERİLER ---

const PHYSICAL_EXAM = [
  { icon: "🫀", label: "Kardiyovasküler", message: "[FİZİK MUAYENE] Kardiyovasküler sistem muayenesi (kalp sesleri, üfürüm, nabızlar, ödem) yapar mısın?" },
  { icon: "🫁", label: "Solunum", message: "[FİZİK MUAYENE] Solunum sistemi muayenesi (rall, ronküs, wheezing, solunum sesleri) yapar mısın?" },
  { icon: "🩺", label: "Batın", message: "[FİZİK MUAYENE] Batın muayenesi (inspeksiyon, palpasyon, hassasiyet, rebound/defans, organomegali) yapar mısın?" },
  { icon: "🧠", label: "Nörolojik", message: "[FİZİK MUAYENE] Nörolojik muayene (bilinç, GKS, kranial sinirler, motor/duyu defisiti, refleksler) yapar mısın?" },
  { icon: "👁️", label: "Göz / Baş-Boyun", message: "[FİZİK MUAYENE] Baş, boyun ve göz muayenesi (pupiller, mukoza, LAP) yapar mısın?" },
  { icon: "🦵", label: "Ekstremite / Cilt", message: "[FİZİK MUAYENE] Ekstremite, nabızlar ve cilt muayenesi (döküntü, ısı, turgor) yapar mısın?" },
];

const LAB_CATEGORIES = [
  { id: "emergency", label: "🚨 ACİL PANEL", color: "text-rose-400" },
  { id: "routine", label: "🧪 RUTİN LABORATUVAR", color: "text-amber-400" },
  { id: "radiology", label: "☢️ GÖRÜNTÜLEME (RADYOLOJİ)", color: "text-cyan-400" },
  { id: "specific", label: "🔬 ÖZEL / SPESİFİK", color: "text-purple-400" },
];

const LAB_TESTS = [
  // ACİL
  { id: "hemogram", name: "Tam Kan Sayımı (Hemogram)", price: 50, category: "emergency" },
  { id: "ekg", name: "Elektrokardiyogram (EKG)", price: 50, category: "emergency" },
  { id: "abg", name: "Arteriyel Kan Gazı (AKG)", price: 100, category: "emergency" },
  { id: "kardiyak", name: "Kardiyak Panel (Troponin, CK-MB)", price: 150, category: "emergency" },
  { id: "ddimer", name: "D-Dimer", price: 100, category: "emergency" },
  { id: "kan_keton", name: "Kan Ketonu (Beta-hidroksibütirat)", price: 60, category: "emergency" },
  
  // RUTİN
  { id: "biyokimya", name: "Rutin Biyokimya (BUN, Kre, AST, ALT, Na, K, Glukoz)", price: 100, category: "routine" },
  { id: "genis_biyokimya", name: "Geniş Biyokimya (Ca, Mg, P, Albumin, Bilirubinler)", price: 120, category: "routine" },
  { id: "tam_idrar", name: "Tam İdrar Tahlili (TİT)", price: 40, category: "routine" },
  { id: "koagulasyon", name: "Koagülasyon (PT, aPTT, INR)", price: 80, category: "routine" },
  { id: "akut_faz", name: "Akut Faz (CRP, Prokalsitonin, Sedim)", price: 150, category: "routine" },
  { id: "lipit", name: "Lipit Profili (LDL, HDL, Trigliserid)", price: 80, category: "routine" },
  { id: "hba1c", name: "HbA1c", price: 80, category: "routine" },
  
  // RADYOLOJİ
  { id: "akciger", name: "Akciğer Grafisi (PAAC)", price: 100, category: "radiology" },
  { id: "grafi_adbg", name: "Ayakta Direk Batın Grafisi (ADBG)", price: 100, category: "radiology" },
  { id: "grafi_kafa", name: "Kafa Grafisi (AP-Lateral)", price: 80, category: "radiology" },
  { id: "grafi_ekstremite", name: "Ekstremite Grafisi (Seçili Bölge)", price: 80, category: "radiology" },
  { id: "usg_batin", name: "Tüm Batın USG", price: 300, category: "radiology" },
  { id: "eko", name: "Ekokardiyografi (EKO)", price: 400, category: "radiology" },
  { id: "bt_kranial", name: "Kranial BT (Kontrastsız)", price: 500, category: "radiology" },
  { id: "bt_toraks", name: "Toraks BT (Kontrastsız)", price: 500, category: "radiology" },
  { id: "bt_batin", name: "Tüm Batın BT (Kontrastlı)", price: 600, category: "radiology" },
  { id: "bt_boyun", name: "Boyun BT", price: 500, category: "radiology" },
  { id: "bt_toraks_anji", name: "Pulmoner BT Anjiyo", price: 600, category: "radiology" },
  { id: "mr_kranial", name: "Kranial MR", price: 800, category: "radiology" },
  { id: "mr_lomber", name: "Lomber MR", price: 800, category: "radiology" },
  { id: "usg_doppler", name: "Venöz/Arteriyel Doppler USG", price: 350, category: "radiology" },

  // ÖZEL
  { id: "tiroid", name: "Tiroid Paneli (TSH, sT3, sT4)", price: 120, category: "specific" },
  { id: "demir_vit", name: "Anemi Paneli (Demir, Ferritin, B12)", price: 150, category: "specific" },
  { id: "romatoloji", name: "Romatoloji Paneli (ANA, RF, Anti-CCP)", price: 200, category: "specific" },
  { id: "viral_seroloji", name: "Viral Seroloji (HBsAg, HCV, HIV)", price: 150, category: "specific" },
  { id: "otoimmun_panel", name: "Otoimmün Panel (ANCA, SMA, LKM)", price: 250, category: "specific" },
  { id: "kultur_kan", name: "Kan Kültürü (Aerob/Anaerob)", price: 150, category: "specific" },
  { id: "kultur_idrar", name: "İdrar Kültürü", price: 100, category: "specific" },
  { id: "lomber_ponksiyon", name: "Lomber Ponksiyon (BOS Analizi)", price: 400, category: "specific" },
  { id: "periferik_yayma", name: "Periferik Yayma (Manuel Değerl.)", price: 60, category: "specific" },
];

const SPECIALTY_LABELS: Record<string, string> = {
  cardiology: "Kardiyoloji", endocrinology: "Endokrinoloji",
  neurology: "Nöroloji", pulmonology: "Pulmonoloji", default: "Genel",
};

const DIFFICULTY_MAP: Record<string, { label: string; color: string; initialBudget: number }> = {
  easy: { label: "Kolay", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", initialBudget: 1000 },
  medium: { label: "Orta", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", initialBudget: 1500 },
  hard: { label: "Zor", color: "text-red-400 bg-red-500/10 border-red-500/20", initialBudget: 2500 },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface Message { role: "user" | "assistant"; content: string; streaming?: boolean; }

// --- PARSER: MARKDOWN TABLOLARINI YAKALA ---
function parseContent(content: string) {
  const lines = content.split('\n');
  const elements: { type: 'text' | 'table', content: string[] | string }[] = [];
  let currentText: string[] = [];
  let currentTable: string[] = [];
  let inTable = false;

  for (const line of lines) {
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (!inTable) {
        if (currentText.length > 0) {
          elements.push({ type: 'text', content: currentText.join('\n') });
          currentText = [];
        }
        inTable = true;
      }
      currentTable.push(line);
    } else {
      if (inTable) {
        elements.push({ type: 'table', content: [...currentTable] });
        currentTable = [];
        inTable = false;
      }
      currentText.push(line);
    }
  }
  if (currentText.length > 0) elements.push({ type: 'text', content: currentText.join('\n') });
  if (currentTable.length > 0) elements.push({ type: 'table', content: currentTable });
  
  return elements;
}

function RenderMessage({ content }: { content: string }) {
  const elements = parseContent(content);
  return (
    <div className="space-y-4">
      {elements.map((el, i) => {
        if (el.type === 'text') {
          return <div key={i} className="whitespace-pre-wrap">{el.content}</div>;
        }
        if (el.type === 'table') {
          const rawLines = el.content as string[];
          const dataLines = rawLines.filter(l => !l.includes('---'));
          if (dataLines.length === 0) return null;
          
          const headers = dataLines[0].split('|').map(x => x.trim()).filter(x => x);
          const rows = dataLines.slice(1).map(l => l.split('|').map(x => x.trim()).filter(x => x));
          
          return (
            <div key={i} className="my-3 border border-slate-700 bg-slate-900 shadow-xl rounded-xl overflow-hidden font-mono text-[11px] sm:text-xs w-full">
              {/* LIS Header */}
              <div className="bg-slate-800 px-3 py-2 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TestTube2 className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-slate-200">KlinikIQ Sağlık Bakanlığı Laboratuvar Bilgi Sistemi</span>
                </div>
                <span className="text-slate-500 hidden sm:block">Onaylandı ✓</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#0b1120] text-slate-400 border-b border-slate-700/50">
                    <tr>
                      {headers.map(h => <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    {rows.map((row, idx) => {
                      const isHigh = row.some(cell => cell.includes('(H)') || cell.includes('Yüksek') || cell.includes('High'));
                      const isLow = row.some(cell => cell.includes('(L)') || cell.includes('Düşük') || cell.includes('Low'));
                      return (
                        <tr key={idx} className={`${isHigh ? 'bg-rose-500/10' : isLow ? 'bg-blue-500/10' : 'hover:bg-slate-800/30'} transition-colors`}>
                          {row.map((cell, cidx) => {
                            const isValueCell = cidx === 1; // Assuming 2nd column is the Value
                            return (
                              <td key={cidx} className={`px-3 py-2 
                                ${isHigh && isValueCell ? 'text-rose-400 font-bold' : ''} 
                                ${isLow && isValueCell ? 'text-blue-400 font-bold' : ''}
                              `}>
                                {cell.replace(/\([HL]\)/gi, '')}
                                {isHigh && isValueCell && <span className="ml-1 text-[10px] text-rose-500">( Yüksek )</span>}
                                {isLow && isValueCell && <span className="ml-1 text-[10px] text-blue-500">( Düşük )</span>}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        }
      })}
    </div>
  )
}

// --- ANA SAYFA ---

export default function CasePage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const router = useRouter();

  const [sessionData, setSessionData] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [diagnosisSaved, setDiagnosisSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Custom States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [budget, setBudget] = useState(1000);
  const [selectedLabs, setSelectedLabs] = useState<string[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return; }
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadSession() {
    try {
      const res = await sessionsApi.getSession(sessionId);
      setSessionData(res.data);
      const difficulty = res.data.case?.difficulty || 'medium';
      setBudget(DIFFICULTY_MAP[difficulty].initialBudget);
    } catch { setError("Oturum yüklenemedi."); }
    finally { setLoading(false); }
  }

  const sendMessage = useCallback(async (text?: string, displayOverride?: string) => {
    const rawMsg = (text ?? input).trim();
    if (!rawMsg || streaming) return;
    setInput("");
    setSidebarOpen(false);

    // Ekranda görünen mesajı formatla (Prompt Injection ve Çirkinliği gizle)
    let displayMsg = displayOverride || rawMsg;
    if (!displayOverride) {
      if (rawMsg.startsWith("[KONSÜLTASYON İSTEĞİ]")) displayMsg = "📞 Uzmana Danış (Konsültasyon İstendi)";
      else if (rawMsg.startsWith("[FİZİK MUAYENE]")) {
        // İkonu ve başlığı almak için ufak bir temizleme
        displayMsg = rawMsg.replace("[FİZİK MUAYENE] ", "").split("(")[0] + " Muayenesi Yapıldı";
      }
      else if (rawMsg.startsWith("[TETKİK İSTEDİ]")) displayMsg = "🧪 Laboratuvar/Görüntüleme İsteği Gönderildi";
    }

    setMessages((prev) => [...prev, { role: "user", content: displayMsg }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);
    setStreaming(true);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_URL}/sessions/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: rawMsg }),
      });
      if (!response.ok || !response.body) throw new Error();
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const p = JSON.parse(data);
            if (p.content) {
              accumulated += p.content;
              setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: accumulated, streaming: true }; return u; });
            }
          } catch {}
        }
      }
      setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: accumulated, streaming: false }; return u; });
    } catch {
      setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: "Bağlantı hatası. Tekrar deneyin.", streaming: false }; return u; });
    } finally { setStreaming(false); }
  }, [input, streaming, sessionId]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  // --- HOCA KONSÜLTASYON ---
  const requestConsultation = () => {
    sendMessage("[KONSÜLTASYON İSTEĞİ] (SİSTEM: Artık hasta değilsin. Asistan doktor sana hastayı danışıyor. Sen deneyimli, asabi ve hiyerarşik bir Profesörsün. Önce asistanı 'klinik becerisi' üzerinden azarla, SONRA MUTLAKA hastanın GİZLİ TANISINA veya patolojisine ulaşması için ona TUS düzeyinde spesifik ve çok faydalı bir TIBBİ İPUCU ver (Örn: 'Hastanın şu değerini gözden mi kaçırdın?', 'Bu tabloda X tetkikini istemen gerekirdi!'). Tanıyı pat diye söyleme ama asistanın ufkunu aç.)");
  };

  // --- LAB SİPARİŞ ---
  const toggleLab = (id: string, price: number) => {
    if (selectedLabs.includes(id)) {
      setSelectedLabs(prev => prev.filter(l => l !== id));
      setBudget(prev => prev + price);
    } else {
      if (budget >= price) {
        setSelectedLabs(prev => [...prev, id]);
        setBudget(prev => prev - price);
      } else {
        alert("Yetersiz SGK Bütçesi! Halledemeyiz dediler.");
      }
    }
  };

  const orderLabs = () => {
    if (selectedLabs.length === 0) return;
    const testNames = selectedLabs.map(id => LAB_TESTS.find(t => t.id === id)?.name).join(", ");
    
    // Yollayacağımız özel mesaj
    sendMessage(`[TETKİK İSTEDİ] Aşağıdaki laboratuvar/görüntüleme tetkiklerini sisteme girdim:\n- ${testNames}\n\nLütfen ilgili sonuçları gerçekçi bir "Markdown Tablo" (Parametre | Sonuç | Birim | Referans Aralığı) formatında şıkça listele. Referans dışındakileri parantez içinde (H) veya (L) ile belirt.`);
    
    // Reset selection after ordering to re-use
    setSelectedLabs([]);
    setLabOpen(false);
  };


  async function handleDiagnosisSubmit(diagnoses: string[]) {
    await sessionsApi.diagnose(sessionId, diagnoses);
    setDiagnosisSaved(true);
    setShowDiagnosis(false);
  }

  async function handleComplete() {
    if (!diagnosisSaved) { setError("Önce en az bir tanı girmelisiniz."); return; }
    setCompleting(true); setError("");
    try {
      await sessionsApi.complete(sessionId);
      router.push(`/report/${sessionId}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Vaka tamamlanamadı.");
      setCompleting(false);
    }
  }

  const patient = sessionData?.case?.patient;
  const caseInfo = sessionData?.case;
  const diff = DIFFICULTY_MAP[caseInfo?.difficulty] ?? DIFFICULTY_MAP.medium;

  // Sidebar içeriği
  const SidebarContent = () => (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pb-4">
      
      {/* SGK Bütçe Sayacı */}
      <div className="glass rounded-2xl p-4 border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
        <div>
          <p className="text-xs text-emerald-400/80 font-bold uppercase tracking-wider">SGK Bütçesi</p>
          <p className="text-xl font-black text-emerald-400">{budget} ₺</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-emerald-400" />
        </div>
      </div>

      {/* Hasta Bilgileri */}
      <div className="glass rounded-2xl p-4 border border-slate-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl">
            {patient?.gender === "kadın" ? "👩" : "👨"}
          </div>
          <div>
            <p className="text-xs text-slate-400">Hasta</p>
            <p className="text-base font-bold text-white">{loading ? "Yükleniyor..." : patient?.name ?? "—"}</p>
          </div>
        </div>
        {loading ? (
          <div className="space-y-2"><div className="h-4 shimmer rounded" /><div className="h-4 shimmer rounded w-3/4" /></div>
        ) : patient ? (
          <div className="space-y-2 text-sm">
            <InfoRow label="Yaş" value={`${patient.age} yaşında`} />
            <InfoRow label="Cinsiyet" value={patient.gender} />
            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-1">Baş Şikayet</p>
              <p className="text-xs text-slate-300 leading-relaxed italic">"{patient.chief_complaint}"</p>
            </div>
            {patient.vitals && (
              <div className="pt-2 border-t border-slate-800">
                <p className="text-xs text-slate-500 mb-1.5">Vital Bulgular</p>
                <div className="space-y-1">
                  {Object.entries(patient.vitals).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-slate-500">{k}</span>
                      <span className="text-slate-300 font-mono">{v as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Fizik Muayene Paneli */}
      <div className="glass rounded-2xl p-4 border border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <Stethoscope className="w-4 h-4 text-cyan-400" />
          <p className="text-sm font-medium text-white">Fizik Muayene</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PHYSICAL_EXAM.map((action) => (
            <button
              key={action.label}
              onClick={() => sendMessage(action.message)}
              disabled={streaming}
              className="flex flex-col items-center justify-center gap-1.5 bg-slate-800/50 hover:bg-slate-700/60 border border-slate-700 hover:border-cyan-500/50 rounded-xl p-3 text-center transition-all disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              <span className="text-xl group-hover:scale-110 transition-transform">{action.icon}</span>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-300 group-hover:text-cyan-300">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Konsültasyon Butonu */}
      <div className="glass rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={requestConsultation}
            disabled={streaming}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-rose-500/20 hover:shadow-rose-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Phone className="w-4 h-4" />
            Hocayı Ara (Konsültasyon)
          </button>
          <span className="text-[10px] text-rose-300/80 text-center">Dikkat: Fırça yiyebilirsiniz!</span>
        </div>
      </div>

      {/* Eylemler */}
      <div className="glass rounded-2xl p-4 border border-slate-800 space-y-3">
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-3 py-2 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}
        <button
          onClick={() => setShowDiagnosis(true)}
          className={`w-full flex items-center gap-2 text-sm font-medium py-2.5 px-3 rounded-xl border transition-all ${
            diagnosisSaved
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
          }`}
        >
          {diagnosisSaved ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          {diagnosisSaved ? "Tanılar Kaydedildi ✓" : "Klinik Tanı Gir"}
        </button>
        <button
          onClick={handleComplete}
          disabled={completing || !diagnosisSaved}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-40"
        >
          {completing
            ? <><Loader2 className="w-4 h-4 animate-spin" />Raporlanıyor...</>
            : <><Activity className="w-4 h-4" />Vakayı Bitir</>
          }
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      {/* Navbar */}
      <nav className="glass border-b border-slate-800 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden ml-2 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setLabOpen(true)}
              className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
            >
              <TestTube2 className="w-3.5 h-3.5" />
              Tetkik İste
            </button>
            {caseInfo && (
              <span className={`text-xs font-medium px-2 py-1 rounded-lg border ${diff.color} hidden sm:inline-flex`}>
                {diff.label}
              </span>
            )}
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobil Overlay */}
        {sidebarOpen && <div className="md:hidden absolute inset-0 bg-black/60 z-20" onClick={() => setSidebarOpen(false)} />}

        {/* Sol Panel */}
        <aside className={`
          w-72 flex-shrink-0 p-4 overflow-y-auto
          md:relative md:translate-x-0 md:block
          fixed top-0 left-0 h-full z-30 bg-slate-900
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `} style={{ top: "auto" }}>
          <SidebarContent />
        </aside>

        {/* Sağ Panel: Chat */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 m-4 ml-0 md:ml-0 glass rounded-2xl border border-slate-800">
          <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center gap-3 flex-shrink-0 bg-slate-900/50">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
              <span className="text-base">{patient?.gender === "kadın" ? "👩" : "🧑‍⚕️"}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {patient ? `${patient.name} ile Görüşme / Muayene` : "Simülasyon"}
              </p>
              <p className="text-xs text-slate-500 truncate">Sıradaki hamlenizi seçin.</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-slate-700/80 text-white rounded-br-sm inline-block"
                    : "bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm inline-block w-full"
                }`}>
                  {msg.role === "assistant" ? <RenderMessage content={msg.content} /> : msg.content}
                  
                  {msg.streaming && msg.content.length > 0 && (
                    <span className="inline-block w-1 h-3.5 bg-blue-400 ml-1 animate-pulse rounded-sm align-middle" />
                  )}
                  {msg.streaming && msg.content.length === 0 && (
                    <span className="flex gap-1 items-center h-4">
                      <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 sm:p-4 border-t border-slate-800 flex-shrink-0">
            <div className="flex items-end gap-2 bg-slate-800/50 border border-slate-700 rounded-2xl px-3 py-2 focus-within:border-blue-500/50 transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  const ta = textareaRef.current;
                  if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 100) + "px"; }
                }}
                onKeyDown={handleKeyDown}
                placeholder="Hastaya bir soru sor..."
                rows={1}
                disabled={streaming}
                className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm resize-none outline-none disabled:opacity-50 mt-1"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || streaming}
                className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 mb-0.5"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Lab Request Drawer */}
      {labOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setLabOpen(false)} />
          <div className="w-full max-w-sm bg-slate-900 h-full shadow-2xl border-l border-slate-800 relative z-10 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <div>
                <h2 className="font-bold text-white flex items-center gap-2">
                  <TestTube2 className="w-4 h-4 text-blue-400" /> Tetkik İstem Paneli
                </h2>
                <p className="text-xs text-emerald-400 font-bold mt-1">Kalan Bütçe: {budget} ₺</p>
              </div>
              <button onClick={() => setLabOpen(false)} className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {LAB_CATEGORIES.map(cat => {
                const catTests = LAB_TESTS.filter(t => t.category === cat.id);
                if (catTests.length === 0) return null;
                
                return (
                  <div key={cat.id} className="space-y-3">
                    <h3 className={`text-[10px] font-black tracking-widest uppercase border-b pb-1 ${cat.color}`} style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      {cat.label}
                    </h3>
                    <div className="space-y-2">
                      {catTests.map(test => {
                        const isSelected = selectedLabs.includes(test.id);
                        const canAfford = budget >= test.price;
                        return (
                          <button
                            key={test.id}
                            onClick={() => toggleLab(test.id, test.price)}
                            disabled={!isSelected && !canAfford}
                            className={`w-full text-left p-3 rounded-xl border transition-all flex justify-between items-center ${
                              isSelected 
                                ? "bg-blue-500/10 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                                : "bg-slate-800/50 border-slate-700 hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
                            }`}
                          >
                            <div>
                              <div className={`text-xs font-bold ${isSelected ? "text-blue-400" : "text-slate-300"}`}>{test.name}</div>
                              <div className="text-[10px] font-mono mt-0.5" style={{ color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>{test.price} ₺</div>
                            </div>
                            {isSelected && <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0"><CheckCircle2 className="w-3.5 h-3.5 text-white" /></div>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-900">
              <button
                onClick={orderLabs}
                disabled={selectedLabs.length === 0 || streaming}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              >
                <TestTube2 className="w-4 h-4" />
                Seçili Tetkikleri İste ({selectedLabs.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {showDiagnosis && (
        <DiagnosisForm onSubmit={handleDiagnosisSubmit} onClose={() => setShowDiagnosis(false)} />
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className="text-slate-300 text-xs font-medium capitalize">{value}</span>
    </div>
  );
}
