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
  Search, ShoppingBag, Trash, ChevronRight, Plus,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

// --- SABİTLER VE VERİLER ---

const EXAM_CATEGORIES = [
  { id: "basic", label: "🎯 Temel Yöntemler" },
  { id: "vitals", label: "📊 Vital & Antropometri" },
  { id: "head_neck", label: "👤 Baş ve Boyun" },
  { id: "respiratory", label: "🫁 Solunum Sistemi" },
  { id: "cardio", label: "🫀 Kardiyovasküler" },
  { id: "gastro", label: "🩺 Gastrointestinal" },
  { id: "neuro", label: "🧠 NÖROLOJİK MUAYENE" },
  { id: "locomotor", label: "🦴 Kas-İskelet Sistemi" },
  { id: "urogenital", label: "🚻 Ürogenital & Rektal" },
  { id: "derma", label: "✨ Dermatolojik" },
];

const EXAM_ITEMS = [
  // Temel Fizik Muayene Yöntemleri
  { id: "inspeksiyon", name: "İnspeksiyon", category: "basic", message: "[FİZİK MUAYENE] Hastaya genel bir inspeksiyon yapar mısın?" },
  { id: "palpasyon", name: "Palpasyon", category: "basic", message: "[FİZİK MUAYENE] Palpasyon ile muayene yapar mısın?" },
  { id: "perkusyon", name: "Perküsyon", category: "basic", message: "[FİZİK MUAYENE] Perküsyon ile muayene yapar mısın?" },
  { id: "oskultasyon", name: "Oskültasyon", category: "basic", message: "[FİZİK MUAYENE] Oskültasyon yapar mısın?" },

  // Genel Durum, Vital Bulgular ve Antropometri
  { id: "bilinc", name: "Bilinç Durumu Değerlendirmesi", category: "vitals", message: "[FİZİK MUAYENE] Hastanın bilinç durumunu değerlendirir misin?" },
  { id: "gks", name: "Glaskow Koma Skoru (GKS)", category: "vitals", message: "[FİZİK MUAYENE] Glaskow Koma Skoru (GKS) bakar mısın?" },
  { id: "tansiyon", name: "Kan Basıncı (Tansiyon)", category: "vitals", message: "[FİZİK MUAYENE] Kan basıncını (tansiyon) ölçer misin?" },
  { id: "nabiz", name: "Nabız Muayenesi (Hız/Ritim)", category: "vitals", message: "[FİZİK MUAYENE] Nabız muayenesi yapar mısın?" },
  { id: "solunum_sayisi", name: "Solunum Sayısı Ölçümü", category: "vitals", message: "[FİZİK MUAYENE] Solunum sayısını ölçer misin?" },
  { id: "ates", name: "Vücut Isısı (Ateş)", category: "vitals", message: "[FİZİK MUAYENE] Vücut ısısını (ateş) ölçer misin?" },
  { id: "spo2", name: "Oksijen Satürasyonu (SpO2)", category: "vitals", message: "[FİZİK MUAYENE] Oksijen satürasyonunu (SpO2) ölçer misin?" },
  { id: "boy_kilo", name: "Boy ve Kilo Ölçümü", category: "vitals", message: "[FİZİK MUAYENE] Boy ve kiloyu ölçer misin?" },
  { id: "postur", name: "Postür ve Yürüyüş", category: "vitals", message: "[FİZİK MUAYENE] Postür ve yürüyüşü değerlendirir misin?" },

  // Baş ve Boyun Muayenesi
  { id: "sac_deri", name: "Saç ve Saçlı Deri", category: "head_neck", message: "[FİZİK MUAYENE] Saç ve saçlı deriyi kontrol eder misin?" },
  { id: "kafatasi", name: "Kafatası Palpasyonu", category: "head_neck", message: "[FİZİK MUAYENE] Kafatası palpasyonu yapar mısın?" },
  { id: "goz_insp", name: "Göz İnspeksiyonu", category: "head_neck", message: "[FİZİK MUAYENE] Göz inspeksiyonu yapar mısın?" },
  { id: "pupilla", name: "Pupilla Işık Reaksiyonu (İRK)", category: "head_neck", message: "[FİZİK MUAYENE] Pupilla ışık reaksiyonuna (İRK) bakar mısın?" },
  { id: "goz_hareket", name: "Göz Hareketleri Muayenesi", category: "head_neck", message: "[FİZİK MUAYENE] Göz hareketlerini değerlendirir misin?" },
  { id: "otoskopi", name: "Otoskopik Muayene", category: "head_neck", message: "[FİZİK MUAYENE] Otoskopik muayene yapar mısın?" },
  { id: "rinoskopi", name: "Rinoskopik Muayene", category: "head_neck", message: "[FİZİK MUAYENE] Rinoskopik muayene yapar mısın?" },
  { id: "farenks", name: "Orofarenks ve Tonsil İnspeksiyonu", category: "head_neck", message: "[FİZİK MUAYENE] Orofarenks ve tonsilleri kontrol eder misin?" },
  { id: "tiroid", name: "Tiroid Bezi Palpasyonu", category: "head_neck", message: "[FİZİK MUAYENE] Tiroid bezi palpasyonu yapar mısın?" },
  { id: "jvd", name: "Boyun Venöz Dolgunluğu (JVD)", category: "head_neck", message: "[FİZİK MUAYENE] Boyun venöz dolgunluğunu (JVD) kontrol eder misin?" },
  { id: "lap_boyun", name: "Servikal/Submandibüler LAP", category: "head_neck", message: "[FİZİK MUAYENE] Boyun lenf nodlarını palpe eder misin?" },
  { id: "karotis", name: "Karotis Arter Muayenesi", category: "head_neck", message: "[FİZİK MUAYENE] Karotis arter muayenesi yapar mısın?" },

  // Solunum Sistemi Muayenesi
  { id: "gogus_insp", name: "Göğüs Kafesi İnspeksiyonu", category: "respiratory", message: "[FİZİK MUAYENE] Göğüs kafesi inspeksiyonu yapar mısın?" },
  { id: "solunum_efor", name: "Solunum Eforu", category: "respiratory", message: "[FİZİK MUAYENE] Solunum eforunu değerlendirir misin?" },
  { id: "gogus_eksp", name: "Göğüs Ekspansiyonu", category: "respiratory", message: "[FİZİK MUAYENE] Göğüs ekspansiyonuna bakar mısın?" },
  { id: "fremitus", name: "Taktil Fremitus Palpasyonu", category: "respiratory", message: "[FİZİK MUAYENE] Taktil fremitus muayenesi yapar mısın?" },
  { id: "akciger_perk", name: "Akciğer Perküsyonu", category: "respiratory", message: "[FİZİK MUAYENE] Akciğer perküsyonu yapar mısın?" },
  { id: "akciger_osk", name: "Akciğer Oskültasyonu", category: "respiratory", message: "[FİZİK MUAYENE] Akciğer oskültasyonu yapar mısın? (Ral, ronküs, wheezing?)" },

  // Kardiyovasküler Sistem Muayenesi
  { id: "prekordiyal", name: "Prekordiyal İnspeksiyon", category: "cardio", message: "[FİZİK MUAYENE] Prekordiyal inspeksiyon yapar mısın?" },
  { id: "pmi", name: "Apikal Vuru (PMI) Palpasyonu", category: "cardio", message: "[FİZİK MUAYENE] Apikal vuru (PMI) palpasyonu yapar mısın?" },
  { id: "trill", name: "Trill Palpasyonu", category: "cardio", message: "[FİZİK MUAYENE] Kalp odaklarında trill palpasyonu yapar mısın?" },
  { id: "kalp_osk", name: "Kalp Odakları Oskültasyonu", category: "cardio", message: "[FİZİK MUAYENE] Kalp odaklarını (Aort, Pulmoner, Triküspid, Mitral) oskülte eder misin? (Üfürüm? S1-S2?)" },
  { id: "periferik_nabiz", name: "Periferik Nabız Palpasyonu", category: "cardio", message: "[FİZİK MUAYENE] Periferik nabızları (radyal, femoral, dorsalis pedis vb.) kontrol eder misin?" },
  { id: "kapiller_dolum", name: "Kapiller Dolum Zamanı", category: "cardio", message: "[FİZİK MUAYENE] Kapiller dolum zamanını değerlendirir misin?" },
  { id: "edema", name: "Pitting Ödem Muayenesi", category: "cardio", message: "[FİZİK MUAYENE] Alt ekstremitelerde ödem kontrolü yapar mısın?" },

  // Gastrointestinal Sistem (Batın) Muayenesi
  { id: "batin_insp", name: "Batın İnspeksiyonu", category: "gastro", message: "[FİZİK MUAYENE] Batın inspeksiyonu yapar mısın?" },
  { id: "batin_osk", name: "Batın Oskültasyonu", category: "gastro", message: "[FİZİK MUAYENE] Batın oskültasyonu yapar mısın? (Bağırsak sesleri?)" },
  { id: "batin_perk", name: "Batın Perküsyonu", category: "gastro", message: "[FİZİK MUAYENE] Batın perküsyonu yapar mısın?" },
  { id: "karaciger_perk", name: "Karaciğer Matite Sınırı", category: "gastro", message: "[FİZİK MUAYENE] Karaciğer matite sınırını ölçer misin?" },
  { id: "traube", name: "Traube Alanı Perküsyonu", category: "gastro", message: "[FİZİK MUAYENE] Traube alanı perküsyonu yapar mısın?" },
  { id: "batin_palp_yuzeyel", name: "Yüzeyel Batın Palpasyonu", category: "gastro", message: "[FİZİK MUAYENE] Yüzeyel batın palpasyonu yapar mısın? (Defans? Rijidite?)" },
  { id: "batin_palp_derin", name: "Derin Batın Palpasyonu", category: "gastro", message: "[FİZİK MUAYENE] Derin batın palpasyonu yapar mısın? (Hassasiyet? Kitle?)" },
  { id: "kc_palp", name: "Karaciğer Palpasyonu", category: "gastro", message: "[FİZİK MUAYENE] Karaciğer palpasyonu yapar mısın?" },
  { id: "dalak_palp", name: "Dalak Palpasyonu", category: "gastro", message: "[FİZİK MUAYENE] Dalak palpasyonu yapar mısın?" },
  { id: "bobrek_palp", name: "Bimanuel Böbrek Palpasyonu", category: "gastro", message: "[FİZİK MUAYENE] Bimanuel böbrek palpasyonu yapar mısın?" },
  { id: "rebound", name: "Rebound Hassasiyeti Testi", category: "gastro", message: "[FİZİK MUAYENE] Batında rebound kontrolü yapar mısın?" },
  { id: "murphy", name: "Murphy Bulgusu Testi", category: "gastro", message: "[FİZİK MUAYENE] Murphy bulgusuna bakar mısın?" },
  { id: "psoas_obturator", name: "Psoas/Obturator Testi", category: "gastro", message: "[FİZİK MUAYENE] Psoas ve Obturator testlerini yapar mısın? (Akut batın/apandisit?)" },
  { id: "asit_muayenesi", name: "Asit Muayenesi (Matite/Dalga)", category: "gastro", message: "[FİZİK MUAYENE] Batında asit muayenesi yapar mısın?" },

  // Nörolojik Muayene
  { id: "mental_durum", name: "Mental Durum", category: "neuro", message: "[FİZİK MUAYENE] Mental durum değerlendirmesi yapar mısın?" },
  { id: "kran_sinir", name: "Kraniyal Sinir (I-XII)", category: "neuro", message: "[FİZİK MUAYENE] Tüm kraniyal sinir muayenelerini yapar mısın?" },
  { id: "kas_gucu", name: "Kas Gücü Değerlendirmesi", category: "neuro", message: "[FİZİK MUAYENE] Kas gücü değerlendirmesi yapar mısın?" },
  { id: "kas_tonusu", name: "Kas Tonusu ve Trofisi", category: "neuro", message: "[FİZİK MUAYENE] Kas tonusu ve trofisini muayene eder misin?" },
  { id: "duyu_yuzeyel", name: "Yüzeyel Duyu Muayenesi", category: "neuro", message: "[FİZİK MUAYENE] Yüzeyel duyu (dokunma, ağrı, ısı) kontrolü yapar mısın?" },
  { id: "duyu_derin", name: "Derin Duyu (Propriyosepsiyon)", category: "neuro", message: "[FİZİK MUAYENE] Derin duyu (propriyosepsiyon, vibrasyon) muayenesi yapar mısın?" },
  { id: "dtr", name: "Derin Tendon Refleksleri (DTR)", category: "neuro", message: "[FİZİK MUAYENE] Derin tendon reflekslerine (DTR) bakar mısın?" },
  { id: "pat_refleks", name: "Babinski/Hoffman/Klonus", category: "neuro", message: "[FİZİK MUAYENE] Patolojik refleksleri (Babinski, Hoffman vb.) kontrol eder misin?" },
  { id: "serebellar", name: "Serebellar Testler (Parmak-Burun vb.)", category: "neuro", message: "[FİZİK MUAYENE] Serebellar sistem muayenesi yapar mısın? (Parmak-burun, diz-topuk, disdiadokokinezi?)" },
  { id: "denge_yuruyus", name: "Romberg ve Tandem Testi", category: "neuro", message: "[FİZİK MUAYENE] Romberg ve tandem yürüyüşü testi yapar mısın?" },
  { id: "menenjismus", name: "Ense Sertliği/Kernig/Brudzinski", category: "neuro", message: "[FİZİK MUAYENE] Menenjismus bulgularına bakar mısın?" },

  // Kas-İskelet Sistemi (Lokomotor) Muayenesi
  { id: "eklem_insp_palp", name: "Eklem İnspeksiyon/Palpasyon", category: "locomotor", message: "[FİZİK MUAYENE] Eklemleri inspeksiyon ve palpasyonla değerlendirir misin?" },
  { id: "eklem_rom", name: "Eklem ROM (Aktif/Pasif)", category: "locomotor", message: "[FİZİK MUAYENE] Eklem hareket açıklığını (ROM) kontrol eder misin?" },
  { id: "omurga", name: "Omurga ve Skolyoz Muayenesi", category: "locomotor", message: "[FİZİK MUAYENE] Omurga ve skolyoz değerlendirmesi yapar mısın?" },
  { id: "lasegue", name: "Düz Bacak Kaldırma (Lasegue)", category: "locomotor", message: "[FİZİK MUAYENE] Lasegue (düz bacak kaldırma) testi yapar mısın?" },
  { id: "provokasyon", name: "Spesifik Provokasyon Testleri", category: "locomotor", message: "[FİZİK MUAYENE] Eklem bazlı provokasyon testlerini (Lachman, McMurray, Phalen vb.) yapar mısın?" },

  // Ürogenital ve Anorektal Muayene
  { id: "kvah", name: "KVAH Muayenesi", category: "urogenital", message: "[FİZİK MUAYENE] Kostovertebral açı hassasiyetine (KVAH) bakar mısın?" },
  { id: "genital", name: "Dış Genitalya Muayenesi", category: "urogenital", message: "[FİZİK MUAYENE] Dış genitalya inspeksiyon ve palpasyonu yapar mısın?" },
  { id: "herni", name: "İnguinal Herni Muayenesi", category: "urogenital", message: "[FİZİK MUAYENE] İnguinal herni kontrolü yapar mısın?" },
  { id: "tuse_rektal", name: "Dijital Rektal Muayene (TR)", category: "urogenital", message: "[FİZİK MUAYENE] Dijital rektal muayene (tuşe rektal) yapar mısın?" },
  { id: "pelvik_spekulum", name: "Pelvik ve Spekulum Muayenesi", category: "urogenital", message: "[FİZİK MUAYENE] Pelvik ve spekulum muayenesi yapar mısın?" },

  // Dermatolojik Muayene
  { id: "cilt_mukoza", name: "Cilt ve Mukoza İnspeksiyonu", category: "derma", message: "[FİZİK MUAYENE] Cilt ve mukoza inspeksiyonu yapar mısın? (Döküntü? Lezyon?)" },
  { id: "turgor_tonus", name: "Deri Turgor ve Tonusu", category: "derma", message: "[FİZİK MUAYENE] Deri turgor ve tonusunu değerlendirir misin?" },
  { id: "tirnak", name: "Tırnak İnspeksiyonu", category: "derma", message: "[FİZİK MUAYENE] Tırnak inspeksiyonu yapar mısın?" },
];

