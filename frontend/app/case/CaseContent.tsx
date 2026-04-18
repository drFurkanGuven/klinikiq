"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { sessionsApi, api, getBaseUrl } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import DiagnosisForm from "@/components/DiagnosisForm";
import {
  Activity, FileText, CheckCircle2, ArrowLeft,
  Stethoscope, AlertTriangle, Send, Loader2,
  PanelLeftOpen, PanelLeftClose, Bot, Info, TestTube2, Phone, X, ShieldAlert,
  Search, ShoppingBag, Trash, ChevronRight, Plus, RefreshCw,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { nativeClient } from "@/lib/native";
import { storage } from "@/lib/storage";

// --- SABİTLER VE VERİLER ---

const EXAM_CATEGORIES = [
  { id: "basic", label: "🎯 Temel Yöntemler" },
  { id: "vitals", label: "📊 Vital & Antropometri" },
  { id: "head_neck", label: "👤 Baş ve Boyun" },
  { id: "eye", label: "👁️ Göz & Görme" },
  { id: "respiratory", label: "🫁 Solunum Sistemi" },
  { id: "cardio", label: "🫀 Kardiyovasküler" },
  { id: "gastro", label: "🩺 Gastrointestinal" },
  { id: "neuro", label: "🧠 NÖROLOJİK MUAYENE" },
  { id: "locomotor", label: "🦴 Kas-İskelet Sistemi" },
  { id: "urogenital", label: "🚻 Ürogenital & Rektal" },
  { id: "peds", label: "👶 Pediatri" },
  { id: "obgyn", label: "🤰 Kadın Doğum" },
  { id: "ortho", label: "🦿 Ortopedi & Eklem" },
  { id: "derma", label: "✨ Dermatolojik" },
];

const EXAM_ITEMS = [
  { id: "inspeksiyon", name: "İnspeksiyon", category: "basic", message: "[FİZİK MUAYENE] Hastaya genel bir inspeksiyon yapar mısın?" },
  { id: "palpasyon", name: "Palpasyon", category: "basic", message: "[FİZİK MUAYENE] Palpasyon ile muayene yapar mısın?" },
  { id: "perkusyon", name: "Perküsyon", category: "basic", message: "[FİZİK MUAYENE] Perküsyon ile muayene yapar mısın?" },
  { id: "oskultasyon", name: "Oskültasyon", category: "basic", message: "[FİZİK MUAYENE] Oskültasyon yapar mısın?" },
  { id: "bilinc", name: "Bilinç Durumu Değerlendirmesi", category: "vitals", message: "[FİZİK MUAYENE] Hastanın bilinç durumunu değerlendirir misin?" },
  { id: "gks", name: "Glaskow Koma Skoru (GKS)", category: "vitals", message: "[FİZİK MUAYENE] Glaskow Koma Skoru (GKS) bakar mısın?" },
  { id: "tansiyon", name: "Kan Basıncı (Tansiyon)", category: "vitals", message: "[FİZİK MUAYENE] Kan basıncını (tansiyon) ölçer misin?" },
  { id: "nabiz", name: "Nabız Muayenesi (Hız/Ritim)", category: "vitals", message: "[FİZİK MUAYENE] Nabız muayenesi yapar mısın?" },
  { id: "solunum_sayisi", name: "Solunum Sayısı Ölçümü", category: "vitals", message: "[FİZİK MUAYENE] Solunum sayısını ölçer misin?" },
  { id: "ates", name: "Vücut Isısı (Ateş)", category: "vitals", message: "[FİZİK MUAYENE] Vücut ısısını (ateş) ölçer misin?" },
  { id: "spo2", name: "Oksijen Satürasyonu (SpO2)", category: "vitals", message: "[FİZİK MUAYENE] Oksijen satürasyonunu (SpO2) ölçer misin?" },
  { id: "boy_kilo", name: "Boy ve Kilo Ölçümü", category: "vitals", message: "[FİZİK MUAYENE] Boy ve kiloyu ölçer misin?" },
  { id: "postur", name: "Postür ve Yürüyüş", category: "vitals", message: "[FİZİK MUAYENE] Postür ve yürüyüşü değerlendirir misin?" },
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
  { id: "supraklavikuler_lap", name: "Supraklaviküler Lenf Nodu Palpasyonu", category: "head_neck", message: "[FİZİK MUAYENE] Supraklaviküler fossa lenf nodlarını palpe eder misin?" },
  { id: "karotis", name: "Karotis Arter Muayenesi", category: "head_neck", message: "[FİZİK MUAYENE] Karotis arter muayenesi yapar mısın?" },
  { id: "fundus_goz_dibi", name: "Göz Dibi Muayenesi (Oftalmoskopi / Fundus)", category: "eye", message: "[FİZİK MUAYENE] Göz dibi (retina, disk, damarlar) muayenesi yapar mısın? Direkt veya indirekt oftalmoskop ile fundoskopi." },
  { id: "gorme_snellen", name: "Görme Keskinliği (Snellen / LogMAR)", category: "eye", message: "[FİZİK MUAYENE] Görme keskinliğini Snellen veya LogMAR tablosu ile ölçer misin?" },
  { id: "biomikroskopi", name: "Biomikroskopi (Yarık Lambası — Ön Segment)", category: "eye", message: "[FİZİK MUAYENE] Yarık lambası ile ön segment (kornea, ön oda, iris, lens) biomikroskopik muayene yapar mısın?" },
  { id: "tonometri_gib", name: "Tonometri (Göz İçi Basınç)", category: "eye", message: "[FİZİK MUAYENE] Göz içi basıncı (tonometri / GİB) ölçer misin?" },
  { id: "renk_ishihara", name: "Renk Görme (İshihara / Renk Testi)", category: "eye", message: "[FİZİK MUAYENE] Renk görme testi (İshihara plakaları veya eşdeğeri) uygular mısın?" },
  { id: "gorme_alani", name: "Görme Alanı (Konfrontasyon / Perimetri)", category: "eye", message: "[FİZİK MUAYENE] Görme alanını konfrontasyon veya otomatik perimetri ile değerlendirir misin?" },
  { id: "kornea_floressein", name: "Kornea Muayenesi (Floressein ile)", category: "eye", message: "[FİZİK MUAYENE] Floressein ile korneal defekt/abrazyon varlığını değerlendirir misin?" },
  { id: "amsler", name: "Amsler Izgarası (Maküle)", category: "eye", message: "[FİZİK MUAYENE] Maküle fonksiyonu için Amsler ızgarası uygular mısın?" },
  { id: "okuler_motilite", name: "Oküler Motilite ve Hirschberg", category: "eye", message: "[FİZİK MUAYENE] Göz hizası (Hirschberg), oküler motilite ve siklopleji gereksinimini değerlendirir misin?" },
  { id: "duochrome", name: "Duochrome Testi (Refraksiyon)", category: "eye", message: "[FİZİK MUAYENE] Refraksiyon için duochrome (kırmızı-yeşil) testi yapar mısın?" },
  { id: "gogus_insp", name: "Göğüs Kafesi İnspeksiyonu", category: "respiratory", message: "[FİZİK MUAYENE] Göğüs kafesi inspeksiyonu yapar mısın?" },
  { id: "solunum_efor", name: "Solunum Eforu", category: "respiratory", message: "[FİZİK MUAYENE] Solunum eforunu değerlendirir misin?" },
  { id: "gogus_eksp", name: "Göğüs Ekspansiyonu", category: "respiratory", message: "[FİZİK MUAYENE] Göğüs ekspansiyonuna bakar mısın?" },
  { id: "fremitus", name: "Taktil Fremitus Palpasyonu", category: "respiratory", message: "[FİZİK MUAYENE] Taktil fremitus muayenesi yapar mısın?" },
  { id: "akciger_perk", name: "Akciğer Perküsyonu", category: "respiratory", message: "[FİZİK MUAYENE] Akciğer perküsyonu yapar mısın?" },
  { id: "akciger_osk", name: "Akciğer Oskültasyonu", category: "respiratory", message: "[FİZİK MUAYENE] Akciğer oskültasyonu yapar mısın? (Ral, ronküs, wheezing?)" },
  { id: "meme_klinik", name: "Meme Klinik Muayenesi (İnspeksiyon + Palpasyon)", category: "respiratory", message: "[FİZİK MUAYENE] Meme klinik muayenesi yapar mısın? (Dört kadran, areola, aksiller ekstansiyon; erkek jinekomasti dahil.)" },
  { id: "aksiller_lap", name: "Aksiller Lenf Nodu Palpasyonu", category: "respiratory", message: "[FİZİK MUAYENE] Aksilla lenf nodu palpasyonu yapar mısın?" },
  { id: "prekordiyal", name: "Prekordiyal İnspeksiyon", category: "cardio", message: "[FİZİK MUAYENE] Prekordiyal inspeksiyon yapar mısın?" },
  { id: "pmi", name: "Apikal Vuru (PMI) Palpasyonu", category: "cardio", message: "[FİZİK MUAYENE] Apikal vuru (PMI) palpasyonu yapar mısın?" },
  { id: "trill", name: "Trill Palpasyonu", category: "cardio", message: "[FİZİK MUAYENE] Kalp odaklarında trill palpasyonu yapar mısın?" },
  { id: "kalp_osk", name: "Kalp Odakları Oskültasyonu", category: "cardio", message: "[FİZİK MUAYENE] Kalp odaklarını (Aort, Pulmoner, Triküspid, Mitral) oskülte eder misin? (Üfürüm? S1-S2?)" },
  { id: "periferik_nabiz", name: "Periferik Nabız Palpasyonu", category: "cardio", message: "[FİZİK MUAYENE] Periferik nabızları (radyal, femoral, dorsalis pedis vb.) kontrol eder misin?" },
  { id: "kapiller_dolum", name: "Kapiller Dolum Zamanı", category: "cardio", message: "[FİZİK MUAYENE] Kapiller dolum zamanını değerlendirir misin?" },
  { id: "edema", name: "Pitting Ödem Muayenesi", category: "cardio", message: "[FİZİK MUAYENE] Alt ekstremitelerde ödem kontrolü yapar mısın?" },
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
  { id: "mental_durum", name: "Mental Durum", category: "neuro", message: "[FİZİK MUAYENE] Mental durum değerlendirmesi yapar mısın?" },
  { id: "mmse_moca", name: "Bilişsel Tarama (MMSE / MoCA)", category: "neuro", message: "[FİZİK MUAYENE] Bilişsel fonksiyon için MMSE veya MoCA ile tarama yapar mısın?" },
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
  { id: "eklem_insp_palp", name: "Eklem İnspeksiyon/Palpasyon", category: "locomotor", message: "[FİZİK MUAYENE] Eklemleri inspeksiyon ve palpasyonla değerlendirir misin?" },
  { id: "eklem_rom", name: "Eklem ROM (Aktif/Pasif)", category: "locomotor", message: "[FİZİK MUAYENE] Eklem hareket açıklığını (ROM) kontrol eder misin?" },
  { id: "omurga", name: "Omurga ve Skolyoz Muayenesi", category: "locomotor", message: "[FİZİK MUAYENE] Omurga ve skolyoz değerlendirmesi yapar mısın?" },
  { id: "lasegue", name: "Düz Bacak Kaldırma (Lasegue)", category: "locomotor", message: "[FİZİK MUAYENE] Lasegue (düz bacak kaldırma) testi yapar mısın?" },
  { id: "provokasyon", name: "Spesifik Provokasyon Testleri", category: "locomotor", message: "[FİZİK MUAYENE] Eklem bazlı provokasyon testlerini (Lachman, McMurray, Phalen vb.) yapar mısın?" },
  { id: "fabere_patrick", name: "FABER / Patrick Testi (Kalça-Sakroiliak)", category: "locomotor", message: "[FİZİK MUAYENE] FABER (Patrick) testi ile kalça ve sakroiliak eklem değerlendirmesi yapar mısın?" },
  { id: "trendelenburg", name: "Trendelenburg Yürüyüş Testi", category: "locomotor", message: "[FİZİK MUAYENE] Trendelenburg bulgusu ve pelvik dengeyi yürüyüşte değerlendirir misin?" },
  { id: "kvah", name: "KVAH Muayenesi", category: "urogenital", message: "[FİZİK MUAYENE] Kostovertebral açı hassasiyetine (KVAH) bakar mısın?" },
  { id: "genital", name: "Dış Genitalya Muayenesi", category: "urogenital", message: "[FİZİK MUAYENE] Dış genitalya inspeksiyon ve palpasyonu yapar mısın?" },
  { id: "herni", name: "İnguinal Herni Muayenesi", category: "urogenital", message: "[FİZİK MUAYENE] İnguinal herni kontrolü yapar mısın?" },
  { id: "tuse_rektal", name: "Dijital Rektal Muayene (TR)", category: "urogenital", message: "[FİZİK MUAYENE] Dijital rektal muayene (tuşe rektal) yapar mısın?" },
  { id: "pelvik_spekulum", name: "Pelvik ve Spekulum Muayenesi", category: "urogenital", message: "[FİZİK MUAYENE] Pelvik ve spekulum muayenesi yapar mısın?" },
  { id: "inguinal_lap", name: "İnguinal Lenf Nodu Palpasyonu", category: "urogenital", message: "[FİZİK MUAYENE] İnguinal bölge lenf nodu palpasyonu yapar mısın?" },
  { id: "cilt_mukoza", name: "Cilt ve Mukoza İnspeksiyonu", category: "derma", message: "[FİZİK MUAYENE] Cilt ve mukoza inspeksiyonu yapar mısın? (Döküntü? Lezyon?)" },
  { id: "turgor_tonus", name: "Deri Turgor ve Tonusu", category: "derma", message: "[FİZİK MUAYENE] Deri turgor ve tonusunu değerlendirir misin?" },
  { id: "tirnak", name: "Tırnak İnspeksiyonu", category: "derma", message: "[FİZİK MUAYENE] Tırnak inspeksiyonu yapar mısın?" },

  // ── Pediatri ─────────────────────────────────────────────────────────────
  { id: "peds_vital_yas", name: "Yaşa Göre Vital Bulgular (Nabız/Solunum)", category: "peds", message: "[FİZİK MUAYENE] Yaşa uygun nabız ve solunum sayısını değerlendirir misin? (Pediatrik referans aralığı.)" },
  { id: "peds_persentil", name: "Boy / Kilo Persentil veya SDS", category: "peds", message: "[FİZİK MUAYENE] Boy ve kilo için persentil eğrisi veya SDS ile büyüme değerlendirmesi yapar mısın?" },
  { id: "peds_fontanel", name: "Fontanel ve Kafatası (Bebek)", category: "peds", message: "[FİZİK MUAYENE] Fontanel genişliği ve kafatası suturlarını değerlendirir misin?" },
  { id: "peds_primitif", name: "Primitif Refleksler (Moro, Emme, Yakalama)", category: "peds", message: "[FİZİK MUAYENE] Yenidoğan/bebekte primitif refleksleri kontrol eder misin?" },
  { id: "peds_ortolani", name: "Kalça Çıkığı Tarama (Ortolani-Barlow)", category: "peds", message: "[FİZİK MUAYENE] Ortolani ve Barlow manevraları ile gelişimsel kalça displazisi taraması yapar mısın?" },
  { id: "peds_hidrasyon", name: "Hidrasyon (Mukoza, Fontanel, Turgor)", category: "peds", message: "[FİZİK MUAYENE] Çocukta hidrasyonu (mukoza, fontanel, deri turgoru, idrar çıkışı) değerlendirir misin?" },
  { id: "peds_gelisim", name: "Gelişimsel Mileston / Tarama", category: "peds", message: "[FİZİK MUAYENE] Yaşa uygun gelişimsel milestonları (göz teması, baş kontrolü, oturma, yürüme vb.) sorar ve gözlemler misin?" },
  { id: "peds_stridor", name: "Stridor / Krup Klinik Değerlendirme", category: "peds", message: "[FİZİK MUAYENE] İnspiratuvar stridor ve üst hava yolu obstrüksiyonu için klinik değerlendirme yapar mısın?" },
  { id: "peds_batin", name: "Çocuk Batın Muayenesi", category: "peds", message: "[FİZİK MUAYENE] Çocuk batın inspeksiyon ve palpasyonu (Rosenberg, kitle, distansiyon) yapar mısın?" },
  { id: "peds_inguinal", name: "Çocuk İnguinal / Skrotum (Fıtık, Testis)", category: "peds", message: "[FİZİK MUAYENE] İnguinal kanal ve skrotumu çocukta muayene eder misin? (İnguinal fıtık, hidrosel, testis torsiyonu düşüncesi.)" },
  { id: "peds_capiller", name: "Kapiller Dolgu (Pediatrik Şok İzlemi)", category: "peds", message: "[FİZİK MUAYENE] Çocukta kapiller dolgu süresi ve periferik perfüzyonu değerlendirir misin?" },
  { id: "peds_airway", name: "Pediatrik Hava Yolu ve Dispne Skoru", category: "peds", message: "[FİZİK MUAYENE] Pediatrik solunum sıkıntısını (çekilmeler, siyanoz, işe solunum) klinik olarak tarar mısın?" },

  // ── Kadın doğum ─────────────────────────────────────────────────────────
  { id: "ob_leopold", name: "Leopold Manevraları (Fetal Prezentasyon)", category: "obgyn", message: "[FİZİK MUAYENE] Gebelikte Leopold manevraları ile fetal prezentasyon ve pozisyonu değerlendirir misin?" },
  { id: "ob_fundus", name: "Uterus Fundus Yüksekliği (cm)", category: "obgyn", message: "[FİZİK MUAYENE] Gebelik haftasına uygun uterus fundus yüksekliğini ölçer ve kaydeder misin?" },
  { id: "ob_fetal_kalp", name: "Fetal Kalp Sesleri (FKS)", category: "obgyn", message: "[FİZİK MUAYENE] Doppler veya fetoskop ile fetal kalp seslerini dinler misin?" },
  { id: "ob_bimanuel", name: "Bimanuel Pelvik Muayene", category: "obgyn", message: "[FİZİK MUAYENE] Bimanuel pelvik muayene ile uterus ve adneksleri değerlendirir misin?" },
  { id: "ob_spekulum", name: "Spekulum ile Serviks ve Vajen Görüntüleme", category: "obgyn", message: "[FİZİK MUAYENE] Spekulum ile serviks ve vajen mukozasını inspeksiyon eder misin?" },
  { id: "ob_vulva", name: "Vulva ve Bartholin Muayenesi", category: "obgyn", message: "[FİZİK MUAYENE] Vulva, vestibulum ve Bartholin bölgesini inspeksiyon/palpasyonla değerlendirir misin?" },
  { id: "ob_gebelik_meme", name: "Gebelikte Meme Muayenesi", category: "obgyn", message: "[FİZİK MUAYENE] Gebelikte meme inspeksiyon ve palpasyonu (emzirme planı, mastit riski) yapar mısın?" },
  { id: "ob_lohusa_uterus", name: "Lohusal Uterus İnvülasyon (Fundus)", category: "obgyn", message: "[FİZİK MUAYENE] Lohusal dönemde uterus fundus yüksekliği ve kontraksiyonu palpe eder misin?" },
  { id: "ob_gebelik_ta", name: "Gebelikte TA ve Ödem", category: "obgyn", message: "[FİZİK MUAYENE] Gebelikte kan basıncı ve periferik ödemi preeklampsi açısından değerlendirir misin?" },
  { id: "ob_kontraksiyon", name: "Uterus Kontraksiyon Takibi (Doğum Eylemi)", category: "obgyn", message: "[FİZİK MUAYENE] Doğum eyleminde uterus kontraksiyon sıklığı ve şiddetini palpasyonla izler misin?" },

  // ── Ortopedi (spesifik provokasyon testleri) ─────────────────────────────
  { id: "ortho_lachman", name: "Lachman Testi (Ön Çapraz Bağ)", category: "ortho", message: "[FİZİK MUAYENE] Dizde Lachman testi ile ön çapraz bağ bütünlüğünü değerlendirir misin?" },
  { id: "ortho_drawer", name: "Ön/Arka Çekmece Testi (Diz)", category: "ortho", message: "[FİZİK MUAYENE] Dizde anterior ve posterior drawer testlerini yapar mısın?" },
  { id: "ortho_mcmurray", name: "McMurray Testi (Menisküs)", category: "ortho", message: "[FİZİK MUAYENE] McMurray testi ile medial/lateral menisküs patolojisini değerlendirir misin?" },
  { id: "ortho_pivot", name: "Pivot Shift Testi (Diz)", category: "ortho", message: "[FİZİK MUAYENE] Pivot shift testi ile ACL instabilitesini değerlendirir misin?" },
  { id: "ortho_varus_valgus", name: "Varus / Valgus Stres (Diz)", category: "ortho", message: "[FİZİK MUAYENE] Dizde varus ve valgus stres testlerini uygular mısın?" },
  { id: "ortho_apprehension", name: "Apprehension Testi (Omuz)", category: "ortho", message: "[FİZİK MUAYENE] Omuzda apprehension ve relocation testlerini yapar mısın?" },
  { id: "ortho_hawkins", name: "Hawkins-Kennedy (Omuz Impingement)", category: "ortho", message: "[FİZİK MUAYENE] Hawkins-Kennedy testi ile subakromial sıkışmayı değerlendirir misin?" },
  { id: "ortho_empty_can", name: "Empty Can / Jobe (Supraspinatus)", category: "ortho", message: "[FİZİK MUAYENE] Empty can (Jobe) testi ile supraspinatus patolojisini tarar mısın?" },
  { id: "ortho_yergason", name: "Yergason Testi (Biseps)", category: "ortho", message: "[FİZİK MUAYENE] Yergason testi ile biseps tendon patolojisini değerlendirir misin?" },
  { id: "ortho_finkelstein", name: "Finkelstein Testi (De Quervain)", category: "ortho", message: "[FİZİK MUAYENE] Finkelstein testi ile 1. ekstansör kompartman tenosinovitini tarar mısın?" },
  { id: "ortho_phalen_tinel", name: "Phalen ve Tinel (Median Sinir)", category: "ortho", message: "[FİZİK MUAYENE] Karpal tünel için Phalen ve Tinel testlerini uygular mısın?" },
  { id: "ortho_thomas", name: "Thomas Testi (Kalça Fleksiyon Kontraktürü)", category: "ortho", message: "[FİZİK MUAYENE] Thomas testi ile kalça fleksiyon kontraktürünü değerlendirir misin?" },
  { id: "ortho_ober", name: "Ober Testi (İT Bant)", category: "ortho", message: "[FİZİK MUAYENE] Ober testi ile iliotibial bant gerginliğini değerlendirir misin?" },
  { id: "ortho_slr_cross", name: "Çapraz SLR (İskias)", category: "ortho", message: "[FİZİK MUAYENE] Çapraz düz bacak kaldırma testi ile kök irritasyonunu tarar mısın?" },
  { id: "ortho_ankle_drawer", name: "Ayak Bileği Ön Çekmece (YÇB)", category: "ortho", message: "[FİZİK MUAYENE] Ayak bileğinde anterior drawer ile lateral bağ yaralanmasını değerlendirir misin?" },
  { id: "ortho_adams", name: "Adams Eğilme Testi (Skolyoz Tarama)", category: "ortho", message: "[FİZİK MUAYENE] Adams eğilme testi ile skolyoz ve kosta kamburluğunu tarar mısın?" },
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
  { id: "hemogram", name: "Tam Kan Sayımı (Hemogram)", price: 50, category: "lab" },
  { id: "perf_yayma", name: "Periferik Yayma", price: 60, category: "lab" },
  { id: "biyokimya", name: "Rutin Biyokimya Paneli", price: 120, category: "lab" },
  { id: "koagulasyon", name: "Koagülasyon Paneli (PT, aPTT, INR)", price: 100, category: "lab" },
  { id: "kardiyak_belirtec", name: "Kardiyak Belirteçler (Troponin, NT-proBNP)", price: 180, category: "lab" },
  { id: "tiroid_paneli", name: "Tiroid Paneli (TSH, sT3, sT4)", price: 120, category: "lab" },
  { id: "akg", name: "Arter Kan Gazı (AKG)", price: 110, category: "lab" },
  { id: "tit", name: "Tam İdrar Tetkiki (TİT)", price: 40, category: "lab" },
  { id: "hormon_paneli", name: "Hormon Paneli (FSH, LH, Kortizol, Prolaktin vb.)", price: 200, category: "lab" },
  { id: "tumor_belirtec", name: "Tümör Belirteçleri (PSA, CEA, CA-125)", price: 250, category: "lab" },
  { id: "romatoloji_paneli", name: "Romatoloji Paneli (ANA, RF, Anti-CCP)", price: 220, category: "lab" },
  { id: "vitamin_mineral", name: "Vitamin ve Mineral Paneli (B12, D Vit, Demir)", price: 150, category: "lab" },
  { id: "seroloji_hep", name: "Seroloji ve Hepatit Paneli", price: 180, category: "lab" },
  { id: "kulturler", name: "Kültürler (Kan, İdrar, Boğaz)", price: 160, category: "lab" },
  { id: "ggk", name: "Gaitada Gizli Kan (GGK)", price: 50, category: "lab" },
  { id: "bos_analizi", name: "Beyin Omurilik Sıvısı (BOS) Analizi", price: 450, category: "lab" },
  { id: "sivi_analizi", name: "Vücut Sıvısı Analizi (Plevral/Asit)", price: 300, category: "lab" },
  { id: "toksikoloji", name: "Toksikoloji Taraması", price: 400, category: "lab" },
  // ── Hormonlar & nöroendokrin (tekil ve özel) ─────────────────────────────
  { id: "serum_oksitosin", name: "Serum Oksitosin", price: 320, category: "lab" },
  { id: "serum_vazopressin", name: "Serum ADH (Vazopressin)", price: 340, category: "lab" },
  { id: "prolaktin_tek", name: "Prolaktin (tekil)", price: 110, category: "lab" },
  { id: "gh_igf_panel", name: "GH + IGF-1 Paneli", price: 380, category: "lab" },
  { id: "acth_kortizol", name: "ACTH + Serum Kortizol (eş zamanlı)", price: 220, category: "lab" },
  { id: "salivary_kortizol", name: "Tükürük Kortizol (gece)", price: 260, category: "lab" },
  { id: "renin_aldosteron", name: "Renin + Aldosteron (PRA)", price: 280, category: "lab" },
  { id: "andr_steroid", name: "Androjen / Steroid Paneli (DHEA-S, Androstenedion, 17-OHP)", price: 300, category: "lab" },
  { id: "testosteron_free", name: "Testosteron (Total + Free) + SHBG", price: 200, category: "lab" },
  { id: "estro_prog_panel", name: "Estradiol + Progesteron Paneli", price: 180, category: "lab" },
  { id: "fsh_lh_tek", name: "FSH + LH (tekil)", price: 160, category: "lab" },
  { id: "amh", name: "Anti-Müllerian Hormon (AMH)", price: 350, category: "lab" },
  { id: "inhibin_b", name: "İnhibin B", price: 400, category: "lab" },
  { id: "beta_hcg_kant", name: "Beta-hCG (Kantitatif)", price: 130, category: "lab" },
  { id: "parathormon", name: "Parathormon (PTH)", price: 150, category: "lab" },
  { id: "kalsitonin", name: "Serum Kalsitonin", price: 200, category: "lab" },
  { id: "tiroid_antikor", name: "Tiroid Otoantikor Paneli (Anti-TPO, Anti-Tg, TRAb)", price: 240, category: "lab" },
  { id: "metanefrin_plazma", name: "Plazma Metanefrin / Normetanefrin", price: 450, category: "lab" },
  { id: "metanefrin_idrar24", name: "24 Saat İdrar Metanefrinler", price: 420, category: "lab" },
  { id: "vma_hma", name: "24 Saat İdrar VMA / HMA", price: 280, category: "lab" },
  { id: "hi_aa_idrar", name: "24 Saat İdrar 5-HIAA (Serotonin metaboliti)", price: 300, category: "lab" },
  { id: "insulin_cpep", name: "Açlık İnsülin + C-Peptid", price: 170, category: "lab" },
  { id: "ogtt", name: "Oral Glukoz Tolerans Testi (OGTT, 75 g)", price: 140, category: "lab" },
  { id: "fruktosamin", name: "Fruktozamin", price: 90, category: "lab" },
  { id: "hba1c", name: "HbA1c", price: 85, category: "lab" },
  // ── Biyokimya alt paneller ───────────────────────────────────────────────
  { id: "lft", name: "Karaciğer Fonksiyon Paneli (ALT, AST, GGT, ALP, Bilirubin)", price: 130, category: "lab" },
  { id: "rft", name: "Böbrek Fonksiyon Paneli (Üre, Kreatinin, eGFR, Asit-Baz)", price: 120, category: "lab" },
  { id: "lipid_profil", name: "Lipid Profili (Kol, HDL, LDL, TG)", price: 100, category: "lab" },
  { id: "lipoprotein_a", name: "Lipoprotein (a)", price: 180, category: "lab" },
  { id: "apo_apob", name: "ApoA1 + ApoB", price: 160, category: "lab" },
  { id: "elektrolit_genis", name: "Elektrolit Paneli (Na, K, Cl, osmolalite)", price: 95, category: "lab" },
  { id: "ca_mg_p", name: "Kalsiyum + Fosfor + Mg (serum)", price: 90, category: "lab" },
  { id: "demir_profili", name: "Demir Profili (Demir, TDBK, Ferritin, Satürasyon)", price: 140, category: "lab" },
  { id: "laktat", name: "Kan Laktat", price: 110, category: "lab" },
  { id: "amonyak", name: "Kan Amonyağı", price: 130, category: "lab" },
  { id: "ck_ckmb", name: "CK + CK-MB + Miyoglobin", price: 170, category: "lab" },
  { id: "homosistein", name: "Homosistein", price: 150, category: "lab" },
  { id: "urik_asit", name: "Ürik Asit", price: 70, category: "lab" },
  { id: "bilirubin_ayrim", name: "Direkt / İndirekt Bilirubin Ayrımı", price: 80, category: "lab" },
  // ── Hematoloji & koagülasyon genişletilmiş ───────────────────────────────
  { id: "retikulosit", name: "Retikülosit Sayımı", price: 55, category: "lab" },
  { id: "esr", name: "Sedimantasyon (ESR)", price: 45, category: "lab" },
  { id: "crp", name: "C-Reaktif Protein (CRP)", price: 70, category: "lab" },
  { id: "hs_crp", name: "Yüksek Duyarlılık CRP (hs-CRP)", price: 90, category: "lab" },
  { id: "pct", name: "Prokalsitonin (PCT)", price: 220, category: "lab" },
  { id: "ddimer", name: "D-Dimer", price: 180, category: "lab" },
  { id: "fibrinojen", name: "Fibrinojen", price: 95, category: "lab" },
  { id: "kan_grubu", name: "Kan Grubu + Rh + Antikor Tarama", price: 80, category: "lab" },
  { id: "cross_match", name: "Cross-Match (Uygunluk)", price: 120, category: "lab" },
  { id: "direct_coombs", name: "Direkt Coombs", price: 90, category: "lab" },
  { id: "antitrombin", name: "Anti-Trombin III", price: 200, category: "lab" },
  { id: "protein_c_s", name: "Protein C + Protein S Aktivitesi", price: 280, category: "lab" },
  { id: "lupus_antikoag", name: "Lupus Antikoagülan + Kardiyolipin IgG/IgM", price: 350, category: "lab" },
  { id: "hb_elektro", name: "Hemoglobin Elektroforezi", price: 180, category: "lab" },
  // ── İmmünoloji & seroloji ────────────────────────────────────────────────
  { id: "ana_ena", name: "ANA + ENA Paneli", price: 320, category: "lab" },
  { id: "anca", name: "ANCA (p/c-ANCA)", price: 260, category: "lab" },
  { id: "anti_dsdna", name: "Anti-dsDNA", price: 200, category: "lab" },
  { id: "kompleman", name: "Kompleman C3 + C4", price: 140, category: "lab" },
  { id: "ig_panel", name: "İmmünoglobulin Paneli (IgG, IgA, IgM, IgE)", price: 220, category: "lab" },
  { id: "hla_b27", name: "HLA-B27", price: 350, category: "lab" },
  { id: "aso", name: "ASO Titresi", price: 70, category: "lab" },
  { id: "torch", name: "TORCH Serolojisi", price: 380, category: "lab" },
  { id: "hiv_combo", name: "HIV Ag/Ab Kombine", price: 160, category: "lab" },
  { id: "hbsag_anti_hcv", name: "HBsAg + Anti-HCV", price: 140, category: "lab" },
  { id: "cmv_pcr", name: "CMV DNA (PCR, kan)", price: 400, category: "lab" },
  { id: "ebv_seroloji", name: "EBV Serolojisi (VCA, EBNA)", price: 240, category: "lab" },
  // ── Mikrobiyoloji ─────────────────────────────────────────────────────────
  { id: "kan_kultur", name: "Kan Kültürü (Aerob + Anaerob)", price: 180, category: "lab" },
  { id: "idrar_kultur", name: "İdrar Kültürü + Antibiyogram", price: 120, category: "lab" },
  { id: "bogaz_kultur", name: "Boğaz / Sürüntü Kültürü", price: 100, category: "lab" },
  { id: "mrsa", name: "MRSA Burun Sürüntüsü Taraması", price: 130, category: "lab" },
  { id: "c_diff", name: "Clostridioides difficile Toksin A/B", price: 220, category: "lab" },
  { id: "legionella_ua", name: "Legionella Üriner Antijen", price: 280, category: "lab" },
  { id: "strepa_hizli", name: "Streptokok Grup A Hızlı Test", price: 60, category: "lab" },
  { id: "mantoux", name: "Mantoux (PPD) Testi", price: 80, category: "lab" },
  // ── İdrar & gaita ───────────────────────────────────────────────────────
  { id: "mikroalbuminuri", name: "İdrar Mikroalbuminürisi", price: 90, category: "lab" },
  { id: "idrar24_protein", name: "24 Saat İdrar Protein", price: 100, category: "lab" },
  { id: "osmolalite_serum_idrar", name: "Serum + İdrar Osmolalitesi", price: 130, category: "lab" },
  { id: "gaita_kalprotektin", name: "Gaita Kalprotektini", price: 350, category: "lab" },
  { id: "gaita_parazit", name: "Gaita Parazit Taraması", price: 90, category: "lab" },
  { id: "gaita_elastaz", name: "Gaita Pankreas Elastaz-1", price: 280, category: "lab" },
  { id: "helicobacter_stool", name: "Helicobacter pylori Gaita Antijeni", price: 200, category: "lab" },
  // ── İlaç düzeyleri ───────────────────────────────────────────────────────
  { id: "dijitalis", name: "Digoksin Düzeyi", price: 150, category: "lab" },
  { id: "valproat", name: "Valproik Asit Düzeyi", price: 160, category: "lab" },
  { id: "fenitoin", name: "Fenitoin Düzeyi", price: 150, category: "lab" },
  { id: "karbamazepin", name: "Karbamazepin Düzeyi", price: 150, category: "lab" },
  { id: "litium", name: "Lityum Düzeyi", price: 120, category: "lab" },
  { id: "teofilin", name: "Teofilin Düzeyi", price: 140, category: "lab" },
  { id: "vankomisin", name: "Vankomisin Düzeyi (trough)", price: 180, category: "lab" },
  { id: "amikasin", name: "Amikasin Düzeyi", price: 180, category: "lab" },
  { id: "siklosporin", name: "Siklosporin Düzeyi", price: 200, category: "lab" },
  { id: "takrolimus", name: "Takrolimus Düzeyi", price: 200, category: "lab" },
  // ── Diğer ────────────────────────────────────────────────────────────────
  { id: "il6", name: "İnterlökin-6 (IL-6)", price: 280, category: "lab" },
  { id: "ferritin_tek", name: "Ferritin (tekil)", price: 85, category: "lab" },
  { id: "g6pd", name: "G6PD Enzim Aktivitesi", price: 200, category: "lab" },
  { id: "ldh", name: "LDH", price: 75, category: "lab" },
  { id: "b12_folat", name: "B12 + Folat (serum)", price: 140, category: "lab" },
  { id: "vit_d25", name: "Vitamin D (25-OH)", price: 180, category: "lab" },
  { id: "demir_baglanma", name: "Demir Bağlama Kapasitesi (TDBK)", price: 70, category: "lab" },
  { id: "porfirin", name: "İdrar / Kan Porfirin Paneli", price: 450, category: "lab" },
  { id: "asit_sivi_ada", name: "Asit / Plevra Sıvısı ADA", price: 220, category: "lab" },
  { id: "ter_testi", name: "Ter Testi (Klor / iletkenlik, CF)", price: 600, category: "lab" },
  { id: "kan_gazi_venoz", name: "Venöz Kan Gazı", price: 100, category: "lab" },
  { id: "laktat_arteriyel", name: "Arteriyel Laktat (Şok takibi)", price: 120, category: "lab" },
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
  { id: "mr_mamografi", name: "MR Mamografi", price: 950, category: "radiology" },
  { id: "mr_enterografi", name: "MR Enterografi (kontrastlı)", price: 1100, category: "radiology" },
  { id: "bt_kolonografi", name: "Virtual Kolonografi (BT)", price: 750, category: "radiology" },
  { id: "urografi_iv", name: "İntravenöz Ürografi (İVÜ)", price: 450, category: "radiology" },
  { id: "sialografi", name: "Sialografi", price: 400, category: "radiology" },
  { id: "usg_elastografi", name: "USG Elastografi (Karaciğer / Tiroid)", price: 320, category: "radiology" },
  { id: "karotis_duplex", name: "Karotis Duplex USG", price: 350, category: "radiology" },
  { id: "venoz_doppler_ekst", name: "Venöz Doppler (Alt Ekstremite)", price: 380, category: "radiology" },
  { id: "periferik_anjio_bt", name: "Periferik Anjiyografi (BT)", price: 900, category: "radiology" },
  { id: "toraks_bt_yuksek", name: "Toraks BT (Yüksek Çözünürlük)", price: 550, category: "radiology" },
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
  { id: "event_recorder", name: "Event Recorder (Belirtilmeli Ritim Kaydı)", price: 400, category: "cardio" },
  { id: "imp_ekg", name: "İmplante Edilebilir Loop Recorder (ILR)", price: 4500, category: "cardio" },
  { id: "six_walk", name: "6 Dakika Yürüme Testi", price: 80, category: "cardio" },
  { id: "muga", name: "MUGA (Radyonüklid Ventrikülografi)", price: 850, category: "cardio" },
  { id: "eeg", name: "Elektroensefalografi (EEG)", price: 350, category: "neuro" },
  { id: "emg", name: "Elektromiyografi (EMG)", price: 500, category: "neuro" },
  { id: "vep_baep_sep", name: "Uyarılmış Potansiyeller (VEP, BAEP, SEP)", price: 450, category: "neuro" },
  { id: "ncs_emg", name: "Sinir İletim Çalışması (NCS) + EMG", price: 550, category: "neuro" },
  { id: "baep_yenidogan", name: "İşitme Tarama (OAE / BERA)", price: 300, category: "neuro" },
  { id: "botoks_emg", name: "EMG Rehberli Botulinum Enjeksiyonu", price: 1200, category: "neuro" },
  { id: "ust_gis_endo", name: "Üst GİS Endoskopisi", price: 600, category: "endo" },
  { id: "kolonoskopi", name: "Kolonoskopi / Sigmoidoskopi", price: 800, category: "endo" },
  { id: "ercp", name: "ERCP", price: 2500, category: "endo" },
  { id: "eus", name: "Endoskopik Ultrasonografi (EUS)", price: 1500, category: "endo" },
  { id: "kapsul_endo", name: "Kapsül Endoskopi", price: 2000, category: "endo" },
  { id: "bronskopi_ebus", name: "Bronkoskopi / EBUS", price: 1200, category: "endo" },
  { id: "sistoskopi", name: "Sistoskopi", price: 700, category: "endo" },
  { id: "laparoskopi_tanisal", name: "Laparoskopi (Tanısal)", price: 2500, category: "endo" },
  { id: "artroskopi_tanisal", name: "Artroskopi (Tanısal)", price: 2000, category: "endo" },
  { id: "gastro_biyopsi", name: "Gastroskopi + Biyopsi", price: 750, category: "endo" },
  { id: "kolon_biyopsi", name: "Kolonoskopi + Polipektomi / Biyopsi", price: 950, category: "endo" },
  { id: "sigmoidoskopi_flek", name: "Esnek Sigmoidoskopi", price: 550, category: "endo" },
  { id: "pet_ct", name: "PET-CT", price: 3500, category: "nuclear" },
  { id: "sint_miyokard", name: "Miyokard Perfüzyon Sintigrafisi", price: 900, category: "nuclear" },
  { id: "sint_kemik", name: "Tüm Vücut Kemik Sintigrafisi", price: 800, category: "nuclear" },
  { id: "sint_tiroid", name: "Tiroid / Paratiroid Sintigrafisi", price: 400, category: "nuclear" },
  { id: "sint_renal", name: "Renal Sintigrafi (DMSA/DTPA)", price: 600, category: "nuclear" },
  { id: "vq_sintigrafi", name: "Ventilasyon / Perfüzyon (V/Q) Sintigrafisi", price: 1000, category: "nuclear" },
  { id: "sint_ozel", name: "Galyum / Oktreotid Sintigrafisi", price: 1500, category: "nuclear" },
  { id: "pet_psma", name: "PSMA PET-CT", price: 4200, category: "nuclear" },
  { id: "datscan", name: "DaTSCAN (Dopamin Transportör Sintigrafisi)", price: 2800, category: "nuclear" },
  { id: "iiab", name: "İnce İğne Aspirasyon Biyopsisi (İİAB)", price: 300, category: "patho" },
  { id: "trucut", name: "Tru-cut (Kor) Biyopsi", price: 500, category: "patho" },
  { id: "biyopsi_ozel", name: "Eksizyonel / İnsizyonel Biyopsi", price: 800, category: "patho" },
  { id: "smear", name: "Pap Smear Testi", price: 120, category: "patho" },
  { id: "ihk", name: "İmmünhistokimya (İHK) İncelemesi", price: 400, category: "patho" },
  { id: "genetik_karyotip", name: "Kromozom Analizi (Karyotipleme)", price: 1500, category: "patho" },
  { id: "pcr_testleri", name: "PCR Testleri", price: 350, category: "patho" },
  { id: "ngs_analizi", name: "Yeni Nesil Dizileme (NGS)", price: 5000, category: "patho" },
  { id: "fish_analizi", name: "FISH Analizi", price: 1200, category: "patho" },
  { id: "kemik_iligi_asp", name: "Kemik İliği Aspirasyonu + Biyopsi", price: 650, category: "patho" },
  { id: "flow_sitometri", name: "Flow Sitometri (Kan / Kemik İliği)", price: 900, category: "patho" },
  { id: "sitoloji_bos", name: "Sitoloji (BOS / İdrar / Balgam)", price: 220, category: "patho" },
  { id: "frozen", name: "Frozen Section (Peroperatuvar Patoloji)", price: 500, category: "patho" },
  { id: "exom", name: "Ekzom Dizileme (Exome Sequencing)", price: 6500, category: "patho" },
];

const SPECIALTY_LABELS: Record<string, string> = {
  cardiology: "Kardiyoloji", endocrinology: "Endokrinoloji",
  neurology: "Nöroloji", pulmonology: "Pulmonoloji", default: "Genel",
};

const DIFFICULTY_MAP: Record<string, { label: string; color: string; initialBudget: number }> = {
  // Geniş tetkik menüsü (PET, MR, NGS vb.) ile uyumlu — kullanıcı şikayeti: bütçe yetmiyordu
  easy: { label: "Kolay", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", initialBudget: 4500 },
  medium: { label: "Orta", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", initialBudget: 9500 },
  hard: { label: "Zor", color: "text-red-400 bg-red-500/10 border-red-500/20", initialBudget: 22000 },
};

interface Message { role: "user" | "assistant"; content: string; streaming?: boolean; isError?: boolean; }

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
                            const isValueCell = cidx === 1;
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
        return null;
      })}
    </div>
  )
}

export default function CasePageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id") || "";
  const router = useRouter();
  const [sessionData, setSessionData] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [savedDiagnoses, setSavedDiagnoses] = useState<string[]>([""]);
  const [diagnosisSaved, setDiagnosisSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [labOpen, setLabOpen] = useState(false);
  const [examOpen, setExamOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("lab");
  const [selectedExamCategory, setSelectedExamCategory] = useState("basic");
  const [searchQuery, setSearchQuery] = useState("");
  const [examSearchQuery, setExamSearchQuery] = useState("");
  const [budget, setBudget] = useState(DIFFICULTY_MAP.medium.initialBudget);
  const [selectedLabs, setSelectedLabs] = useState<string[]>([]);
  const [lastRawMessage, setLastRawMessage] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    if (!isAuthenticated()) { router.replace("/login"); return; }
    loadSession();
  }, [sessionId, mounted]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!sessionId || !mounted || loading) return;
    if (typeof window === "undefined") return;
    sessionStorage.setItem(`budget_${sessionId}`, String(budget));
  }, [budget, sessionId, mounted, loading]);

  useEffect(() => {
    if (!sessionId || !mounted || loading) return;
    if (typeof window === "undefined") return;
    sessionStorage.setItem(`labs_${sessionId}`, JSON.stringify(selectedLabs));
  }, [selectedLabs, sessionId, mounted, loading]);

  async function loadSession() {
    try {
      const res = await sessionsApi.getSession(sessionId);
      setSessionData(res.data);
      if (res.data.messages) {
        setMessages(res.data.messages.map((m: any) => ({ role: m.role, content: m.content, streaming: false })));
      }
      const difficulty = res.data.case?.difficulty || "medium";
      const tier = DIFFICULTY_MAP[difficulty] ? difficulty : "medium";
      const initialBudget = DIFFICULTY_MAP[tier].initialBudget;
      let restoredBudget = initialBudget;
      if (typeof window !== "undefined") {
        const savedBudget = sessionStorage.getItem(`budget_${sessionId}`);
        if (savedBudget !== null && savedBudget !== "") {
          const parsed = parseInt(savedBudget, 10);
          restoredBudget = isNaN(parsed) ? initialBudget : Math.min(parsed, initialBudget);
        }
      }
      setBudget(restoredBudget);
      if (typeof window !== "undefined") {
        const savedLabs = sessionStorage.getItem(`labs_${sessionId}`);
        if (savedLabs) {
          try {
            const parsed = JSON.parse(savedLabs);
            if (Array.isArray(parsed)) setSelectedLabs(parsed);
          } catch {
            /* ignore */
          }
        }
      }
    } catch { setError("Oturum yüklenemedi."); }
    finally { setLoading(false); }
  }

  const sendMessage = useCallback(async (text?: string, displayOverride?: string, skipUserBubble?: boolean) => {
    const rawMsg = (text ?? input).trim();
    if (!rawMsg || streaming) return;
    setInput("");
    setSidebarOpen(false);

    if (!skipUserBubble) {
      let displayMsg = displayOverride || rawMsg;
      if (!displayOverride) {
        if (rawMsg.startsWith("[KONSÜLTASYON İSTEĞİ]")) displayMsg = "📞 Uzmana Danış (Konsültasyon İstendi)";
        else if (rawMsg.startsWith("[FİZİK MUAYENE]")) displayMsg = rawMsg.replace("[FİZİK MUAYENE] ", "").split("(")[0] + " Muayenesi Yapıldı";
        else if (rawMsg.startsWith("[TETKİK İSTEDİ]")) displayMsg = "🧪 Laboratuvar/Görüntüleme İsteği Gönderildi";
      }
      setMessages((prev) => [...prev, { role: "user", content: displayMsg }]);
      setLastRawMessage(rawMsg);
    }

    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);
    setStreaming(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

    try {
      await storage.waitForInit();
      const token = storage.getItem("access_token");
      const response = await fetch(`${getBaseUrl()}/sessions/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: rawMsg }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error("sunucu hatası");
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
    } catch (e: any) {
      const msg = e?.name === "AbortError" ? "Bağlantı zaman aşımına uğradı." : "Bağlantı hatası.";
      setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: msg, streaming: false, isError: true }; return u; });
    } finally {
      clearTimeout(timeoutId);
      setStreaming(false);
    }
  }, [input, streaming, sessionId]);

  const retryLastMessage = useCallback(() => {
    if (!lastRawMessage || streaming) return;
    setMessages((prev) => prev.slice(0, -1));
    sendMessage(lastRawMessage, undefined, true);
  }, [lastRawMessage, streaming, sendMessage]);

  const toggleLab = (id: string, price: number) => {
    if (selectedLabs.includes(id)) { setSelectedLabs(prev => prev.filter(l => l !== id)); setBudget(prev => prev + price); }
    else if (budget >= price) { setSelectedLabs(prev => [...prev, id]); setBudget(prev => prev - price); }
    else alert("Yetersiz SGK Bütçesi!");
  };

  const orderLabs = () => {
    if (selectedLabs.length === 0) return;
    const testNames = selectedLabs.map(id => LAB_TESTS.find(t => t.id === id)?.name).join(", ");
    sendMessage(`[TETKİK İSTEDİ] Tetkikler:\n- ${testNames}\n\nMarkdown Tablo formatında listele.`);
    setSelectedLabs([]); setLabOpen(false);
  };

  async function handleDiagnosisSubmit(diagnoses: string[]) {
    await sessionsApi.diagnose(sessionId, diagnoses);
    setSavedDiagnoses(diagnoses);
    setDiagnosisSaved(true); 
    setShowDiagnosis(false);
  }

  async function handleComplete() {
    if (!diagnosisSaved) { setError("Önce en az bir tanı girmelisiniz."); return; }
    nativeClient.impact();
    setCompleting(true); setError("");
    try {
      await sessionsApi.complete(sessionId);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(`budget_${sessionId}`);
        sessionStorage.removeItem(`labs_${sessionId}`);
      }
      router.push(`/report?id=${sessionId}`);
    }
    catch { setError("Vaka tamamlanamadı."); setCompleting(false); }
  }

  if (!mounted) return null;
  const patient = sessionData?.case?.patient;
  const speakerName =
    sessionData?.character_name ??
    sessionData?.consultant_name ??
    patient?.name ??
    "Hasta";
  const caseInfo = sessionData?.case;
  const diff = DIFFICULTY_MAP[caseInfo?.difficulty] ?? DIFFICULTY_MAP.medium;

  return (
    <div className="h-screen flex flex-col overflow-hidden relative transition-colors" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <nav className="glass border-b flex-shrink-0 transition-all font-sans" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2.5 text-xs font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">KlinikIQ UI</span>
            </button>
            <div className="w-px h-4 bg-current opacity-10 hidden sm:block mx-1" />
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all shadow-md border active:scale-95" 
              style={{ background: "var(--surface-2)", color: "var(--primary)", borderColor: "var(--primary-light)" }}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
              <span className="text-[10px] font-black uppercase tracking-widest">Panel</span>
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <button onClick={() => setLabOpen(true)} className="group flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-md border relative overflow-hidden" style={{ background: "var(--primary)", borderColor: "var(--primary-h)", color: "white" }}>
               <div className="absolute inset-0 bg-white/10 w-0 group-hover:w-full transition-all duration-300" />
               <TestTube2 className="w-3.5 h-3.5 relative z-10" /> <span className="relative z-10 hidden xs:inline">Tetkik İste</span>
            </button>
            <button onClick={() => setExamOpen(true)} className="group flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-md border relative overflow-hidden" style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text-navy)" }}>
               <div className="absolute inset-0 bg-black/5 w-0 group-hover:w-full transition-all duration-300" />
               <Stethoscope className="w-3.5 h-3.5 relative z-10" style={{ color: "var(--primary)" }} /> <span className="relative z-10 hidden xs:inline">Fizik Muayene</span>
            </button>
            {caseInfo && <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border shadow-sm ${diff.color} hidden sm:inline-flex`}>{diff.label}</span>}
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden relative">
        {sidebarOpen && <div className="md:hidden absolute inset-0 bg-black/60 z-20" onClick={() => setSidebarOpen(false)} />}
        <aside className={`w-72 flex-shrink-0 p-4 overflow-y-auto md:relative md:translate-x-0 md:block fixed top-0 left-0 h-full z-30 transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`} style={{ background: "var(--bg)", top: "auto" }}>
           <div className="flex flex-col gap-4 h-full overflow-y-auto pb-4">
             <div className="glass rounded-2xl p-4 border flex items-center justify-between shadow-sm" style={{ background: "var(--primary-light)", borderColor: "var(--primary-light)" }}>
               <div><p className="text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: "var(--primary)" }}>SGK BÜTÇESİ</p><p className="text-xl font-black" style={{ color: "var(--primary)" }}>{budget} ₺</p></div>
               <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-inner" style={{ background: "white" }}><ShieldAlert className="w-5 h-5" style={{ color: "var(--primary)" }} /></div>
             </div>
             <div className="glass rounded-2xl p-4 border transition-all shadow-sm" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
               <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm" style={{ background: "var(--surface-2)" }}>{patient?.gender === "kadın" ? "👩" : "👨"}</div>
                 <div><p className="text-[10px] font-black uppercase tracking-wider opacity-50" style={{ color: "var(--text-muted)" }}>Hasta</p><p className="text-base font-black" style={{ color: "var(--text-navy)" }}>{loading ? "Yükleniyor..." : patient?.name ?? "—"}</p></div>
               </div>
               {loading ? <div className="space-y-2"><div className="h-4 shimmer rounded" /><div className="h-4 shimmer rounded w-3/4" /></div> : patient ? (
                 <div className="space-y-2 text-sm">
                   <InfoRow label="Yaş" value={`${patient.age} Yaşında`} />
                   <InfoRow label="Cinsiyet" value={patient.gender} />
                   <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                     <p className="text-[10px] font-black uppercase tracking-wider opacity-50 mb-1" style={{ color: "var(--text-muted)" }}>Şikayet</p>
                     <p className="text-xs leading-relaxed font-semibold italic" style={{ color: "var(--text-navy)" }}>&quot;{patient.chief_complaint}&quot;</p>
                   </div>
                   {patient.vitals && Object.keys(patient.vitals).length > 0 && (
                     <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                       <p className="text-[10px] font-black uppercase tracking-wider opacity-50 mb-2" style={{ color: "var(--text-muted)" }}>Vital Bulgular</p>
                       <div className="grid grid-cols-2 gap-1.5">
                         {Object.entries(patient.vitals as Record<string, string>).map(([key, val]) => (
                           <div key={key} className="rounded-xl p-2 text-center" style={{ background: "var(--surface-2)" }}>
                             <p className="text-[9px] font-black uppercase tracking-wider opacity-50 truncate">{key}</p>
                             <p className="text-[11px] font-black truncate" style={{ color: "var(--text-navy)" }}>{val}</p>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                 </div>
               ) : null}
             </div>
             <button onClick={() => sendMessage("[KONSÜLTASYON İSTEĞİ]")} disabled={streaming} className="w-full flex items-center justify-center gap-2 text-white font-black py-3 rounded-xl transition-all shadow-lg group relative overflow-hidden" style={{ background: "linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)" }}>
               <div className="absolute inset-0 bg-white/10 w-0 group-hover:w-full transition-all duration-300" />
               <Phone className="w-5 h-5" /> {streaming ? "İşleniyor..." : "Hocaya Danış"}
             </button>
             <div className="glass rounded-2xl p-4 border transition-all shadow-sm space-y-3" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
               <button onClick={() => setShowDiagnosis(true)} className={`w-full flex items-center gap-2 text-sm font-bold py-2.5 px-3 rounded-xl border transition-all ${diagnosisSaved ? "bg-primary-light border-primary text-primary" : "bg-surface-2 border-border text-text-navy"}`}>
                 {diagnosisSaved ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />} {diagnosisSaved ? "Tanılar Kaydedildi ✓" : "Klinik Tanı Gir"}
               </button>
               <button onClick={handleComplete} disabled={completing || !diagnosisSaved} className="w-full flex items-center justify-center gap-2 text-white text-sm font-bold py-2.5 rounded-xl transition-all shadow-lg disabled:opacity-40" style={{ background: "var(--text-navy)" }}>
                 {completing ? "Raporlanıyor..." : "Vakayı Bitir"}
               </button>
             </div>
           </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden min-w-0 m-4 ml-0 md:ml-0 glass rounded-2xl border transition-all shadow-xl" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="p-3 sm:p-5 border-b flex items-center gap-4 flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ background: "var(--primary-light)" }}><span className="text-xl">{patient?.gender === "kadın" ? "👩" : "🧑‍⚕️"}</span></div>
            <div className="min-w-0"><p className="text-sm font-black tracking-tight truncate" style={{ color: "var(--text-navy)" }}>{patient ? `${patient.name} ile Görüşme` : "Simülasyon"}</p></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed transition-all shadow-sm ${msg.role === "user" ? "rounded-tr-sm bg-primary-light text-primary" : "rounded-tl-sm border bg-surface text-text border-border"}`}>
                  <div className="flex items-center gap-2 mb-1 opacity-50 text-[10px] font-bold uppercase tracking-wider">{msg.role === "user" ? "Siz" : speakerName}</div>
                  {msg.role === "assistant" ? <RenderMessage content={msg.content} /> : msg.content}
                  {msg.isError && (
                    <button
                      onClick={retryLastMessage}
                      disabled={streaming}
                      className="mt-2 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: "var(--primary-light)", color: "var(--primary)" }}
                    >
                      <RefreshCw className="w-3 h-3" /> Yeniden Bağlan
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
          <div className="p-3 sm:p-4 border-t" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
            <div className="flex items-end gap-2 rounded-2xl px-3 py-2 transition-all shadow-inner border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <textarea ref={textareaRef} value={input} onChange={(e) => { setInput(e.target.value); if (textareaRef.current) { textareaRef.current.style.height = "auto"; textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"; } }} placeholder="Sorunuzu yazın..." rows={1} disabled={streaming} className="flex-1 bg-transparent text-sm resize-none outline-none" style={{ color: "var(--text)" }} />
              <button onClick={() => sendMessage()} disabled={!input.trim() || streaming} className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-all active:scale-95 disabled:opacity-50" style={{ background: "var(--primary)" }}><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </main>
      </div>

      {labOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setLabOpen(false)} />
          <div className="relative w-full max-w-6xl h-[85vh] shadow-2xl rounded-[2.5rem] flex flex-col overflow-hidden border" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}>
            <div className="flex-col md:flex-row h-auto md:h-20 p-4 md:px-8 border-b flex md:items-center justify-between gap-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-black tracking-tight">Laboratuvar Paneli</h2>
                <button onClick={() => setLabOpen(false)} className="w-10 h-10 md:hidden rounded-xl border flex items-center justify-center transition-all hover:bg-black/5" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}><X className="w-5 h-5" /></button>
              </div>
              <input type="text" placeholder="Tetkik ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full md:flex-1 md:max-w-md h-11 px-4 rounded-xl border text-sm outline-none" style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }} />
              <button onClick={() => setLabOpen(false)} className="hidden md:flex w-12 h-12 rounded-2xl border items-center justify-center transition-all hover:bg-black/5" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}><X className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              <aside className="w-full md:w-56 lg:w-64 border-b md:border-b-0 md:border-r overflow-x-auto md:overflow-y-auto p-2 md:p-4 flex flex-row md:flex-col gap-2 md:gap-1 flex-shrink-0" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                {LAB_CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`w-auto md:w-full flex-shrink-0 text-left px-4 py-2.5 md:py-3.5 rounded-full md:rounded-2xl font-bold text-xs md:text-sm whitespace-nowrap md:whitespace-normal transition-all ${selectedCategory === cat.id ? "shadow-md" : "opacity-60"}`} style={{ background: selectedCategory === cat.id ? "var(--surface)" : "transparent", color: selectedCategory === cat.id ? "var(--primary)" : "var(--text)" }}>{cat.label}</button>
                ))}
              </aside>
              <main className="flex-1 overflow-y-auto p-4 md:p-8" style={{ background: "var(--surface)" }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                  {LAB_TESTS.filter(t => (searchQuery ? t.name.toLowerCase().includes(searchQuery.toLowerCase()) : t.category === selectedCategory)).map(test => {
                    const isSelected = selectedLabs.includes(test.id);
                    return (
                      <button key={test.id} onClick={() => toggleLab(test.id, test.price)} className={`p-4 rounded-2xl md:rounded-3xl border transition-all text-left min-h-[5.5rem] md:min-h-[6.25rem] flex flex-col justify-between hover:scale-105 active:scale-95 shadow-sm`} style={{ background: isSelected ? "var(--primary-light)" : "var(--surface)", borderColor: isSelected ? "var(--primary)" : "var(--border)", color: "var(--text)" }}>
                        <span className="text-xs md:text-sm font-black line-clamp-3 leading-tight pr-2">{test.name}</span>
                        <span className="text-[10px] md:text-xs font-bold opacity-80" style={{ color: "var(--primary)" }}>{test.price} ₺</span>
                      </button>
                    );
                  })}
                </div>
              </main>
              <aside className="w-full md:w-72 lg:w-80 h-40 md:h-auto flex-shrink-0 border-t md:border-t-0 md:border-l flex flex-col" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                <div className="p-4 md:p-6 border-b font-black text-xs uppercase tracking-widest" style={{ borderColor: "var(--border)" }}>Sepet ({selectedLabs.length})</div>
                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2">
                  {selectedLabs.map(id => (
                    <div key={id} className="p-3 rounded-xl border flex justify-between items-center text-xs font-bold shadow-sm transition-all" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}>
                      <span className="truncate pr-2">{LAB_TESTS.find(t => t.id === id)?.name}</span>
                      <button onClick={() => toggleLab(id, 0)} className="text-danger hover:scale-110 active:scale-95 transition-transform"><Trash className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
                <div className="p-4 md:p-6 border-t" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                   <button onClick={orderLabs} disabled={selectedLabs.length === 0} className="w-full text-white font-black py-3 md:py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-95 flex justify-center items-center gap-2 group relative overflow-hidden" style={{ background: "var(--primary)" }}>
                        <div className="absolute inset-0 bg-white/20 w-0 group-hover:w-full transition-all duration-300" />
                        Tetkikleri İste
                   </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {examOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setExamOpen(false)} />
          <div className="relative w-full max-w-6xl h-[85vh] shadow-2xl rounded-[2.5rem] flex flex-col overflow-hidden border" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" }}>
            <div className="h-16 md:h-20 px-4 md:px-8 border-b flex items-center justify-between" style={{ background: "var(--surface)" }}>
              <h2 className="text-lg md:text-xl font-black">Fizik Muayene</h2>
              <button onClick={() => setExamOpen(false)} className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl border flex items-center justify-center transition-all hover:bg-black/5" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}><X className="w-5 h-5 md:w-6 md:h-6" /></button>
            </div>
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              <aside className="w-full md:w-56 lg:w-64 border-b md:border-b-0 md:border-r overflow-x-auto md:overflow-y-auto p-2 md:p-4 flex flex-row md:flex-col gap-2 md:gap-1 flex-shrink-0" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                {EXAM_CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setSelectedExamCategory(cat.id)} className={`w-auto md:w-full flex-shrink-0 text-left px-4 py-2.5 md:py-3 rounded-full md:rounded-2xl font-bold text-xs md:text-sm whitespace-nowrap md:whitespace-normal transition-all ${selectedExamCategory === cat.id ? "shadow-md" : "opacity-60"}`} style={{ background: selectedExamCategory === cat.id ? "var(--surface)" : "transparent", color: selectedExamCategory === cat.id ? "var(--primary)" : "var(--text)" }}>{cat.label}</button>
                ))}
              </aside>
              <main className="flex-1 overflow-y-auto p-4 md:p-8" style={{ background: "var(--surface)" }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                  {EXAM_ITEMS.filter(e => e.category === selectedExamCategory).map(exam => (
                    <button key={exam.id} onClick={() => { sendMessage(exam.message); setExamOpen(false); }} className="p-4 rounded-2xl md:rounded-3xl border hover:-translate-y-1 transition-all text-left h-20 md:h-24 flex flex-col justify-between" style={{ background: "var(--surface-2)", borderColor: "var(--border)", color: "var(--text)" }}>
                      <span className="text-xs md:text-sm font-black line-clamp-2 leading-tight pr-2">{exam.name}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--primary)" }}>Uygula</span>
                    </button>
                  ))}
                </div>
              </main>
            </div>
          </div>
        </div>
      )}

      {showDiagnosis && <DiagnosisForm initialDiagnoses={savedDiagnoses} onSubmit={handleDiagnosisSubmit} onClose={() => setShowDiagnosis(false)} />}
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