const LAB_CATEGORIES = [
  { id: "lab", label: "🧪 LABORATUVAR (KAN/İDRAR)", color: "text-amber-500" },
  { id: "radiology", label: "☢️ RADYOLOJİ VE GÖRÜNTÜLEME", color: "text-cyan-500" },
  { id: "cardio", label: "🫀 KARDİYOLOJİK VE PULMONER", color: "text-rose-500" },
  { id: "neuro", label: "🧠 NÖROLOJİK TESTLER", color: "text-purple-500" },
  { id: "endo", label: "🔬 ENDOSKOPİK VE GİRİŞİMSEL", color: "text-emerald-500" },
  { id: "nuclear", label: "☢️ NÜKLEER TIP", color: "text-orange-500" },
  { id: "patho", label: "🧬 PATOLOJİ VE GENETİK", color: "text-indigo-500" },
];

const LAB_TESTS = [
  // LABORATUVAR
  { id: "hemogram", name: "Tam Kan Sayımı (Hemogram)", price: 50, category: "lab" },
  { id: "perf_yayma", name: "Periferik Yayma", price: 60, category: "lab" },
  { id: "biyokimya", name: "Rutin Biyokimya Paneli", price: 120, category: "lab" },
  { id: "koagulasyon", name: "Koagülasyon Paneli (PT, aPTT, INR)", price: 100, category: "lab" },
  { id: "kardiyak_belirtec", name: "Kardiyak Belirteçler (Troponin, NT-proBNP)", price: 180, category: "lab" },
  { id: "tiroid_paneli", name: "Tiroid Paneli (TSH, sT3, sT4)", price: 120, category: "lab" },
  { id: "akg", name: "Arter Kan Gazı (AKG)", price: 110, category: "lab" },
  { id: "tit", name: "Tam İdrar Tetkiki (TİT)", price: 40, category: "lab" },
  { id: "hormon_paneli", name: "Hormon Paneli (FSH, LH, Kortizol vb.)", price: 200, category: "lab" },
  { id: "tumor_belirtec", name: "Tümör Belirteçleri (PSA, CEA, CA-125)", price: 250, category: "lab" },
  { id: "romatoloji_paneli", name: "Romatoloji Paneli (ANA, RF, Anti-CCP)", price: 220, category: "lab" },
  { id: "vitamin_mineral", name: "Vitamin ve Mineral Paneli (B12, D Vit, Demir)", price: 150, category: "lab" },
  { id: "seroloji_hep", name: "Seroloji ve Hepatit Paneli", price: 180, category: "lab" },
  { id: "kulturler", name: "Kültürler (Kan, İdrar, Boğaz)", price: 160, category: "lab" },
  { id: "ggk", name: "Gaitada Gizli Kan (GGK)", price: 50, category: "lab" },
  { id: "bos_analizi", name: "Beyin Omurilik Sıvısı (BOS) Analizi", price: 450, category: "lab" },
  { id: "sivi_analizi", name: "Vücut Sıvısı Analizi (Plevral/Asit)", price: 300, category: "lab" },
  { id: "toksikoloji", name: "Toksikoloji Taraması", price: 400, category: "lab" },

  // RADYOLOJİ
  { id: "pa_ac", name: "PA / AP Akciğer Grafisi", price: 100, category: "radiology" },
  { id: "adbg", name: "Ayakta Direkt Batın Grafisi (ADBG)", price: 100, category: "radiology" },
  { id: "iskelet_grafi", name: "İskelet ve Eklem Grafileri", price: 90, category: "radiology" },
  { id: "mamografi", name: "Mamografi", price: 250, category: "radiology" },
  { id: "dexa", name: "Kemik Dansitometrisi (DEXA)", price: 200, category: "radiology" },
  { id: "floroskopi", name: "Floroskopi (Kontrastlı Grafiler)", price: 350, category: "radiology" },
  { id: "usg_batin", name: "Batın Ultrasonografisi (USG)", price: 300, category: "radiology" },
  { id: "usg_yuzeyel", name: "Yüzeyel / Tiroid / Meme USG", price: 250, category: "radiology" },
  { id: "usg_obstetrik", name: "Renal / Pelvik / Obstetrik USG", price: 280, category: "radiology" },
  { id: "doppler_usg", name: "Renkli Doppler USG", price: 400, category: "radiology" },
  { id: "usg_invaziv", name: "Transvajinal / Transrektal USG", price: 350, category: "radiology" },
  { id: "efast_pocus", name: "E-FAST / POCUS", price: 200, category: "radiology" },
  { id: "bt_kontrastsiz", name: "Kontrastsız BT (Kranial/Batın/Toraks)", price: 500, category: "radiology" },
  { id: "bt_kontrastli", name: "Kontrastlı BT (Tüm Batın/Toraks/Boyun)", price: 700, category: "radiology" },
  { id: "bt_anjiyo", name: "BT Anjiyografi", price: 850, category: "radiology" },
  { id: "bt_perfuzyon", name: "BT Perfüzyon", price: 900, category: "radiology" },
  { id: "bt_koroner", name: "Koroner BT Anjiyografi (Sanal Anjiyo)", price: 1000, category: "radiology" },
  { id: "mr_standart", name: "Kranial / Spinal MR", price: 850, category: "radiology" },
  { id: "mr_tum_vucut", name: "Tüm Vücut MR", price: 2500, category: "radiology" },
  { id: "mr_difuzyon", name: "Difüzyon MR (DWI)", price: 600, category: "radiology" },
  { id: "mr_anji_mrcp", name: "MR Anjiyografi / MRCP", price: 950, category: "radiology" },
  { id: "fmri", name: "Fonksiyonel MR (fMRI)", price: 1200, category: "radiology" },
  { id: "mr_spektroskopi", name: "MR Spektroskopi", price: 1100, category: "radiology" },

  // KARDİYO & PULMONER
  { id: "ekg", name: "Elektrokardiyografi (EKG)", price: 60, category: "cardio" },
  { id: "tte", name: "Transtorasik Ekokardiyografi (TTE)", price: 450, category: "cardio" },
  { id: "tee", name: "Transözofageal Ekokardiyografi (TEE)", price: 800, category: "cardio" },
  { id: "efor_testi", name: "Efor Testi (Treadmill)", price: 300, category: "cardio" },
  { id: "holter_ritim", name: "Ritim Holter (24-72 Saat)", price: 250, category: "cardio" },
  { id: "holter_tansiyon", name: "Tansiyon Holter", price: 200, category: "cardio" },
  { id: "tilt_table", name: "Tilt Table Testi", price: 400, category: "cardio" },
  { id: "koroner_anji_inv", name: "Koroner Anjiyografi (İnvaziv)", price: 3000, category: "cardio" },
  { id: "sft", name: "Solunum Fonksiyon Testleri (SFT)", price: 150, category: "cardio" },
  { id: "dlco", name: "Karbonmonoksit Difüzyon Kapasitesi (DLCO)", price: 250, category: "cardio" },
  { id: "uyku_testi", name: "Uyku Apnesi Testi (Polisomnografi)", price: 1200, category: "cardio" },

  // NÖROLOJİK
  { id: "eeg", name: "Elektroensefalografi (EEG)", price: 350, category: "neuro" },
  { id: "emg", name: "Elektromiyografi (EMG)", price: 500, category: "neuro" },
  { id: "vep_baep_sep", name: "Uyarılmış Potansiyeller (VEP, BAEP, SEP)", price: 450, category: "neuro" },

  // ENDOSKOPİK
  { id: "ust_gis_endo", name: "Üst GİS Endoskopisi", price: 600, category: "endo" },
  { id: "kolonoskopi", name: "Kolonoskopi / Sigmoidoskopi", price: 800, category: "endo" },
  { id: "ercp", name: "ERCP", price: 2500, category: "endo" },
  { id: "eus", name: "Endoskopik Ultrasonografi (EUS)", price: 1500, category: "endo" },
  { id: "kapsul_endo", name: "Kapsül Endoskopi", price: 2000, category: "endo" },
  { id: "bronskopi_ebus", name: "Bronkoskopi / EBUS", price: 1200, category: "endo" },
  { id: "sistoskopi", name: "Sistoskopi", price: 700, category: "endo" },
  { id: "laparoskopi_tanisal", name: "Laparoskopi (Tanısal)", price: 2500, category: "endo" },
  { id: "artroskopi_tanisal", name: "Artroskopi (Tanısal)", price: 2000, category: "endo" },

  // NÜKLEER TIP
  { id: "pet_ct", name: "PET-CT", price: 3500, category: "nuclear" },
  { id: "sint_miyokard", name: "Miyokard Perfüzyon Sintigrafisi", price: 900, category: "nuclear" },
  { id: "sint_kemik", name: "Tüm Vücut Kemik Sintigrafisi", price: 800, category: "nuclear" },
  { id: "sint_tiroid", name: "Tiroid / Paratiroid Sintigrafisi", price: 400, category: "nuclear" },
  { id: "sint_renal", name: "Renal Sintigrafi (DMSA/DTPA)", price: 600, category: "nuclear" },
  { id: "vq_sintigrafi", name: "Ventilasyon / Perfüzyon (V/Q) Sintigrafisi", price: 1000, category: "nuclear" },
  { id: "sint_ozel", name: "Galyum / Oktreotid Sintigrafisi", price: 1500, category: "nuclear" },

  // PATOLOJİ
  { id: "iiab", name: "İnce İğne Aspirasyon Biyopsisi (İİAB)", price: 300, category: "patho" },
  { id: "trucut", name: "Tru-cut (Kor) Biyopsi", price: 500, category: "patho" },
  { id: "biyopsi_ozel", name: "Eksizyonel / İnsizyonel Biyopsi", price: 800, category: "patho" },
  { id: "smear", name: "Pap Smear Testi", price: 120, category: "patho" },
  { id: "ihk", name: "İmmünhistokimya (İHK) İncelemesi", price: 400, category: "patho" },
  { id: "genetik_karyotip", name: "Kromozom Analizi (Karyotipleme)", price: 1500, category: "patho" },
  { id: "pcr_testleri", name: "PCR Testleri", price: 350, category: "patho" },
  { id: "ngs_analizi", name: "Yeni Nesil Dizileme (NGS)", price: 5000, category: "patho" },
  { id: "fish_analizi", name: "FISH Analizi", price: 1200, category: "patho" },
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
            <div key={i} className="my-3 border shadow-xl rounded-[1.5rem] overflow-hidden font-mono text-[11px] sm:text-xs w-full transition-all" 
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              {/* LIS Header */}
              <div className="px-4 py-3 border-b flex justify-between items-center"
                style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                <div className="flex items-center gap-2">
                  <TestTube2 className="w-4 h-4" style={{ color: "var(--primary)" }} />
                  <span className="font-black uppercase tracking-tight" style={{ color: "var(--text-navy)" }}>KlinikIQ LBS (Laboratuvar Bilgi Sistemi)</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40">✓ ONAYLANDI</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead style={{ background: "var(--text-navy)", color: "var(--bg)" }}>
                    <tr>
                      {headers.map(h => <th key={h} className="px-4 py-3 font-bold uppercase tracking-wider">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ color: "var(--text)", borderColor: "var(--border)" }}>
                    {rows.map((row, idx) => {
                      const isHigh = row.some(cell => cell.includes('(H)') || cell.includes('Yüksek') || cell.includes('High'));
                      const isLow = row.some(cell => cell.includes('(L)') || cell.includes('Düşük') || cell.includes('Low'));
                      return (
                        <tr key={idx} className={`transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${isHigh ? 'bg-red-500/10' : isLow ? 'bg-blue-500/10' : ''}`}>
                          {row.map((cell, cidx) => {
                            const isValueCell = cidx === 1; // Assuming 2nd column is the Value
                            return (
                              <td key={cidx} className="px-4 py-2.5">
                                <span className={isValueCell && isHigh ? "text-red-600 dark:text-red-400 font-black" : isValueCell && isLow ? "text-blue-600 dark:text-blue-400 font-black" : "font-medium"}>
                                  {cell.replace(/\([HL]\)/gi, '')}
                                </span>
                                {isHigh && isValueCell && <span className="ml-2 text-[9px] font-black uppercase tracking-tighter text-red-600 dark:text-red-400 opacity-80">( Yüksek )</span>}
                                {isLow && isValueCell && <span className="ml-2 text-[9px] font-black uppercase tracking-tighter text-blue-600 dark:text-blue-400 opacity-80">( Düşük )</span>}
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
  const [examOpen, setExamOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("lab");
  const [selectedExamCategory, setSelectedExamCategory] = useState("basic");
  const [searchQuery, setSearchQuery] = useState("");
  const [examSearchQuery, setExamSearchQuery] = useState("");
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
      
      // Mesaj geçmişini yükle
      if (res.data.messages) {
        setMessages(res.data.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
          streaming: false
        })));
      }

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
  const SidebarContent = () => {
    const vitalsMapper: Record<string, string> = {
      blood_pressure: "Tansiyon",
      heart_rate: "Nabız",
      temperature: "Ateş",
      respiratory_rate: "Solunum",
      spo2: "SpO2",
      glucose: "Şeker",
    };

    return (
      <div className="flex flex-col gap-4 h-full overflow-y-auto pb-4">
        
        {/* SGK Bütçe Sayacı */}
        <div className="glass rounded-2xl p-4 border flex items-center justify-between shadow-sm transition-all" 
          style={{ background: "var(--primary-light)", borderColor: "var(--primary-light)" }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: "var(--primary)" }}>SGK BÜTÇESİ</p>
            <p className="text-xl font-black" style={{ color: "var(--primary)" }}>{budget} ₺</p>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-inner" style={{ background: "white" }}>
            <ShieldAlert className="w-5 h-5" style={{ color: "var(--primary)" }} />
          </div>
        </div>

        {/* Hasta Bilgileri */}
        <div className="glass rounded-2xl p-4 border transition-all shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm"
              style={{ background: "var(--surface-2)" }}>
              {patient?.gender === "kadın" ? "👩" : "👨"}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider opacity-50" style={{ color: "var(--text-muted)" }}>Hasta</p>
              <p className="text-base font-black" style={{ color: "var(--text-navy)" }}>{loading ? "Yükleniyor..." : patient?.name ?? "—"}</p>
            </div>
          </div>
          {loading ? (
            <div className="space-y-2"><div className="h-4 shimmer rounded" /><div className="h-4 shimmer rounded w-3/4" /></div>
          ) : patient ? (
            <div className="space-y-2 text-sm">
              <InfoRow label="Yaş" value={`${patient.age} Yaşında`} />
              <InfoRow label="Cinsiyet" value={patient.gender} />
              <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-[10px] font-black uppercase tracking-wider opacity-50 mb-1" style={{ color: "var(--text-muted)" }}>Şikayet</p>
                <p className="text-xs leading-relaxed font-semibold italic" style={{ color: "var(--text-navy)" }}>&quot;{patient.chief_complaint}&quot;</p>
              </div>
              {patient.vitals && (
                <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-50 mb-2" style={{ color: "var(--text-muted)" }}>Vital Bulgular</p>
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                    {Object.entries(patient.vitals).map(([k, v]) => (
                      <div key={k} className="flex flex-col">
                        <span className="text-[10px] font-bold opacity-60" style={{ color: "var(--text-muted)" }}>{vitalsMapper[k] || k}</span>
                        <span className="font-mono font-black text-xs" style={{ color: "var(--primary)" }}>{v as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Konsültasyon Butonu */}
        <div className="glass rounded-2xl p-4 border transition-all shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={requestConsultation}
              disabled={streaming}
              className="w-full flex items-center justify-center gap-2 text-white font-black py-3 rounded-xl transition-all shadow-lg hover:shadow-rose-500/20 hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)" }}
            >
              <div className="absolute inset-0 bg-white/10 w-0 group-hover:w-full transition-all duration-300" />
              {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Phone className="w-5 h-5 animate-pulse" />}
              {streaming ? "İşleniyor..." : "Hocaya Danış (Konsültasyon)"}
            </button>
            <span className="text-[10px] font-black uppercase tracking-tighter" style={{ color: "var(--text-red)" }}>
              Dikkat: Hocadan fırça yiyebilirsiniz!
            </span>
          </div>
        </div>

        {/* Eylemler */}
        <div className="glass rounded-2xl p-4 border transition-all shadow-sm space-y-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border"
              style={{ background: "var(--error-light)", color: "var(--danger)", borderColor: "var(--error-light)" }}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}
          <button
            onClick={() => setShowDiagnosis(true)}
            className={`w-full flex items-center gap-2 text-sm font-bold py-2.5 px-3 rounded-xl border transition-all shadow-sm ${
              diagnosisSaved
                ? "shadow-inner"
                : "hover:scale-[1.02] active:scale-[0.98]"
            }`}
            style={diagnosisSaved 
              ? { background: "var(--primary-light)", borderColor: "var(--primary)", color: "var(--primary)" }
              : { background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-navy)" }}
          >
            {diagnosisSaved ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {diagnosisSaved ? "Tanılar Kaydedildi ✓" : "Klinik Tanı Gir"}
          </button>
          <button
            onClick={handleComplete}
            disabled={completing || !diagnosisSaved}
            className="w-full flex items-center justify-center gap-2 text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-lg disabled:opacity-40 disabled:scale-100 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "var(--text-navy)" }}
          >
            {completing
              ? <><Loader2 className="w-4 h-4 animate-spin" />Raporlanıyor...</>
              : <><Activity className="w-4 h-4" />Vakayı Bitir</>
            }
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden relative transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Navbar */}
      <nav className="glass border-b flex-shrink-0 transition-all font-sans" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/dashboard")} 
              className="flex items-center gap-2.5 text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
              style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">KlinikIQ UI</span>
            </button>
            <div className="w-px h-4 bg-current opacity-10 hidden sm:block mx-1" />
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-1.5 rounded-lg transition-colors shadow-sm"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <button
              onClick={() => setLabOpen(true)}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md hover:scale-[1.05] active:scale-95 border relative overflow-hidden"
              style={{ background: "var(--primary)", borderColor: "var(--primary-h)", color: "white" }}
            >
               <div className="absolute inset-0 bg-white/10 w-0 group-hover:w-full transition-all duration-300" />
              <TestTube2 className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">Tetkik İste</span>
            </button>
            <button
              onClick={() => setExamOpen(true)}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md hover:scale-[1.05] active:scale-95 border relative overflow-hidden"
              style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-navy)" }}
            >
               <div className="absolute inset-0 bg-black/5 w-0 group-hover:w-full transition-all duration-300" />
              <Stethoscope className="w-3.5 h-3.5 relative z-10" style={{ color: "var(--primary)" }} />
              <span className="relative z-10">Fizik Muayene</span>
            </button>
            {caseInfo && (
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border shadow-sm ${diff.color} hidden sm:inline-flex`}>
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
          fixed top-0 left-0 h-full z-30 transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `} style={{ background: "var(--bg)", top: "auto" }}>
          <SidebarContent />
        </aside>

        {/* Sağ Panel: Chat */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 m-4 ml-0 md:ml-0 glass rounded-2xl border transition-all shadow-xl" 
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="p-3 sm:p-5 border-b flex items-center gap-4 flex-shrink-0 transition-all shadow-sm" 
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: "var(--primary-light)" }}>
              <span className="text-xl">{patient?.gender === "kadın" ? "👩" : "🧑‍⚕️"}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black tracking-tight truncate" style={{ color: "var(--text-navy)" }}>
                {patient ? `${patient.name} ile Görüşme / Muayene` : "Simülasyon"}
              </p>
              <div className="flex items-center gap-1.5 opacity-60">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Sıradaki hamlenizi seçin.</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all shadow-sm ${
                  msg.role === "user"
                    ? "rounded-tr-sm"
                    : "rounded-tl-sm border"
                }`} style={
                  msg.role === "user" 
                    ? { background: "var(--primary-light)", color: "var(--primary)", borderColor: "var(--primary-light)" }
                    : { background: "var(--surface)", color: "var(--text)", borderColor: "var(--border)" }
                }>
                  <div className="flex items-center gap-2 mb-1 opacity-50 text-[10px] font-bold uppercase tracking-wider">
                    {msg.role === "user" ? "Siz" : "KlinikIQ AI"}
                  </div>
                  {msg.role === "assistant" ? <RenderMessage content={msg.content} /> : msg.content}
                  
                  {msg.streaming && msg.content.length > 0 && (
                    <span className="inline-block w-1.5 h-3.5 ml-1 animate-pulse rounded-sm align-middle" style={{ background: "var(--primary)" }} />
                  )}
                  {msg.streaming && msg.content.length === 0 && (
                    <span className="flex gap-1 items-center h-4 py-2">
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "var(--primary)" }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.2s]" style={{ background: "var(--primary)" }} />
                      <span className="w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:0.4s]" style={{ background: "var(--primary)" }} />
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 sm:p-4 border-t flex-shrink-0 transition-all" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
            <div className="flex items-end gap-2 rounded-2xl px-3 py-2 transition-all shadow-inner border group focus-within:ring-2 focus-within:ring-offset-2"
              style={{ background: "var(--bg)", borderColor: "var(--border)", "--tw-ring-color": "var(--primary-light)" } as any}>
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
                className="flex-1 bg-transparent placeholder-slate-500 text-sm resize-none outline-none disabled:opacity-50 mt-1"
                style={{ color: "var(--text)" }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || streaming}
                className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 mb-0.5 shadow-md"
                style={{ background: "var(--primary)", color: "white" }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Professional Lab Request Panel (HBYS Style) */}
      {labOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity" onClick={() => setLabOpen(false)} />
          
          <div className="relative w-full max-w-6xl h-[85vh] shadow-2xl rounded-[2.5rem] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border transition-all"
            style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            
            {/* Header */}
            <div className="h-20 px-8 border-b flex items-center justify-between gap-6 transition-all" 
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: "var(--primary-light)" }}>
                  <TestTube2 className="w-6 h-6" style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight" style={{ color: "var(--text)" }}>Laboratuvar İstem Paneli</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: "var(--text-muted)" }}>KLİNİK SİSTEMİ ÇEVRİMİÇİ</p>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex-1 max-w-md relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 group-focus-within:opacity-100 transition-opacity" style={{ color: "var(--text)" }} />
                <input 
                  type="text"
                  placeholder="Tetkik adı veya kategori ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-12 pr-4 rounded-xl border text-sm transition-all outline-none focus:ring-2"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)", "--tw-ring-color": "var(--primary-light)" } as any}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden lg:flex flex-col items-end">
                  <p className="text-[10px] font-black uppercase tracking-tighter opacity-50" style={{ color: "var(--text-muted)" }}>KALAN BÜTÇE</p>
                  <p className="text-lg font-black" style={{ color: "var(--primary)" }}>{budget} ₺</p>
                </div>
                <button onClick={() => setLabOpen(false)} 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:rotate-90 hover:scale-110 active:scale-95 border shadow-sm"
                  style={{ background: "var(--surface-2)", color: "var(--text-muted)", borderColor: "var(--border)" }}>
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Left Sidebar: Categories */}
              <aside className="w-64 border-r overflow-y-auto p-4 space-y-2 transition-all" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4 px-2" style={{ color: "var(--text-muted)" }}>Kategoriler</p>
                {LAB_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${selectedCategory === cat.id ? "shadow-md scale-[1.02]" : "hover:bg-black/5 opacity-60 hover:opacity-100"}`}
                    style={selectedCategory === cat.id ? { background: "var(--bg)", color: "var(--primary)", borderColor: "var(--border)", borderWidth: "1px" } : { color: "var(--text-muted)" }}
                  >
                    <span className="truncate">{cat.label.split(" (")[0]}</span>
                    {selectedCategory === cat.id && <ChevronRight className="w-4 h-4" />}
                  </button>
                ))}
              </aside>

              {/* Main Area: Tests Grid */}
              <main className="flex-1 overflow-y-auto p-8" style={{ background: "var(--bg)" }}>
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {LAB_TESTS
                    .filter(t => (searchQuery ? t.name.toLowerCase().includes(searchQuery.toLowerCase()) : t.category === selectedCategory))
                    .map(test => {
                      const isSelected = selectedLabs.includes(test.id);
                      const canAfford = budget >= test.price;
                      return (
                        <button
                          key={test.id}
                          onClick={() => toggleLab(test.id, test.price)}
                          disabled={!isSelected && !canAfford}
                          className={`group text-left p-5 rounded-3xl border transition-all flex flex-col justify-between h-32 relative ${
                            isSelected ? "shadow-lg scale-[1.02]" : "hover:shadow-md hover:-translate-y-1 active:scale-95 disabled:opacity-30 disabled:grayscale"
                          }`}
                          style={{ 
                            background: isSelected ? "var(--primary-light)" : "var(--surface)", 
                            borderColor: isSelected ? "var(--primary)" : "var(--border)"
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-black leading-tight line-clamp-2 pr-6" style={{ color: isSelected ? "var(--primary)" : "var(--text)" }}>
                              {test.name}
                            </span>
                            {isSelected && <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: "var(--primary)" }} />}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold opacity-60" style={{ color: isSelected ? "var(--primary)" : "var(--text-muted)" }}>{test.price} ₺</span>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isSelected ? "bg-white text-emerald-600 shadow-inner" : "bg-black/5"}`}>
                              <Plus className="w-4 h-4" />
                            </div>
                          </div>
                        </button>
                      );
                    })
                  }
                  {LAB_TESTS.filter(t => (searchQuery ? t.name.toLowerCase().includes(searchQuery.toLowerCase()) : t.category === selectedCategory)).length === 0 && (
                    <div className="col-span-full py-20 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 opacity-20" />
                      </div>
                      <p className="text-sm font-bold opacity-40">Aradığınız kriterlere uygun tetkik bulunamadı.</p>
                    </div>
                  )}
                </div>
              </main>

              {/* Right Sidebar: Cart */}
              <aside className="w-80 border-l flex flex-col transition-all" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" style={{ color: "var(--primary)" }} />
                    <h3 className="font-bold uppercase tracking-widest text-[10px]" style={{ color: "var(--text-muted)" }}>İstem Sepeti</h3>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selectedLabs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-center p-8">
                      <div className="w-12 h-12 border-2 border-dashed border-current rounded-2xl mb-4 flex items-center justify-center">
                        <Plus className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold">Henüz tetkik seçilmedi.</p>
                    </div>
                  ) : (
                    selectedLabs.map(id => {
                      const test = LAB_TESTS.find(t => t.id === id);
                      if (!test) return null;
                      return (
                        <div key={id} className="flex items-center justify-between p-3 rounded-2xl border bg-white shadow-sm group animate-in slide-in-from-right-4 duration-300">
                          <div className="min-w-0 pr-2">
                            <p className="text-[11px] font-bold truncate leading-tight" style={{ color: "var(--text)" }}>{test.name}</p>
                            <p className="text-[10px] font-black opacity-50" style={{ color: "var(--primary)" }}>{test.price} ₺</p>
                          </div>
                          <button onClick={() => toggleLab(test.id, test.price)} className="w-7 h-7 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center shrink-0 opacity-40 group-hover:opacity-100">
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="p-6 border-t space-y-4" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: "var(--text-muted)" }}>Toplam Tutar</p>
                    <p className="text-xl font-black" style={{ color: "var(--text)" }}>
                      {selectedLabs.reduce((sum, id) => sum + (LAB_TESTS.find(t => t.id === id)?.price || 0), 0)} ₺
                    </p>
                  </div>
                  <button
                    onClick={orderLabs}
                    disabled={selectedLabs.length === 0 || streaming}
                    className="w-full text-white font-black py-4 rounded-2xl shadow-xl disabled:opacity-40 transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] group relative overflow-hidden"
                    style={{ background: "var(--primary)" }}
                  >
                    <div className="absolute inset-0 bg-white/10 w-0 group-hover:w-full transition-all duration-300" />
                    <span>Tetkikleri İste ({selectedLabs.length})</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {/* Physical Exam Panel (Klinik Muayene) */}
      {examOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity" onClick={() => setExamOpen(false)} />
          
          <div className="relative w-full max-w-6xl h-[85vh] shadow-2xl rounded-[2.5rem] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border transition-all"
            style={{ background: "var(--bg)", borderColor: "var(--border)" }}>
            
            {/* Header */}
            <div className="h-20 px-8 border-b flex items-center justify-between gap-6 transition-all" 
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: "var(--primary-light)" }}>
                  <Stethoscope className="w-6 h-6" style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight" style={{ color: "var(--text)" }}>Kapsamlı Fizik Muayene Paneli</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60" style={{ color: "var(--text-muted)" }}>KLİNİK MUAYENE SİSTEMİ</p>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex-1 max-w-md relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40 group-focus-within:opacity-100 transition-opacity" style={{ color: "var(--text)" }} />
                <input 
                  type="text"
                  placeholder="Muayene yöntemi veya bölge ara..."
                  value={examSearchQuery}
                  onChange={(e) => setExamSearchQuery(e.target.value)}
                  className="w-full h-11 pl-12 pr-4 rounded-xl border text-sm transition-all outline-none focus:ring-2"
                  style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)", "--tw-ring-color": "var(--primary-light)" } as any}
                />
              </div>

              <button onClick={() => setExamOpen(false)} 
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:rotate-90 hover:scale-110 active:scale-95 border shadow-sm"
                style={{ background: "var(--surface-2)", color: "var(--text-muted)", borderColor: "var(--border)" }}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Left Sidebar: Categories */}
              <aside className="w-64 border-r overflow-y-auto p-4 space-y-2 transition-all" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4 px-2" style={{ color: "var(--text-muted)" }}>Muayene Odakları</p>
                {EXAM_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedExamCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${selectedExamCategory === cat.id ? "shadow-md scale-[1.02]" : "hover:bg-black/5 opacity-60 hover:opacity-100"}`}
                    style={selectedExamCategory === cat.id ? { background: "var(--bg)", color: "var(--primary)", borderColor: "var(--border)", borderWidth: "1px" } : { color: "var(--text-muted)" }}
                  >
                    <span className="truncate">{cat.label}</span>
                    {selectedExamCategory === cat.id && <ChevronRight className="w-4 h-4" />}
                  </button>
                ))}
              </aside>

              {/* Main Area: Exams Grid */}
              <main className="flex-1 overflow-y-auto p-8" style={{ background: "var(--bg)" }}>
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {EXAM_ITEMS
                    .filter(e => (examSearchQuery ? e.name.toLowerCase().includes(examSearchQuery.toLowerCase()) : e.category === selectedExamCategory))
                    .map(exam => {
                      return (
                        <button
                          key={exam.id}
                          onClick={() => {
                            sendMessage(exam.message);
                            setExamOpen(false);
                          }}
                          disabled={streaming}
                          className="group text-left p-5 rounded-3xl border transition-all flex flex-col justify-between h-28 relative hover:shadow-md hover:-translate-y-1 active:scale-95 disabled:opacity-30"
                          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                        >
                          <span className="text-sm font-black leading-tight line-clamp-2 pr-6" style={{ color: "var(--text)" }}>
                            {exam.name}
                          </span>
                          <div className="flex items-center justify-between bottom-4">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: "var(--text-muted)" }}>MUAYENE ET</span>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-black/5 group-hover:bg-primary-light group-hover:text-primary">
                              <Plus className="w-4 h-4" />
                            </div>
                          </div>
                        </button>
                      );
                    })
                  }
                  {EXAM_ITEMS.filter(e => (examSearchQuery ? e.name.toLowerCase().includes(examSearchQuery.toLowerCase()) : e.category === selectedExamCategory)).length === 0 && (
                    <div className="col-span-full py-20 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 opacity-20" />
                      </div>
                      <p className="text-sm font-bold opacity-40">Aradığınız kriterlere uygun muayene yöntemi bulunamadı.</p>
                    </div>
                  )}
                </div>
              </main>
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
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-50" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-xs font-bold capitalize" style={{ color: "var(--text)" }}>{value}</span>
    </div>
  );
}
