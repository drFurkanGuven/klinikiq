"use client";
import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft, Brain, BookOpen, HelpCircle, ChevronRight, Home } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type Sev = "high" | "mid" | "low";
type PearlType = "red" | "blue" | "yellow";
interface LesionSite { site: string; cause: string; note: string; }
interface Symptom { s: string; sev: Sev; }
interface Pearl { type: PearlType; title: string; text: string; }
interface NerveData {
  name: string; category: string; color: string;
  roots: string; origin: string; course?: string;
  motor: string[]; sensory: string; reflexes: string;
  lesion_sites?: LesionSite[]; symptoms: Symptom[];
  differentials?: string[]; pearls?: Pearl[];
}
interface QuizItem {
  q: string; context?: string; opts: string[]; ans: number; exp: string;
}

// ── Data ───────────────────────────────────────────────────────────
const NERVES: Record<string, NerveData> = {
  n_radialis: {
    name: "N. Radialis", category: "Periferik — Üst Ekstremite", color: "purple",
    roots: "C5, C6, C7, C8 (T1)",
    origin: "Brakiyal pleksus — posterior kord",
    course: "Aksilla → humerus arka yüzü (spiral groove) → lateral epikondil önü → yüzeyel ve derin dallara ayrılır",
    motor: ["Triceps brachii (dirsek ekstansiyonu)","Brachioradialis","Extensor carpi radialis longus/brevis (bilek ekstansiyonu)","Supinator (ön kol supinasyonu)","Extensor digitorum (parmak ekstansiyonu)","Abductor pollicis longus / Extensor pollicis brevis/longus"],
    sensory: "Ön kolun dorsal lateral yüzü, el sırtı, başparmak ve 1.–2. web space dorsal yüzü",
    reflexes: "Brachioradialis refleksi (C5–C6), triceps refleksi (C7)",
    lesion_sites: [
      { site: "Aksilla", cause: "Koltuk değneği basısı, tümör", note: "Triceps etkilenir" },
      { site: "Spiral groove (humerus ortası)", cause: 'Humerus kırığı, "Saturday night palsy"', note: "Wrist drop + parmak drop; triceps korunabilir" },
      { site: "Lateral epikondil önü", cause: "Dirsek kırığı", note: "Yüzeyel duyu kaybı + ekstansör zayıflık; brachioradialis korunur" },
    ],
    symptoms: [
      { s: "Wrist drop (düşük el bilek ekstansiyonu yok)", sev: "high" },
      { s: "Parmak MCP ekstansiyon kaybı", sev: "high" },
      { s: "Ön kol supinasyon zayıflığı", sev: "mid" },
      { s: "Brachioradialis refleksi kaybı", sev: "mid" },
      { s: "El sırtı / başparmak birinci web space duyu azalması", sev: "low" },
      { s: "Spiral groove lezyonunda triceps etkilenir (aksilla lezyonunda da)", sev: "mid" },
    ],
    differentials: ["C7 radikülopatisi: Boyun ağrısı, Spurling testi +, triceps refleksi kaybı","Posterior interosseöz sinir lezyonu: Wrist drop yok (ekstansör carpi radialis korunur), sadece parmak drop"],
    pearls: [
      { type: "red", title: "Kritik Nokta", text: "Spiral groove lezyonunda triceps genellikle etkilenmez veya hafif etkilenir, çünkü triceps dalı daha proksimalde çıkar. Aksilla lezyonunda ise tümü etkilenir." },
      { type: "blue", title: "Klinik İpucu", text: '"Saturday night palsy" veya "honeymoon palsy": Kol uzun süre baskı altında kalıp uyumak → spiral groove basısı.' },
      { type: "yellow", title: "Sınav Sorusu", text: "Wrist drop varsa → N. Radialis. Ancak bilek ekstansiyonu mevcut, sadece parmak drop varsa → Posterior İnterosseöz Sinir (PIN) lezyonu düşün." },
    ],
  },
  n_medianus: {
    name: "N. Medianus", category: "Periferik — Üst Ekstremite", color: "purple",
    roots: "C6, C7, C8, T1",
    origin: "Brakiyal pleksus — lateral + medial kordun birleşimi",
    course: "Aksilla → kolun medialinden iner → dirsek önü → pronator teres arasında → karpal tünelden geçer",
    motor: ["Pronator teres & pronator quadratus (ön kol pronasyonu)","Flexor carpi radialis (bilek fleksiyonu)","Palmaris longus","Flexor digitorum superficialis (tüm parmaklar)","Flexor digitorum profundus 1.–2. parmak (FDP)","Thenar kaslar: Abductor pollicis brevis, Opponens pollicis, Flexor pollicis brevis (yüzeyel başı)","Lumbrical 1. ve 2."],
    sensory: "Palmar yüzde başparmak, işaret, orta parmak ve yüzük parmağının radial yarısı; bu parmakların dorsal distal falanksleri",
    reflexes: "Direkt refleks yok; EMG ile değerlendirilir",
    lesion_sites: [
      { site: "Yüksek (dirsek üstü) lezyon", cause: "Suprakondiler humerus kırığı (çocuk)", note: 'Tüm median sinir fonksiyonları etkilenir, "benediction hand" işareti var' },
      { site: "Karpal tünel (bilek)", cause: "Karpal tünel sendromu (en sık)", note: "Sadece thenar etkilenir; FDS/FDP korunur; Tinel & Phalen testi +" },
      { site: "Anterior İnterosseöz Sinir (AIS)", cause: "Travma, fibröz bant", note: "Saf motor: FDP (1.–2.), FPL, pronator quadratus. Duyu kaybı yok." },
    ],
    symptoms: [
      { s: "Maymun eli (ape hand): Başparmak thenar atrofisi + yassılaşma", sev: "high" },
      { s: "Başparmak opozisyonu kaybı (yazı yazma güçlüğü)", sev: "high" },
      { s: "İşaret/orta parmak fleksiyonu güçlüğü (DIP)", sev: "high" },
      { s: '"OK işareti yapamama" (AIS lezyonu)', sev: "mid" },
      { s: "Gece uyarısı ile parmaklarda uyuşma/yanma (KTS)", sev: "mid" },
      { s: "Palmar 3.5 parmakta duyu azalması", sev: "low" },
    ],
    differentials: ["C8–T1 radikülopatisi: Boyun ağrısı, tüm intrinsikler etkilenir","Anterior İnterosseöz Sinir: Saf motor, duyu kaybı yok, \"OK işareti\" bozuk","N. Ulnaris: Yüzük + serçe parmak, hipotenar atrofi, pençe el"],
    pearls: [
      { type: "red", title: "Kritik Nokta", text: "Karpal tünel sendromu (KTS) = median sinirin bilek seviyesi lezyonu. Thenar atrofi görülür ancak FDS/FDP korunduğu için maymun eli olmaz. Maymun eli için yüksek lezyon gerekir." },
      { type: "blue", title: "Klinik İpucu", text: "Tinel testi: Bileğe perküsyon → parmakta karıncalanma. Phalen testi: Bileği 60 sn fleksiyonda tutmak → semptom. İkisi birlikte %80+ duyarlılık." },
      { type: "yellow", title: "Sınav Sorusu", text: "OK işareti yapamıyorsa (işaret ve başparmak tam halka oluşturamıyor) → Anterior İnterosseöz Sinir Lezyonu. Duyu kaybı yoktur." },
    ],
  },
  n_ulnaris: {
    name: "N. Ulnaris", category: "Periferik — Üst Ekstremite", color: "purple",
    roots: "C8, T1",
    origin: "Brakiyal pleksus — medial kord",
    course: "Aksilla → kolun medialinden iner → dirsek arkasından (kubital tünel) → Guyon kanalından (bilek) → elde terminal dallara ayrılır",
    motor: ["Flexor carpi ulnaris (bilek ulnar fleksiyon)","Flexor digitorum profundus 4.–5. parmak","Hipotenar kaslar (Abductor, Flexor, Opponens digiti minimi)","İnterosseoz kaslar (parmak abduksiyonu/adduksiyonu)","Lumbrikal 3. ve 4.","Adductor pollicis + Flexor pollicis brevis (derin başı)"],
    sensory: "Palmar ve dorsal yüzde 5. parmak ve 4. parmağın ulnar yarısı; hipotenar bölge",
    reflexes: "Direkt klinik refleks yok",
    lesion_sites: [
      { site: "Kubital tünel (dirsek)", cause: "Dirsek kırığı, uzun süre dirsek bükük tutma", note: "En sık lezyon yeri; FCU ve FDP4-5 etkilenir" },
      { site: "Guyon kanalı (bilek)", cause: "Bisiklet gidonuna bası, ganglion kisti", note: "FCU ve FDP4-5 korunur; sadece el içi kaslar ve duyu" },
    ],
    symptoms: [
      { s: "Pençe eli (claw hand): 4.–5. parmakta MCP hiperekstensiyon + IP fleksiyon", sev: "high" },
      { s: "İnterosseouz atrofi (el sırtında çukurlaşma)", sev: "high" },
      { s: "Parmak abduksiyonu kaybı (kağıt tutma testi +)", sev: "high" },
      { s: "Froment işareti: Başparmak adduksiyonu zayıf → okuma pozisyonunda IP fleksiyon", sev: "mid" },
      { s: "4.–5. parmak ve hipotenar bölgede duyu azalması", sev: "mid" },
      { s: "5. parmak DIP fleksiyon kaybı (FDP4-5)", sev: "low" },
    ],
    differentials: ["C8–T1 radikülopatisi: Boyun ağrısı, median ve ulnar birlikte etkilenebilir","N. Medianus yüksek lezyon: Maymun eli (başparmak), daha farklı dağılım","TOS (Torasik çıkış sendromu): Alt trunkus baskısı → C8–T1 her iki sinir"],
    pearls: [
      { type: "red", title: "Kritik Nokta — Ulnar Paradoks", text: "Ulnar sinir lezyonunda pençe eli paradoksal olarak proksimal lezyonda daha azdır. Çünkü dirsek üstü lezyonda FDP4-5 de etkilenir → 4.–5. parmak IP fleksiyonu azalır → pençe daha az belirgin görünür." },
      { type: "blue", title: "Klinik İpucu", text: "Froment işareti: Hastadan iki eliyle kağıt tutmasını iste. Etkilenen elde başparmak IP eklemi fleksiyona giderse (Adductor pollicis zayıflığını FPL kompanse eder) → Froment +." },
      { type: "yellow", title: "Sınav Sorusu", text: "Pençe el → Ulnar. Maymun el → Median. Wrist drop → Radial. Bu üçlüyü ezberle." },
    ],
  },
  n_axillaris: {
    name: "N. Axillaris", category: "Periferik — Üst Ekstremite", color: "purple",
    roots: "C5, C6", origin: "Brakiyal pleksus — posterior kord",
    course: "Aksilladan quadrilateral space üzerinden → humeral boyun etrafından döner → deltoid ve teres minor'u innerve eder",
    motor: ["Deltoid (omuz abduksiyonu 15°–90°)","Teres minor (dış rotasyon)"],
    sensory: "Omuz laterali (regimental patch = apolet bölgesi)", reflexes: "Yok",
    lesion_sites: [
      { site: "Humerus cerrahi boynu", cause: "Humerus boynu kırığı, omuz çıkığı", note: "En sık neden" },
      { site: "Quadrilateral space", cause: "Quadrilateral space sendromu", note: "Nadir" },
    ],
    symptoms: [
      { s: "Omuz abduksiyonu 15°–90° arası zayıflık", sev: "high" },
      { s: "Deltoid atrofisi", sev: "high" },
      { s: "Omuz dış rotasyonu hafif zayıflığı", sev: "mid" },
      { s: "Omuz lateral duyusu azalması (apolet bölgesi)", sev: "low" },
    ],
    differentials: ["Rotator kaf yırtığı: Görüntüleme ile ayrılır, duyu kaybı yok","C5 radikülopatisi: Biseps refleksi de etkilenir, boyun ağrısı eşlik eder"],
    pearls: [
      { type: "red", title: "Kritik Nokta", text: "Omuz abduksiyonunun ilk 15°'si skapular kaslarla (supraspinatus) yapılır. N. Axillaris lezyonunda deltoid yoktur ama hasta hiç kaldıramaz demez — tricky bir muayene noktasıdır." },
      { type: "yellow", title: "Sınav Sorusu", text: "Humerus boynu kırığı + omuz abduksiyonu kaybı + apolet bölgesi duyu kaybı = N. Axillaris lezyonu." },
    ],
  },
  n_musculocutaneus: {
    name: "N. Musculocutaneus", category: "Periferik — Üst Ekstremite", color: "purple",
    roots: "C5, C6", origin: "Brakiyal pleksus — lateral kord",
    course: "Lateral korddan çıkar → coracobrachialis içinden geçer → biceps ve brachialis'i innerve eder → lateral antebrakiyal kutanöz sinir olarak devam eder",
    motor: ["Biceps brachii (dirsek fleksiyonu + supinasyon)","Brachialis (dirsek fleksiyonu)","Coracobrachialis"],
    sensory: "Ön kolun lateral (radial) yüzü — N. Cutaneus Antebrachii Lateralis",
    reflexes: "Biseps refleksi (C5–C6)",
    lesion_sites: [{ site: "İzole lezyon", cause: "Nadir; yoğun spor, aksiller kanama", note: "" }],
    symptoms: [
      { s: "Dirsek fleksiyonu zayıflığı (özellikle supinasyonda)", sev: "high" },
      { s: "Biseps refleksi kaybı", sev: "high" },
      { s: "Ön kol lateral yüz duyu azalması", sev: "mid" },
    ],
    differentials: ["C5–C6 radikülopatisi: Boyun ağrısı, aksiller de etkilenebilir"],
    pearls: [{ type: "blue", title: "Klinik İpucu", text: "İzole N. Musculocutaneus lezyonu oldukça nadirdir. Biseps refleksi kaybı + dirsek fleksiyon zayıflığı + ön kol lateral duyu kaybı üçlüsü birlikte varsa düşün." }],
  },
  n_femoralis: {
    name: "N. Femoralis", category: "Periferik — Alt Ekstremite", color: "orange",
    roots: "L2, L3, L4", origin: "Lomber pleksus",
    course: "Psoas majör içinde oluşur → inguinal ligamanın altından geçer → uyluk ön yüzüne ulaşır → terminal dalları: safen sinir",
    motor: ["Quadriceps femoris (diz ekstansiyonu)","İliopsoas (kalça fleksiyonu)","Sartorius, Pectineus"],
    sensory: "Ön ve iç uyluk, diz iç yüzü ve bacak mediali (n. saphenus)",
    reflexes: "Patellar refleks (L3–L4)",
    lesion_sites: [
      { site: "İnguinal ligaman", cause: "Retroperitoneal hematom (antikoagülan), pelvik tümör", note: "En sık neden retroperitoneal hematom" },
      { site: "İntraabdominal", cause: "Psoas apsesi, hematom", note: "Kalça fleksiyonu da etkilenir" },
    ],
    symptoms: [
      { s: "Diz ekstansiyonu zayıflığı (merdiven çıkamama, çömelme güçlüğü)", sev: "high" },
      { s: "Patellar refleks kaybı", sev: "high" },
      { s: "Ön uyluk ve diz iç yüzü duyu azalması", sev: "mid" },
      { s: "Kalça fleksiyonu zayıflığı (proksimal lezyon)", sev: "mid" },
    ],
    differentials: ["L3–L4 radikülopatisi: Bel ağrısı, posterior uyluk yayılımı","N. Obturatorius lezyonu: İç uyluk adduksiyonu kaybı"],
    pearls: [
      { type: "red", title: "Kritik Nokta", text: "Retroperitoneal hematom (antikoagülan tedavide) en sık nedenidir. Ani başlayan kasık ağrısı + quadriceps zayıflığı olan antikoagülan hastada N. Femoralis lezyonu mutlaka düşünülmeli." },
      { type: "yellow", title: "Sınav Sorusu", text: "Patellar refleks kaybı = L3–L4 veya N. Femoralis. Bel ağrısı varsa radikülopati; yoksa periferik nöropati düşün." },
    ],
  },
  n_ischiadicus: {
    name: "N. Ischiadicus (Siyatik Sinir)", category: "Periferik — Alt Ekstremite", color: "orange",
    roots: "L4, L5, S1, S2, S3", origin: "Sakral pleksus",
    course: "Büyük siyatik foramen → gluteus maximus altı → uyluk posterior → popliteal fossa üzerinde N. Peroneus + N. Tibialis'e bölünür",
    motor: ["Hamstring grubu: Biceps femoris, Semitendinosus, Semimembranosus (diz fleksiyonu)","N. Peroneus aracılığıyla ayak dorsifleksiyonu/eversiyon","N. Tibialis aracılığıyla ayak plantar fleksiyonu/inversiyon"],
    sensory: "Diz altı tüm bacak ve ayak (peroneal + tibial dağılım)",
    reflexes: "Aşil refleksi (S1–S2)",
    lesion_sites: [
      { site: "Büyük siyatik foramen çıkışı", cause: "Piriformis sendromu, kalça protezi, enjeksiyon hasarı", note: "" },
      { site: "Uyluk posterior", cause: "Künt travma, hematom", note: "" },
    ],
    symptoms: [
      { s: "Diz fleksiyonu zayıflığı (hamstringler)", sev: "high" },
      { s: "Tüm ayak kas güçsüzlüğü (dorsifleksiyon + plantar fleksiyon)", sev: "high" },
      { s: "Siyatik ağrı: Gluteal bölge → uyluk posterior → diz altı", sev: "high" },
      { s: "Aşil refleksi kaybı", sev: "mid" },
      { s: "Diz altı duyu kaybı (peroneal + tibial dağılım)", sev: "mid" },
    ],
    differentials: ["L4–S1 radikülopatisi (disk hernisi): Çok sık, düz bacak kaldırma testi + (Lasègue)","N. Peroneus izole lezyonu: Sadece dorsifleksiyon/eversiyon kaybı, plantar fleksiyon korunur"],
    pearls: [
      { type: "red", title: "Kritik Nokta", text: "Kalça enjeksiyonlarında siyatik sinir hasarı üst-dış kadran kullanımıyla önlenir. Yanlış bölgeye enjeksiyon → kalıcı siyatik hasar." },
      { type: "blue", title: "Klinik İpucu", text: "Piriformis sendromu: Oturmakla ağrı, Lasègue - veya hafif +, FAIR testi (fleksiyon + iç rotasyon + adduksiyon) +. Disk hernisinden ayırımı MRI ile." },
    ],
  },
  n_peroneus: {
    name: "N. Peroneus Communis", category: "Periferik — Alt Ekstremite", color: "orange",
    roots: "L4, L5, S1", origin: "N. Ischiadicus'un peroneal bölümü → fibula başı çevresinden döner",
    course: "Popliteal fossa → fibula başı lateral/posterior → fibula boynu etrafından döner (bası noktası!) → derin ve yüzeyel dal",
    motor: ["Derin peroneal: Tibialis anterior (dorsifleksiyon), ekstansörler","Yüzeyel peroneal: Peroneus longus/brevis (eversiyon)"],
    sensory: "Bacağın anterolateral yüzü, ayak dorsal yüzü ve 1.–2. web space (derin dal)",
    reflexes: "Tibialis anterior testi",
    lesion_sites: [{ site: "Fibula boynu", cause: "Alçı, bacak bacak üstüne atma, uzun yatış, kilo kaybı", note: "En sık lezyon yeri — basıya çok açık" }],
    symptoms: [
      { s: "Foot drop (ayak dorsifleksiyonu yok, stepaj yürüyüşü)", sev: "high" },
      { s: "Ayak eversiyonu kaybı", sev: "high" },
      { s: "Bacak anterolateral + ayak dorsal duyu kaybı", sev: "mid" },
      { s: "Plantar fleksiyon ve inversiyon korunur (Tibialis)", sev: "low" },
    ],
    differentials: ["L4–L5 radikülopatisi: Bel ağrısı, tibialis posterior da etkilenebilir (inversiyon zayıf)","N. Ischiadicus lezyonu: Hamstring + plantar fleksiyon da etkilenir"],
    pearls: [
      { type: "red", title: "Kritik Nokta", text: "Foot drop'ta ayak eversiyonu kaybolmuşsa → N. Peroneus. Eversiyon korunmuşsa → L4–L5 radikülopatisi (tibialis posterior = L5, inversiyon kaybı olur). Bu ayrım sınav sorusudur." },
      { type: "yellow", title: "Sınav Sorusu", text: "Alçı sonrası foot drop → Fibula boynu basısı → N. Peroneus Communis." },
    ],
  },
  n_tibialis: {
    name: "N. Tibialis", category: "Periferik — Alt Ekstremite", color: "orange",
    roots: "L4, L5, S1, S2, S3", origin: "N. Ischiadicus'un tibial bölümü",
    course: "Popliteal fossa → bacak posterior → medial malleol arkasından (tarsal tünel) → ayak tabanına girer",
    motor: ["Gastrocnemius + Soleus (plantar fleksiyon)","Tibialis posterior (inversiyon)","Ayak içi kaslar (lumbrikaller, interosseozlar)"],
    sensory: "Ayak tabanı (medial ve lateral plantar sinirler)",
    reflexes: "Aşil refleksi (S1–S2)",
    lesion_sites: [{ site: "Tarsal tünel (medial malleol)", cause: "Tarsal tünel sendromu, ayak bileği kırığı", note: "" }],
    symptoms: [
      { s: "Plantar fleksiyon zayıflığı", sev: "high" },
      { s: "Aşil refleksi kaybı", sev: "high" },
      { s: "Ayak tabanı uyuşukluğu, yanma (tarsal tünel)", sev: "mid" },
      { s: "Yürüyüşte itme fazı güçlüğü", sev: "mid" },
    ],
    differentials: ["S1 radikülopatisi: Bel ağrısı, aşil refleksi kaybı, büyük ayak parmağı lateral duyu","N. Peroneus lezyonu: Dorsifleksiyon/eversiyon kaybı, plantar fleksiyon korunur"],
    pearls: [{ type: "blue", title: "Klinik İpucu", text: "Tarsal tünel sendromu: Ayak tabanında yanma/uyuşma + medial malleol arkasına perküsyon ile Tinel +. Karpal tünel sendromuyla analoji kur." }],
  },
  cn5: {
    name: "CN V — N. Trigeminus", category: "Kraniyal Sinir", color: "green",
    roots: "Pons düzeyinde nükleus", origin: "Pons lateral yüzünden çıkar → Meckel's cave → Gasser gangliyonu → 3 dala ayrılır",
    motor: ["V3 (mandibüler): Masseter, temporalis, pterygoidler (çiğneme kasları)","Tensor tympani, tensor veli palatini, mylohyoid, anterior digastrik"],
    sensory: "V1 (oftalmik): Alın, burun, kornea, üst göz kapağı\nV2 (maksillar): Yanak, alt göz kapağı, üst dudak, üst diş\nV3 (mandibüler): Alt yanak, alt dudak, alt diş, ön 2/3 dil duyusu (tat değil), kulak önü",
    reflexes: "Kornea refleksi (afferent: V1, efferent: VII)\nÇene jerk refleksi (masseterin uzama refleksi — pons)",
    lesion_sites: [
      { site: "Gasser gangliyonu / köken", cause: "Herpes zoster, tümör, MVD", note: "Tüm V dalları" },
      { site: "Kavernöz sinüs", cause: "Tromboz, tümör", note: "CN III, IV, V1–V2, VI birlikte" },
      { site: "Foramen ovale", cause: "Tümör, fraktür", note: "V3 izole" },
    ],
    symptoms: [
      { s: "Trigeminal nevralji: Elektrik çarpar gibi kısa ataklar, trigger nokta", sev: "high" },
      { s: "Yüz duyusu kaybı: Etkilenen dal dağılımına göre", sev: "mid" },
      { s: "Kornea refleksi kaybı (V1 lezyonu)", sev: "mid" },
      { s: "Çiğneme güçlüğü + masseter atrofisi (V3 lezyonu)", sev: "mid" },
      { s: "Çene deviasyonu: Motor V3 lezyonunda etkilenen tarafa", sev: "mid" },
    ],
    differentials: ["Atipik yüz ağrısı: Trigger nokta yok, sürekli ağrı","Dental ağrı: Klinik muayene ile","MS plakı: Genç hasta, ek bulgular"],
    pearls: [
      { type: "red", title: "Kritik Nokta", text: "Trigeminal nevralji: 50 yaş üstü, sağ taraf daha sık, V2–V3 en sık. Genç + bilateral → MS düşün. Tedavi: Karbamazepin ilk tercih." },
      { type: "blue", title: "Klinik İpucu", text: "Kornea refleksi: V1 afferent yol, CN VII efferent. CN VII lezyonunda göz kapanmaz ama his (V1) var. V1 lezyonunda his yok ama kas çalışır. Hangi sinirin etkilendiğini bu şekilde ayırt edebilirsin." },
      { type: "yellow", title: "Sınav Sorusu", text: "Çiğneme güçlüğü + çene etkilenen tarafa kayıyor → V3 motor lifleri etkilenmiş. Karşı pterygoidler çeneyi etkilenen tarafa iter." },
    ],
  },
  cn7: {
    name: "CN VII — N. Facialis", category: "Kraniyal Sinir", color: "green",
    roots: "Pons alt kısmı, fasiyal nükleus", origin: "Pons-medulla bileşkesinden çıkar → internal akustik kanal → fasyal kanal → stilomastoid foramen → parotis bezinden geçer → 5 terminal dal",
    motor: ["Tüm yüz ifadesi kasları (frontal, orbicularis oculi, orbicularis oris, platysma vb.)","Stapedius (hiperakkuzi)","Stylohyoid, posterior digastrik"],
    sensory: "Anterior 2/3 dil tat duyusu (chorda tympani aracılığıyla)\nKulak yolu posterior küçük deri alanı",
    reflexes: "Kornea refleksi efferent kolu (VII)\nBlinks refleksi",
    lesion_sites: [
      { site: "Supranükleer (UMN — korteks)", cause: "İnme, tümör", note: "Alın kurtulur (santral felç), kontralateral alt yüz felci" },
      { site: "Nükleer veya infranükleer (LMN — Bell palsi)", cause: "Bell palsi, Ramsay Hunt, tümör, parotis", note: "Alın dahil tüm yüz etkilenir (periferik)" },
    ],
    symptoms: [
      { s: "Santral (UMN): Kontralateral alt yüz felci, alın hareketleri korunur", sev: "high" },
      { s: "Periferik (LMN): Aynı taraf tüm yüz felci (alın dahil)", sev: "high" },
      { s: "Lagoftalmi (göz kapanmaması) → kornea kuruması", sev: "high" },
      { s: "Ağız deviyasyonu karşı tarafa", sev: "mid" },
      { s: "Tat kaybı (chorda tympani lezyonu, temporal kemik içi)", sev: "mid" },
      { s: "Hiperakkuzi (stapedius etkilenirse)", sev: "low" },
    ],
    differentials: ["Bell palsi (idiyopatik periferik): Genellikle viral (HSV), %80 tam iyileşme","Ramsay Hunt sendromu: Kulakta veziküler döküntü + işitme kaybı + vertigo + fasiyal felç","Parotis tümörü: Yavaş başlangıç, kitlesi var"],
    pearls: [
      { type: "red", title: "Kritik Nokta — Santral vs Periferik", text: "Alın etkilenmiş mi? Evet → Periferik (Bell palsi). Alın korunmuş → Santral (inme). Çünkü frontal korteks iki taraflı temsil edilir; karşı taraf kortekste lezyon olsa bile alın kasları korunur." },
      { type: "blue", title: "Ramsay Hunt Sendromu", text: "Herpes zoster geniculate ganglion'ı tutarsa: Kulak kepçesi/yolu veziküler döküntü + fasiyal felç + işitme kaybı + vertigo. Bell palsi'ye göre daha kötü prognoz." },
      { type: "yellow", title: "Sınav Sorusu", text: "Bell palsi tedavisi: Prednizon (oral kortikosteroid) + göz koruma. Antiviral eklenmesi tartışmalı ama Ramsay Hunt'ta eklenir." },
    ],
  },
  cn8: {
    name: "CN VIII — N. Vestibulocochlearis", category: "Kraniyal Sinir", color: "green",
    roots: "Pontomedüller bileşke", origin: "İç kulak → internal akustik kanal → beyin sapı",
    motor: ["Motor innervasyonu yok"],
    sensory: "Koklear dal: İşitme (spiral ganglion → korteks işitme alanı)\nVestibüler dal: Denge/baş pozisyonu (semisirkular kanallar + utrikulus/sakkulus)",
    reflexes: "Vestibulo-oküler refleks (VOR)\nAkustik blefarospazm refleksi",
    lesion_sites: [
      { site: "Periferik vestibüler", cause: "BPPV, labirentit, Meniere", note: "En sık vertigo nedenleri" },
      { site: "CN VIII siniri", cause: "Vestibüler schwannoma (akustik nöroma)", note: "Tek taraflı işitme kaybı + tinnitus" },
      { site: "Santral vestibüler", cause: "Beyin sapı/serebellar inme", note: "Daha tehlikeli, fokal bulgular eşlik eder" },
    ],
    symptoms: [
      { s: "Vertigo: Periferik — başlangıç ani, pozisyonel, bulantı şiddetli, nistagmus yatay-torsiyonel", sev: "high" },
      { s: "İşitme kaybı (sensorinöral, tek taraflı → schwannoma)", sev: "high" },
      { s: "Tinnitus", sev: "mid" },
      { s: "Nistagmus: Periferik → tek yönlü, fiksasyonla baskılanır; santral → değişken yön, baskılanmaz", sev: "mid" },
      { s: "Düşme eğilimi etkilenen tarafa (vestibüler ataksi)", sev: "mid" },
    ],
    differentials: ["BPPV: Pozisyonel, Dix-Hallpike testi +, latans ve yorulma var, işitme kaybı yok","Meniere hastalığı: Epizodik vertigo + düşük frekanslı işitme kaybı + tinnitus + kulak dolgunluğu","Vestibüler nörit: Ani başlayan, sürekli vertigo, viral geçmiş, işitme kaybı yok","Santral: HINTS muayenesi — negatif head impulse testi santral lezyonu düşündürür"],
    pearls: [
      { type: "red", title: "Kritik Nokta — HINTS Muayenesi", text: "Akut vertigo + yürüme güçlüğünde HINTS muayenesi: (1) Head Impulse Testi negatif, (2) Direction-changing nistagmus, (3) Skew deviasyon → SANTRAL (inme). Bunlardan biri bile varsa görüntüleme!" },
      { type: "yellow", title: "Sınav Sorusu", text: "Tek taraflı sensorinöral işitme kaybı + tinnitus + denge bozukluğu → Akustik Nöroma (Vestibüler Schwannoma). MRI kontrastlı gereklidir." },
    ],
  },
  cn3: {
    name: "CN III — N. Oculomotorius", category: "Kraniyal Sinir", color: "green",
    roots: "Mezensefalon (III. sinir nükleusu)", origin: "Mezensefalon → kavernöz sinüsten geçer → superior orbital fissürden orbita içine girer",
    motor: ["Superior, inferior, medial rektus kasları (göz hareketleri)","İnferior oblik kas","Levator palpebrae superioris (üst kapak)","Sfinkter pupillae (parasempatik — miyozis)","Silier kas (akomodasyon)"],
    sensory: "Yok",
    reflexes: "Işık refleksi (parasempatik = Edinger-Westphal nükleusu)",
    lesion_sites: [
      { site: "İntrinsik (parasempatik korunmuş — diyabetik)", cause: "Diyabetik okulomotor palsi", note: "Pupil korunur → diyabetik/vasküler neden" },
      { site: "Ekstrinsik (parasempatik etkilenmiş)", cause: "Posterior kommunikan arter anevrizması, herniasyon", note: "Pupil dilate (midriyazis) → ACİL!" },
    ],
    symptoms: [
      { s: "Pitoz (üst kapak düşüklüğü)", sev: "high" },
      { s: '"Down and out" göz pozisyonu (IV + VI korunmuş)', sev: "high" },
      { s: "Diplopi", sev: "high" },
      { s: "Midriyazis (pupil dilatasyonu — kompresif lezyonda)", sev: "high" },
      { s: "Işık refleksi kaybı (kompresif lezyonda)", sev: "high" },
    ],
    differentials: ["Diyabetik CN III: Pupil korunur, ağrı olabilir, 3 ayda iyileşir","Posterior kommunikan anevrizma: Pupil dilate + ağrılı → ACİL anjiografi","Horner sendromu: Pitoz + miyozis (ptoz hafif, pupil küçük — tam tersi!)"],
    pearls: [
      { type: "red", title: "ACİL — Pitoz + Midriyazis", text: "Ağrılı pitoz + midriyazis + 'down-out' göz → Posterior kommunikan arter anevrizması açılıyor olabilir. Diyabetik CN III lezyonunda pupil korunur." },
      { type: "yellow", title: "Sınav Sorusu", text: "Pupil tutulmuş mu? Evet → Kompresif (anevrizma). Hayır → Diyabetik/vasküler. Parasempatik lifler CN III'ün dış yüzeyinde seyreder, basıya erken tepki verir." },
    ],
  },
  cn9_10: {
    name: "CN IX / X — Glossofarengeal & Vagus", category: "Kraniyal Sinir", color: "green",
    roots: "Medulla oblongata — nükleus ambiguus (motor), nükleus traktus solitarius (duyusal)", origin: "Jugüler foramen üzerinden kafatasını terk eder",
    motor: ["CN IX: Stilofarengeus (farenks)","CN X: Yumuşak damak, farenks, larenks kasları (konuşma, yutma)","CN X: Özefagus + mide motilitesi (parasempatik)"],
    sensory: "CN IX: Arka 1/3 dil tat ve genel duyusu, orofarenks, kulak yolu\nCN X: Larenks, trakea, özefagus, karın organları (viseral afferent)",
    reflexes: "Gag refleksi: Afferent CN IX, efferent CN X",
    lesion_sites: [
      { site: "Jugüler foramen", cause: "Jugüler foramen sendromu (CN IX, X, XI birlikte)", note: "Tümör, travma" },
      { site: "Bulber / nükleer", cause: "Bulber palsi (ALS, inme, tümör)", note: "Flasid; Psödobulber = spastik" },
    ],
    symptoms: [
      { s: "Yutma güçlüğü (disfaji) — sıvılar daha zor", sev: "high" },
      { s: "Yumuşak damak sarkması + uvula karşı tarafa deviasyonu", sev: "high" },
      { s: "Ses kısıklığı, nazal konuşma (vokal kord paralizisi)", sev: "high" },
      { s: "Gag refleksi kaybı", sev: "mid" },
      { s: "Aspirasyon pnömonisi riski", sev: "high" },
    ],
    differentials: ["Bulber palsi (flasid): ALS alt motor nöron, atrofi, fasikülasyon","Psödobulber palsi (spastik): UMN, duygusal labilite, spastik konuşma","Miyastenia gravis: Yorulmayla artan, tensilon testi +"],
    pearls: [
      { type: "red", title: "Kritik Nokta", text: "Uvula deviasyonu: Sağlam tarafa gider. Sol CN X lezyonunda yumuşak damak solda sarkar, uvula sağa kayar. 'Uvula lezyondan kaçar.'" },
      { type: "blue", title: "Klinik İpucu", text: "Sol larengeal nöropati → akciğer tümörü, aort anevrizması düşün (n. laryngeus recurrens aortun altından geçer)." },
    ],
  },
  cn11: {
    name: "CN XI — N. Accessorius", category: "Kraniyal Sinir", color: "green",
    roots: "C1–C5 anterior horn (spinal köken)", origin: "Spinal kök → foramen magnumdan girer → jugüler foramenden çıkar → SCM ve trapezius",
    motor: ["Sternocleidomastoideus (SCM): Boyun rotasyonu karşı tarafa, fleksiyon","Trapezius üst lifler: Omuz elevasyonu, skapula retraksiyonu"],
    sensory: "Yok", reflexes: "Yok",
    lesion_sites: [
      { site: "Jugüler foramen", cause: "Jugüler foramen sendromu (IX, X, XI)", note: "" },
      { site: "Posterior trigonum colli", cause: "Lenf nodu disseksiyonu, cerrahi", note: "İyatrojenik en sık neden" },
    ],
    symptoms: [
      { s: "Omuz düşüklüğü ve elevasyonda güçsüzlük (trapezius)", sev: "high" },
      { s: "Skapula alata (kanat skapula)", sev: "mid" },
      { s: "Boyunun etkilenen tarafa rotasyonu güçlüğü (SCM)", sev: "mid" },
    ],
    differentials: ["N. Thoracicus longus lezyonu: Serratus anterior → kanat skapula, trapezius normal","Torasik çıkış sendromu: Ek nörovasküler bulgular"],
    pearls: [{ type: "yellow", title: "Sınav Sorusu", text: "SCM muayenesi: 'Başınızı sağa döndürün' → Sol SCM kasılır. Sol CN XI lezyonunda sağa rotasyon zayıflar. Test: Hasta çeneyi karşı tarafa döndürürken direnç uygula." }],
  },
  cn12: {
    name: "CN XII — N. Hypoglossus", category: "Kraniyal Sinir", color: "green",
    roots: "Medulla oblongata — hipoglossal nükleus", origin: "Medulladan çıkar → hipoglossal kanal → dil kaslarını innerve eder",
    motor: ["Tüm intrinsik ve ekstrinsik dil kasları (genioglossus, hyoglossus, styloglossus) — sadece palatoglossus hariç (CN X)"],
    sensory: "Yok", reflexes: "Yok",
    lesion_sites: [
      { site: "Periferik (LMN)", cause: "Hipoglossal kanal tümörü, atlanto-aksiyal sublüksasyon", note: "Atrofi + fasikülasyon" },
      { site: "Nükleer", cause: "ALS, Wallenberg sendromu", note: "" },
    ],
    symptoms: [
      { s: "Dil çıkartınca etkilenen tarafa deviasyon (LMN: ipsilateral)", sev: "high" },
      { s: "Dil atrofisi ve fasikülasyon (LMN lezyonu)", sev: "high" },
      { s: "Dizartri (dil hareketleri kısıtlı — özellikle 'l', 't', 'd' sesleri)", sev: "mid" },
    ],
    differentials: ["UMN CN XII lezyonu: Karşı tarafa deviasyon, atrofi yok (örn. inme)","Dil tümörü: Görünür kitle"],
    pearls: [{ type: "red", title: "Kritik Nokta — Deviasyon Yönü", text: "LMN lezyonu: Dil etkilenen tarafa (ipsilateral) kayar. UMN (inme): Dil kontralateral tarafa kayar. Kural: LMN → aynı taraf, UMN → karşı taraf." }],
  },
  sc_complete: {
    name: "Tam Omurilik Transeksiyonu", category: "Omurilik Lezyonu", color: "red",
    roots: "Herhangi bir seviye", origin: "Travma, tümör, enfarkt — tüm iniş/çıkış yollarının kesilmesi",
    motor: ["Lezyon altında tüm istemli hareket kaybı","Akut dönem: Arefleksi, flasidite (spinal şok)","Kronik dönem: Spastisite, hiperrefleksi, klonus, Babinski +"],
    sensory: "Lezyon seviyesinin altında tüm duyuların kaybı (ağrı, ısı, dokunma, vibrasyon, propriosepsiyon)",
    reflexes: "Akut: Tüm refleksler kaybı (spinal şok). Kronik: Hiperrefleksi",
    lesion_sites: [
      { site: "C3–C5 üzeri", cause: "Travma", note: "Diyafragma felci → ventilatör bağımlılığı" },
      { site: "T1–L1", cause: "Travma, tümör", note: "Parapleji" },
      { site: "C4–T1", cause: "Travma", note: "Tetrapleji (kuadripleji)" },
    ],
    symptoms: [
      { s: "Lezyon altında motor paralizi (flasid akut → spastik kronik)", sev: "high" },
      { s: "Lezyon altında tüm duyu kaybı", sev: "high" },
      { s: "Sfinkter disfonksiyonu (mesane, bağırsak)", sev: "high" },
      { s: "Spinal şok: Arefleksi + hipotansiyon + bradikardi (akut faz)", sev: "high" },
      { s: "Otonom disrefleksi (T6 üzeri lezyonlarda): Hipertansif kriz + bradikardi + terleme", sev: "high" },
    ],
    differentials: ["Brown-Séquard: Yarı transeksiyon, asimetrik bulgular","Conus medullaris sendromu: L1–L2 seviyesi, karışık UMN/LMN","Kauda equina: L2 altı, saf LMN"],
    pearls: [
      { type: "red", title: "Spinal Şok", text: "Akut tam omurilik yaralanmasında saatler-haftalar süren arefleksi + hipotansiyon dönemine 'spinal şok' denir. Bulbokavernöz refleksin geri dönmesi spinal şokun bittiğini gösterir." },
      { type: "yellow", title: "Sınav Sorusu", text: "Otonom disrefleksi: T6 üstü lezyon + dolmuş mesane/bağırsak → şiddetli hipertansiyon + bradikardi + terleme/kızarma. Acil tetikleyiciyi kaldır." },
    ],
  },
  sc_brown: {
    name: "Brown-Séquard Sendromu", category: "Omurilik Lezyonu", color: "red",
    roots: "Herhangi bir servikal veya torakal seviye", origin: "Omuriliğin yarım transeksiyonu (sol veya sağ yarım)",
    motor: ["İPSİLATERAL: Motor paralizi (kortikospinal traktus)","İPSİLATERAL: Propriosepsiyon + vibrasyon kaybı (dorsal kolon)","KONTRALATERAL: Ağrı + ısı kaybı (spinotalamik traktus = lezyon seviyesi 1–2 segment üstünde çapraz yapar)"],
    sensory: "Lezyon seviyesinde ipsilateral bant şeklinde duyu kaybı\nLezyon altında: İpsilateral propriosepsiyon/vibrasyon kaybı + kontralateral ağrı/ısı kaybı",
    reflexes: "İpsilateral hiperrefleksi (kronik) + Babinski +",
    lesion_sites: [{ site: "Servikal", cause: "Penetran travma (bıçak), MS plakı, tümör", note: "" }],
    symptoms: [
      { s: "İpsilateral güçsüzlük/paralizi lezyon altında", sev: "high" },
      { s: "İpsilateral propriosepsiyon + vibrasyon kaybı (dorsal kolon)", sev: "high" },
      { s: "Kontralateral ağrı + ısı duyusu kaybı (1–2 seviye aşağıdan)", sev: "high" },
      { s: "İpsilateral lezyon seviyesinde LMN bulguları (o segment)", sev: "mid" },
      { s: "Kontralateral dokunma görece korunur (ince dokunma bilateral yol alır)", sev: "low" },
    ],
    differentials: ["Tam transeksiyon: Her iki taraf etkilenir","Santral kord: Üst > alt ekstremite, simetrik"],
    pearls: [
      { type: "red", title: "Kritik Nokta — Çapraz Tablo", text: "Brown-Séquard özeti: Motor kaybı + propriosepsiyon kaybı = lezyon ile AYNI TARAF. Ağrı + ısı kaybı = KARŞI TARAF. 'Motor ve his ayrı tarafta' sorusu gördüğünde Brown-Séquard düşün." },
      { type: "yellow", title: "Sınav Sorusu", text: "Penetran boyun travması (bıçak): Sağ taraf motor paralizi + sağ propriosepsiyon kaybı + sol ağrı/ısı kaybı → Sağ hemiseksiyel omurilik lezyonu = Brown-Séquard." },
    ],
  },
  sc_central: {
    name: "Santral Kord Sendromu", category: "Omurilik Lezyonu", color: "red",
    roots: "Servikal bölge en sık", origin: "Omuriliğin merkezindeki hasar — kortikospinal traktusun merkezi lifleri (üst ekstremite temsili) daha çok etkilenir",
    motor: ["Üst ekstremite > alt ekstremite motor kayıp (ters piramidal dağılım)","El ve parmaklar en çok etkilenir (en santral lifler)","Mesane disfonksiyonu sık"],
    sensory: "Değişken; cape dağılımında (omuzlar arası) duyu kaybı olabilir",
    reflexes: "Hiperrefleksi alt ekstremitenin daha erken döner",
    lesion_sites: [{ site: "Servikal santral kanal", cause: "Hiperekstensiyon travması (yaşlı + spondilozu olan kişi)", note: "En sık klinik omurilik sendromu" }],
    symptoms: [
      { s: "Üst > alt ekstremite zayıflığı (el parmakları en çok)", sev: "high" },
      { s: "Üriner retansiyon / inkontinans", sev: "high" },
      { s: "Değişken duyu kaybı (genellikle dizestezi)", sev: "mid" },
      { s: "Alt ekstremiteler görece korunur (yürüme mümkün)", sev: "low" },
    ],
    differentials: ["Siringomiyeli: Yavaş başlangıç, cape dağılımı, MRI tanısal","Anterior kord: Motor + ağrı/ısı kaybı, propriosepsiyon korunur"],
    pearls: [{ type: "red", title: "Kritik Nokta", text: "Santral kord sendromu = En sık inkomplet omurilik sendromu. Servikal hiperekstansiyon + spondilozu olan yaşlı hasta (düşme, trafik) → üst ekstremite > alt ekstremite zayıflığı." }],
  },
  sc_anterior: {
    name: "Anterior Kord Sendromu", category: "Omurilik Lezyonu", color: "red",
    roots: "Herhangi bir seviye", origin: "Anterior spinal arterin beslediği alanın iskemisi → kortikospinal traktus + spinotalamik traktus hasarı; dorsal kolonlar korunur",
    motor: ["Lezyon altında bilateral motor paralizi (kortikospinal traktus)"],
    sensory: "Lezyon altında bilateral ağrı + ısı kaybı (spinotalamik traktus)\nPROPRİOSEPSİYON VE VİBRASYON KORUNUR (dorsal kolonlar)",
    reflexes: "Hiperrefleksi, Babinski +",
    lesion_sites: [{ site: "Anterior spinal arter", cause: "Aort disseksiyonu / cerrahisi, ateroskleroz, travma", note: "" }],
    symptoms: [
      { s: "Bilateral motor paralizi lezyon altında", sev: "high" },
      { s: "Bilateral ağrı + ısı duyusu kaybı lezyon altında", sev: "high" },
      { s: "Propriosepsiyon + vibrasyon KORUNMUŞ (tanı koydurucudur!)", sev: "high" },
      { s: "En kötü prognozlu inkomplet sendrom", sev: "mid" },
    ],
    differentials: ["Brown-Séquard: Asimetrik, unilateral motor","Tam transeksiyon: Dorsal kolon da gider"],
    pearls: [
      { type: "red", title: "Kritik Nokta — Dorsal Kolon Korunur", text: "Anterior kord: Motor paralizi + ağrı/ısı kaybı ama propriosepsiyon/vibrasyon korunur. Bu ayrım sınavlarda sık sorulur. Aort cerrahisi sonrası gelişirse anterior spinal arter düşün." },
      { type: "yellow", title: "Sınav Sorusu", text: "Aort cerrahisi sonrası alt ekstremitede güçsüzlük + ağrı/ısı kaybı + propriosepsiyon normal → Anterior kord sendromu (anterior spinal arter lezyonu)." },
    ],
  },
  br_internalcapsule: {
    name: "İnternal Kapsül Lezyonu", category: "Beyin Lezyonu", color: "yellow",
    roots: "Serebral hemisfer derinleri", origin: "Kortikospinal + kortikonükleer + talamokortkal liflerin sıkışık geçiş noktası — küçük lezyon büyük klinik tablo",
    motor: ["Arka bacak: Kortikospinal traktus (kontralateral ekstremite motor)","Diz: Kortikonükleer traktus (karşı taraf yüz alt yarısı, XII, XI)"],
    sensory: "Arka bacak + posterior limb: Talamokortikal duyusal lifler",
    reflexes: "Hiperrefleksi + Babinski kontralateral",
    lesion_sites: [
      { site: "Arka bacak (posterior limb)", cause: "Laküner enfarkt (en sık — küçük penetran damarlar)", note: '"Saf motor inme" = arka bacak laküner infarkt' },
      { site: "Anterior limb + genu", cause: "Laküner enfarkt", note: '"Saf duyusal inme" veya "dizartri-beceriksiz el"' },
    ],
    symptoms: [
      { s: "Kontralateral hemipleji / hemiparezi (yüz-kol-bacak eşit)", sev: "high" },
      { s: "Kontralateral hemisensori kayıp (arka bacak)", sev: "mid" },
      { s: "Saf motor inme: Güçsüzlük + duyu korunmuş (arka bacak)", sev: "high" },
      { s: "Laküner sendromlar: Dizartri-beceriksiz el, ataksik hemiparezi", sev: "mid" },
    ],
    differentials: ["Kortikal inme: Afazi, hemineglect, görme alanı defekti eşlik eder","Beyin sapı crossed sendromu: Karşı vücut + aynı taraf kraniyal sinir"],
    pearls: [
      { type: "red", title: "Kritik Nokta", text: "İnternal kapsül lezyonunda yüz-kol-bacak hepsi etkilenir ve eşit derecede güçsüzlük görülür. Kortikal lezyonda dağılım eşit olmayabilir (el + yüz > bacak gibi). Bu fark lokalizasyonu işaret eder." },
      { type: "yellow", title: "Sınav Sorusu", text: "Saf motor inme (pure motor stroke) = İnternal kapsül arka bacağı laküner enfarktı. Hipertansiyon + küçük penetran damar hasarı etiyolojisi." },
    ],
  },
  br_brainstem: {
    name: "Beyin Sapı Lezyonları", category: "Beyin Lezyonu", color: "yellow",
    roots: "Pons, mezensefalon, medulla", origin: '"Crossed sendromlar" özelliği: Aynı taraf kraniyal sinir + karşı taraf vücut (hemipleji/hemisensori)',
    motor: ["Kortikospinal traktus geçer → kontralateral vücut motor","Kraniyal sinir nükleusları → ipsilateral yüz/göz/dil"],
    sensory: "Spinotalamik traktus → kontralateral ağrı/ısı\nMedial lemnisküs → kontralateral propriosepsiyon/vibrasyon",
    reflexes: "Kontralateral hiperrefleksi",
    lesion_sites: [
      { site: "Weber sendromu (mezensefalon)", cause: "PCA dalı → mezensefalon pedünkül", note: "CN III palsi (ipsilateral) + kontralateral hemipleji" },
      { site: "Wallenberg sendromu (lateral medulla)", cause: "PICA veya vertebral arter", note: "Lateral medulla: Horner + vertigo + disfaji + kontralateral ağrı/ısı, ipsilateral yüz ağrı/ısı (V nükleusu)" },
      { site: "Millard-Gubler (pons)", cause: "Baziler dal", note: "CN VI + CN VII palsi (ipsilateral) + kontralateral hemipleji" },
    ],
    symptoms: [
      { s: "Crossed hemipleji: Aynı taraf CN bulgular + karşı taraf hemipleji", sev: "high" },
      { s: "Vertigo, bulantı, kusma (vestibüler nukleus)", sev: "high" },
      { s: "Hiccup, yutma güçlüğü (medulla)", sev: "mid" },
      { s: "Horner sendromu: Sempatik lifler mezensefalon-medulladan iner", sev: "mid" },
      { s: "Dört göz hareketi bozukluğu türü (INO, gaze palsi vb.)", sev: "mid" },
    ],
    differentials: ["Kortikal inme: Crossed sendrom olmaz, afazi/neglect eşlik edebilir","Serebellar inme: Ataksi ön planda, motor kayıp hafif"],
    pearls: [
      { type: "red", title: "Wallenberg Sendromu — Ezberlenmesi Gereken", text: "PICA tıkanması: Vertigo + yutma güçlüğü + ses kısıklığı + ipsilateral yüz ağrı/ısı kaybı (V nükleus) + kontralateral vücut ağrı/ısı kaybı + Horner + ataksi. Propriosepsiyon + motor korunur (piramisler tutulmaz)." },
      { type: "yellow", title: "Sınav Sorusu", text: "Weber sendromu = CN III palsi + kontralateral hemipleji = Mezensefalon pedünkül lezyonu. Millard-Gubler = CN VI + CN VII + kontralateral hemipleji = Pons lezyonu." },
    ],
  },
  br_cerebellum: {
    name: "Serebellar Lezyon", category: "Beyin Lezyonu", color: "yellow",
    roots: "Serebellum", origin: "Koordinasyon, denge, öğrenilmiş motor hareketlerin hassasiyeti — lezyon bulguları İPSİLATERAL (serebellar çaprazlama iki kez olur)",
    motor: ["İpsilateral ekstremite ataksisi (koordinasyon bozukluğu)","İpsilateral gövde ataksisi (vermis lezyonunda bilateral)"],
    sensory: "Duyusal kayıp yok (saf serebellar)",
    reflexes: "Pendüler refleksler (sönümlenme azalmış)",
    lesion_sites: [
      { site: "Serebellar hemisfer", cause: "İnme (PICA, SCA), tümör, MS", note: "İpsilateral ekstremite ataksisi" },
      { site: "Vermis", cause: "Alkolizm, medulloblastom", note: "Gövde/yürüme ataksisi, ekstremiteler az etkilenir" },
    ],
    symptoms: [
      { s: "Ataksi: İpsilateral ekstremite, tandem yürüyüş bozukluğu", sev: "high" },
      { s: "Dizmetri: Parmak-burun ve topuk-diz testinde geçme/azlık", sev: "high" },
      { s: "İntensiyon tremoru (hareketle artar, istirahatte yok)", sev: "high" },
      { s: "Disdiadokokinezi (hızlı ardışık hareket yapamama)", sev: "mid" },
      { s: "Nistagmus (horizontal, ipsilateral)", sev: "mid" },
    ],
    differentials: ["Sensoriyal ataksi: Romberg + (gözler kapalı daha kötü), propriosepsiyon kaybı","Vestibüler ataksi: Vertigo eşlik eder"],
    pearls: [
      { type: "blue", title: "DANISH Mnemonik", text: "Serebellar bulgular: D — Dizmetri, A — Ataksi, N — Nistagmus, I — İntensiyon tremoru, S — Skandik konuşma, H — Hipotoni. Tümünü DANISH ile hatırla." },
      { type: "red", title: "Kritik Nokta", text: "Serebellar bulgular İPSİLATERAL. Kortikospinal veya duyusal bulgular yok (saf serebellar ise). Romberg testi negatif (gözler kapalıyken kötüleşmez — duyusal ataksinin aksine)." },
    ],
  },
  br_parietal: {
    name: "Parietal Lob Lezyonu", category: "Beyin Lezyonu", color: "yellow",
    roots: "Serebral korteks — parietal lob", origin: "Somatosensoriyel korteks + yüksek düzey duyusal entegrasyon — kontralateral etki",
    motor: ["Motor kortekse yakın lezyonda hafif kontralateral motor kayıp olabilir"],
    sensory: "Kortikal duyusal işleme bozulur",
    reflexes: "Hemineglect + piramidal işaretler kontralateral",
    lesion_sites: [
      { site: "Dominant (sol) parietal lob", cause: "İnme, tümör", note: "Gerstmann sendromu: Akalküli + agrafi + sağ-sol ayrım bozukluğu + parmak agnosisi" },
      { site: "Non-dominant (sağ) parietal lob", cause: "İnme, tümör", note: "Hemineglect (sol tarafı ihmal), apraksi, giyinme apraksi" },
    ],
    symptoms: [
      { s: "Kortikal duyusal kayıp: 2 nokta ayrımı, grafestezi, stereognozi bozukluğu", sev: "high" },
      { s: "Hemineglect (sağ lezyon): Soldan uyarıyı görmezden gelme", sev: "high" },
      { s: "Gerstmann sendromu (sol lezyon): Akalküli + agrafi + parmak agnosisi + sağ-sol ayrımı kaybı", sev: "high" },
      { s: "Apraksi: Amaçlı hareketi organize edememe", sev: "mid" },
      { s: "Homonim alt kadran görme alan defekti (optik radyasyon)", sev: "mid" },
    ],
    differentials: ["Temporal lob: Wernicke afazisi (sol), homonim üst kadran","Frontal lob: Broca afazisi (sol), davranış değişikliği"],
    pearls: [
      { type: "red", title: "Gerstmann Sendromu", text: "Sol açısal girusun 4 belirtisi: (1) Akalküli, (2) Agrafi, (3) Parmak agnosisi, (4) Sağ-sol ayrımı bozukluğu. Hepsi birlikte ise açısal girus lezyonu düşün." },
      { type: "blue", title: "Hemineglect Testi", text: "Çizgi biseksiyon testi: Hasta bir çizginin ortasını işaretlemekte zorlanır (orta noktayı sağa kayar). Saat çizme testi: Saatin sol yarısına rakam koymaz veya hepsini sağa koyar." },
    ],
  },
};

const QUIZ: QuizItem[] = [
  { q: "Bir hastada bilek ekstansiyonu kaybı ve el sırtında duyu azalması saptanıyor. Parmakların MCP ekleminde de ekstansiyon yok. Hangi sinir hasarlıdır?", context: "35 yaşında erkek, gece koltukta uyuya kalmış. Sabah kolunu kaldıramıyor.", opts: ["N. Medianus","N. Radialis","N. Ulnaris","N. Musculocutaneus"], ans: 1, exp: "N. Radialis lezyonu — 'Saturday night palsy.' Spiral groove basısı sonucu wrist drop + parmak MCP ekstansiyon kaybı. Triceps korunabilir. N. Ulnaris pençe el yapar; N. Medianus maymun el." },
  { q: '"OK işareti" yapamayan bir hastada başparmak ve işaret parmağı tam halka oluşturamıyor. Yüzeyel duyu kaybı yok. Hangi yapı hasarlıdır?', context: "Kadın sporcu, ön kol travması geçirmiş. EMG: Distal median motor aksonal hasar.", opts: ["N. Medianus yüksek lezyon","Anterior İnterosseöz Sinir","N. Radialis","N. Ulnaris"], ans: 1, exp: "Anterior İnterosseöz Sinir (AIS) — Saf motor daldır; FDP (1.–2. parmak), FPL ve pronator quadratus'u innerve eder. Yüzeyel duyu dalı etkilenmez. 'OK işareti yapamama' klasik bulgusudur." },
  { q: "Fasiyal felçte alın kırışması sağlamsa (alın korunmuş), lezyon nerededir?", context: "Hasta sabah aynaya bakıyor, ağzı sola kaymış, sağ göz kapanıyor ancak alın kırışıyor.", opts: ["Periferik — Bell palsi","Santral — sağ hemisferde UMN lezyonu","Santral — sol hemisferde UMN lezyonu","Periferik — Ramsay Hunt sendromu"], ans: 2, exp: "Sol UMN lezyonu → sağ alt yüz felci + alın korunur. Frontal korteks bilateral temsil edildiğinden UMN lezyonunda alın kasları korunur. Periferik lezyonda alın da etkilenir." },
  { q: "Hastada aynı taraf (sağ) motor paralizi + sağ propriosepsiyon kaybı + sol ağrı/ısı duyusu kaybı saptanıyor. Tanı nedir?", context: "Servikal bölgeye bıçak yaralanması geçiren 22 yaşında erkek.", opts: ["Tam omurilik transeksiyonu","Brown-Séquard sendromu sağ","Anterior kord sendromu","Santral kord sendromu"], ans: 1, exp: "Brown-Séquard sendromu: Sağ yarı transeksiyon. Motor + propriosepsiyon = ipsilateral (sağ). Ağrı/ısı = kontralateral (sol). Klasik 'crossed' duyusal tablo." },
  { q: "Aort cerrahisi sonrası alt ekstremitelerde güçsüzlük gelişiyor. Bilateral motor paralizi ve bilateral ağrı/ısı kaybı mevcut, ancak vibrasyon ve propriosepsiyon normal. Tanı?", context: "Açık kalp cerrahisi + torakoabdominal aort replasmanı sonrası yoğun bakım.", opts: ["Tam omurilik transeksiyonu","Brown-Séquard sendromu","Anterior kord sendromu","Santral kord sendromu"], ans: 2, exp: "Anterior Kord Sendromu — Anterior spinal arter iskemisi. Dorsal kolonlar (propriosepsiyon, vibrasyon) korunur çünkü posterior spinal arterden beslenir. Aort cerrahisi klasik etyolojisidir." },
  { q: "Fibula boynu çevresine alçı konulan hastada alçı çıkarıldığında ayak dorsifleksiyonu kaybolmuş, eversiyon yok. Plantar fleksiyon ve inversiyon normal. Hangi sinir hasarlıdır?", context: "Tibia kırığı nedeniyle uzun bacak alçısı.", opts: ["N. Tibialis","N. Ischiadicus","N. Peroneus Communis","L4–L5 radikülopati"], ans: 2, exp: "N. Peroneus Communis — Fibula boynu klasik bası noktası. Dorsifleksiyon (derin dal) + eversiyon (yüzeyel dal) kaybı = foot drop. Plantar fleksiyon N. Tibialis → korunur." },
  { q: "Ağrılı pitoz, midriyazis ve 'aşağı-dışa' bakan göz saptanan bir hastada öncelikle hangi tanı düşünülmelidir?", context: "Acil serviste 48 yaşında hipertansif kadın. Ani başlayan baş ağrısı + pitoz.", opts: ["Diyabetik CN III nöropatisi","Horner sendromu","Posterior kommunikan arter anevrizması","Kavernöz sinüs trombozu"], ans: 2, exp: "Posterior kommunikan arter anevrizması — ACİL. Midriyazis + ağrı → kompresif CN III lezyonu. Parasempatik lifler CN III'ün dış yüzeyinde seyreder, basıya erken tepki verir. Diyabetik CN III'te pupil korunur. Acil anjiografi endikasyonu." },
  { q: "Uvula solda göze çarparken sağa kayıyor, sol yumuşak damak sarkık. Aynı hastada sol ses kısıklığı var. Hangi sinir etkilenmiş?", context: "Solda juguler foramen bölgesinde kitle saptanan 55 yaşında erkek.", opts: ["Sol CN XII","Sol CN IX","Sol CN X","Sol CN VII"], ans: 2, exp: "Sol CN X (Vagus) lezyonu — Sol yumuşak damak sarkık → uvula sağa (sağlam tarafa) kayıyor. Sol vokal kord paralizisi → ses kısıklığı. Kural: 'Uvula lezyondan kaçar.'" },
  { q: "Weber sendromu olan bir hastada hangi bulgular beklenir?", context: "Hipertansif hasta. MRI: Mezensefalonda sağ serebral pedünkül lezyonu.", opts: ["Sağ CN III paralizisi + sol hemipleji","Sol CN III paralizisi + sağ hemipleji","Sağ CN VI paralizisi + sol hemipleji","Sağ CN VII paralizisi + sol hemipleji"], ans: 0, exp: "Weber Sendromu = Mezensefalon pedünkül lezyonu. Sağ lezyon: İpsilateral (sağ) CN III paralizisi (pitoz, midriyazis, down-out göz) + kontralateral (sol) hemipleji. Crossed sendrom klasiği. CN VI + hemipleji = Pons (Millard-Gubler)." },
  { q: "Bir hastada hesap yapamama, yazamama, parmak tanıyamama ve sağ-sol karışıklığı mevcut. Lezyon nerededir?", context: "Sol MCA territorial enfarkt şüphesiyle getirilen 62 yaşında kadın.", opts: ["Sol frontal lob","Sol açısal girus (parietal)","Sağ parietal lob","Sol temporal lob"], ans: 1, exp: "Sol açısal girus lezyonu → Gerstmann Sendromu: (1) Akalküli, (2) Agrafi, (3) Parmak agnosisi, (4) Sağ-sol ayrımı bozukluğu. Dört belirti birlikte dominan parietal lob açısal girusunu gösterir." },
  { q: "DANISH mnemonığı serebellar hangi bulguların kısaltmasıdır?", context: "Serebellar lezyon semiyolojisini kavrama sorusu.", opts: ["Dizartri, Ataksi, Nistagmus, İntensiyon tremoru, Sfinkter, Hipotan","Dizmetri, Ataksi, Nistagmus, İntensiyon tremoru, Skandik konuşma, Hipotoni","Diplopi, Ataksi, Nöropati, İstemli tremor, Spastisite, Hemiplejia","Dizmetri, Arefleksi, Nükleer, İnmeli, Santral, Hipertoni"], ans: 1, exp: "DANISH: Dizmetri (parmak-burun geçme/kısalma), Ataksi, Nistagmus (horizontal, ipsilateral), İntensiyon tremoru (hareketle artar), Skandik konuşma (patlayıcı, düzensiz), Hipotoni. Serebellar bulgular ipsilateraldir." },
  { q: "Karpal tünel sendromunda hangi bulgu beklenmez?", context: "El bileğinde gece uyuşma ve yanma şikayetiyle gelen hasta.", opts: ["Thenar atrofi","Phalen testi pozitifliği","Tinel işareti bileğe perküsyonla","FDP 4.–5. parmak fleksiyon zayıflığı"], ans: 3, exp: "FDP 4.–5. parmak = N. Ulnaris. Karpal tünelde yalnızca N. Medianus bileğin distalinde etkilenir. FDS ve FDP 1.–2. (proksimalde çıkan AIS) korunur. Sadece thenar kas zayıflığı/atrofisi olur." },
];

const SECTIONS = [
  { label: "Üst Ekstremite Sinirleri", keys: ["n_radialis","n_medianus","n_ulnaris","n_axillaris","n_musculocutaneus"] },
  { label: "Alt Ekstremite Sinirleri", keys: ["n_femoralis","n_ischiadicus","n_peroneus","n_tibialis"] },
  { label: "Kraniyal Sinirler", keys: ["cn5","cn7","cn8","cn3","cn9_10","cn11","cn12"] },
  { label: "Omurilik Lezyonları", keys: ["sc_complete","sc_brown","sc_central","sc_anterior"] },
  { label: "Beyin Lezyonları", keys: ["br_internalcapsule","br_brainstem","br_cerebellum","br_parietal"] },
];

// ── Helpers ────────────────────────────────────────────────────────
const sevStyle = (sev: Sev) => {
  if (sev === "high") return "text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--error-light)] text-[var(--danger)]";
  if (sev === "mid") return "text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--warning-light)] text-[var(--warning)]";
  return "text-xs px-2 py-0.5 rounded-full font-medium bg-[var(--primary-light)] text-[var(--primary)]";
};
const sevLabel = (sev: Sev) => sev === "high" ? "Şiddetli" : sev === "mid" ? "Orta" : "Hafif";

const pearlStyle = (type: PearlType) => {
  if (type === "red") return { wrap: "border border-[var(--danger)] bg-[var(--error-light)] rounded-lg p-4", title: "text-[var(--danger)] font-semibold text-sm mb-1" };
  if (type === "yellow") return { wrap: "border border-[var(--warning)] bg-[var(--warning-light)] rounded-lg p-4", title: "text-[var(--warning)] font-semibold text-sm mb-1" };
  return { wrap: "border border-[var(--primary)] bg-[var(--primary-light)] rounded-lg p-4", title: "text-[var(--primary)] font-semibold text-sm mb-1" };
};

const colorBadge = (color: string) => {
  const map: Record<string, string> = {
    purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    green: "bg-[var(--primary-light)] text-[var(--primary)]",
    red: "bg-[var(--error-light)] text-[var(--danger)]",
    yellow: "bg-[var(--warning-light)] text-[var(--warning)]",
  };
  return map[color] ?? map.green;
};

// ── Main Component ─────────────────────────────────────────────────
export default function SinirLezyon() {
  const [view, setView] = useState<"home" | "nerve" | "quiz">("home");
  const [activeNerve, setActiveNerve] = useState<string | null>(null);
  const [quizIdx, setQuizIdx] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nerve = activeNerve ? NERVES[activeNerve] : null;

  const openNerve = (key: string) => {
    setActiveNerve(key);
    setView("nerve");
    setSidebarOpen(false);
    window.scrollTo(0, 0);
  };

  const startQuiz = () => {
    setQuizIdx(0); setScore(0); setAnswered(false); setSelected(null); setQuizDone(false);
    setView("quiz");
  };

  const selectAnswer = (idx: number) => {
    if (answered) return;
    setAnswered(true);
    setSelected(idx);
    if (idx === QUIZ[quizIdx].ans) setScore(s => s + 1);
  };

  const nextQuestion = () => {
    if (quizIdx + 1 >= QUIZ.length) { setQuizDone(true); return; }
    setQuizIdx(i => i + 1);
    setAnswered(false);
    setSelected(null);
  };

  const q = QUIZ[quizIdx];
  const letters = ["A", "B", "C", "D"];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Topbar */}
      <header className="sticky top-0 z-50 border-b" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-1 text-sm hover:opacity-70 transition-opacity shrink-0" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <span className="hidden sm:inline shrink-0" style={{ color: "var(--border)" }}>/</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <Brain size={15} className="shrink-0" style={{ color: "var(--primary)" }} />
              <span className="font-semibold text-xs sm:text-sm truncate">Nöroloji Rehberi</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => { setView("home"); setActiveNerve(null); }}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view !== "quiz" && view !== "nerve" ? "text-[var(--primary)] bg-[var(--primary-light)]" : ""}`}
              style={view !== "quiz" && view !== "nerve" ? {} : { color: "var(--text-muted)" }}>
              <BookOpen size={12} /> <span className="hidden xs:inline">Konular</span>
            </button>
            <button onClick={startQuiz}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === "quiz" ? "text-[var(--primary)] bg-[var(--primary-light)]" : ""}`}
              style={view !== "quiz" ? { color: "var(--text-muted)" } : {}}>
              <HelpCircle size={12} /> <span className="hidden xs:inline">Quiz</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full min-w-0">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-4 px-3 gap-1"
          style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}>
          <button onClick={() => { setView("home"); setActiveNerve(null); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium w-full text-left transition-all mb-2 ${view === "home" ? "bg-[var(--primary-light)] text-[var(--primary)]" : "hover:bg-[var(--surface)]"}`}
            style={view !== "home" ? { color: "var(--text-muted)" } : {}}>
            <Home size={14} /> Genel Bakış
          </button>
          {SECTIONS.map(sec => (
            <div key={sec.label} className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-1" style={{ color: "var(--text-muted)" }}>{sec.label}</p>
              {sec.keys.map(k => (
                <button key={k} onClick={() => openNerve(k)}
                  className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-sm text-left transition-all ${activeNerve === k && view === "nerve" ? "bg-[var(--primary-light)] text-[var(--primary)] font-medium" : "hover:bg-[var(--surface)]"}`}
                  style={activeNerve !== k || view !== "nerve" ? { color: "var(--text)" } : {}}>
                  <span className="truncate">{NERVES[k].name}</span>
                  {activeNerve === k && view === "nerve" && <ChevronRight size={12} />}
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-auto">
          {/* HOME */}
          {view === "home" && (
            <div className="p-4 sm:p-6 max-w-4xl">
              <div className="mb-6 sm:mb-8">
                <h1 className="text-xl sm:text-2xl font-bold mb-2">Klinik Nöroloji Rehberi</h1>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Periferik sinir, kraniyal sinir, omurilik ve beyin lezyonlarını sistematik olarak öğren. Her konu için lezyon anatomisi, klinik bulgular ve ayırıcı tanı bilgilerini içerir.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {[["9 Periferik Sinir","purple"],["7 Kraniyal Sinir","green"],["4 Omurilik Sendromu","red"],["4 Beyin Lezyonu","yellow"]].map(([label, color]) => (
                    <span key={label} className={`text-xs px-3 py-1 rounded-full font-medium ${colorBadge(color)}`}>{label}</span>
                  ))}
                </div>
              </div>
              {SECTIONS.map(sec => (
                <div key={sec.label} className="mb-6">
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>{sec.label}</h2>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {sec.keys.map(k => {
                      const n = NERVES[k];
                      return (
                        <button key={k} onClick={() => openNerve(k)}
                          className="flex items-center justify-between p-3 rounded-xl border text-left w-full transition-all hover:border-[var(--primary)] hover:bg-[var(--primary-light)] group"
                          style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                          <div>
                            <p className="font-medium text-sm group-hover:text-[var(--primary)] transition-colors">{n.name}</p>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{n.roots}</p>
                          </div>
                          <ChevronRight size={14} style={{ color: "var(--text-muted)" }} className="group-hover:text-[var(--primary)] transition-colors" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="mt-8 p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                style={{ background: "var(--primary-light)", borderColor: "var(--primary)" }}>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--primary)" }}>Bilgini test et</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{QUIZ.length} klinik senaryo sorusuyla sınavına hazırlan</p>
                </div>
                <button onClick={startQuiz}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-white transition-all hover:opacity-90"
                  style={{ background: "var(--primary)" }}>
                  <HelpCircle size={14} /> Quiz Başlat
                </button>
              </div>
            </div>
          )}

          {/* NERVE DETAIL */}
          {view === "nerve" && nerve && (
            <div className="p-4 sm:p-6 max-w-4xl">
              <button onClick={() => { setView("home"); setActiveNerve(null); }}
                className="flex items-center gap-1.5 text-sm mb-4 transition-opacity hover:opacity-70"
                style={{ color: "var(--text-muted)" }}>
                <ArrowLeft size={14} /> Geri
              </button>
              <div className="mb-5 sm:mb-6">
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${colorBadge(nerve.color)}`}>{nerve.category}</span>
                  <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>{nerve.roots}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold">{nerve.name}</h1>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Köken & Seyir</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Kökler:</span> <span style={{ color: "var(--text-muted)" }}>{nerve.roots}</span></div>
                    <div><span className="font-medium">Köken:</span> <span style={{ color: "var(--text-muted)" }}>{nerve.origin}</span></div>
                    {nerve.course && <div><span className="font-medium">Seyir:</span> <span style={{ color: "var(--text-muted)" }}>{nerve.course}</span></div>}
                  </div>
                </div>
                <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Refleksler & Özel Testler</h3>
                  <p className="text-sm whitespace-pre-line" style={{ color: "var(--text-muted)" }}>{nerve.reflexes || "Spesifik refleks yok"}</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Motor İnnervasyonu</h3>
                  <ul className="space-y-1">
                    {nerve.motor.map((m, i) => <li key={i} className="text-sm flex gap-2" style={{ color: "var(--text-muted)" }}><span style={{ color: "var(--primary)" }}>·</span>{m}</li>)}
                  </ul>
                </div>
                <div className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Duyusal İnnervasyonu</h3>
                  <p className="text-sm whitespace-pre-line" style={{ color: "var(--text-muted)" }}>{nerve.sensory || "Duyusal komponent yok"}</p>
                </div>
              </div>

              <div className="rounded-xl border mb-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                <div className="px-4 py-3 border-b rounded-t-xl" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Lezyon Semptomları</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[400px]">
                    <thead><tr style={{ background: "var(--bg-subtle)" }}>
                      <th className="text-left px-4 py-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>Semptom / Bulgu</th>
                      <th className="text-left px-4 py-2 text-xs font-medium w-24" style={{ color: "var(--text-muted)" }}>Şiddet</th>
                    </tr></thead>
                    <tbody>{nerve.symptoms.map((s, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                        <td className="px-4 py-2.5 text-sm">{s.s}</td>
                        <td className="px-4 py-2.5"><span className={sevStyle(s.sev)}>{sevLabel(s.sev)}</span></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>

              {nerve.lesion_sites && nerve.lesion_sites.length > 0 && (
                <div className="rounded-xl border mb-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="px-4 py-3 border-b rounded-t-xl" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Lezyon Seviyeleri ve Nedenleri</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[480px]">
                      <thead><tr style={{ background: "var(--bg-subtle)" }}>
                        {["Bölge","Sık Neden","Not"].map(h => <th key={h} className="text-left px-4 py-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>{h}</th>)}
                      </tr></thead>
                      <tbody>{nerve.lesion_sites.map((l, i) => (
                        <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                          <td className="px-4 py-2.5 font-medium whitespace-nowrap">{l.site}</td>
                          <td className="px-4 py-2.5" style={{ color: "var(--text-muted)" }}>{l.cause}</td>
                          <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>{l.note}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}

              {nerve.differentials && nerve.differentials.length > 0 && (
                <div className="rounded-xl border p-4 mb-4" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Ayırıcı Tanı</h3>
                  <div className="space-y-2">
                    {nerve.differentials.map((d, i) => {
                      const [label, ...rest] = d.split(":");
                      return (
                        <div key={i} className="text-sm p-3 rounded-lg" style={{ background: "var(--bg-subtle)" }}>
                          <span className="font-semibold" style={{ color: "var(--primary)" }}>{label}</span>
                          {rest.length > 0 && <span style={{ color: "var(--text-muted)" }}>: {rest.join(":")}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {nerve.pearls && nerve.pearls.length > 0 && (
                <div className="space-y-3 mb-6">
                  {nerve.pearls.map((p, i) => {
                    const s = pearlStyle(p.type);
                    return (
                      <div key={i} className={s.wrap}>
                        <p className={s.title}>{p.title}</p>
                        <p className="text-sm" style={{ color: "var(--text)" }}>{p.text}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* QUIZ */}
          {view === "quiz" && (
            <div className="p-4 sm:p-6 max-w-2xl">
              <h1 className="text-lg sm:text-xl font-bold mb-1">Klinik Quiz</h1>
              <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Klinik senaryo bazlı sorularla bilgini test et.</p>

              {!quizDone ? (
                <>
                  <div className="h-1.5 rounded-full mb-6 overflow-hidden" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${(quizIdx / QUIZ.length) * 100}%`, background: "var(--primary)" }} />
                  </div>
                  <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                    <p className="text-xs font-medium mb-3" style={{ color: "var(--text-muted)" }}>Soru {quizIdx + 1} / {QUIZ.length}</p>
                    <p className="font-medium mb-3">{q.q}</p>
                    {q.context && (
                      <div className="text-sm p-3 rounded-lg mb-4 italic" style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}>
                        {q.context}
                      </div>
                    )}
                    <div className="space-y-2 mb-4">
                      {q.opts.map((opt, i) => {
                        let cls = "w-full text-left px-3 sm:px-4 py-3 sm:py-3.5 rounded-lg border text-sm transition-all flex items-start gap-3 min-h-[44px] ";
                        let style: React.CSSProperties = { background: "var(--bg-subtle)", borderColor: "var(--border)" };
                        if (answered) {
                          if (i === q.ans) { cls += "border-[var(--success)]"; style = { background: "var(--success-light)", borderColor: "var(--success)", color: "var(--success)" }; }
                          else if (i === selected) { cls += "border-[var(--danger)]"; style = { background: "var(--error-light)", borderColor: "var(--danger)", color: "var(--danger)" }; }
                          else { style.opacity = 0.5; }
                        } else {
                          cls += "hover:border-[var(--primary)] hover:bg-[var(--primary-light)] cursor-pointer";
                        }
                        return (
                          <button key={i} className={cls} style={style} onClick={() => selectAnswer(i)} disabled={answered}>
                            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ borderColor: "currentColor" }}>{letters[i]}</span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {answered && (
                      <div className="p-4 rounded-lg text-sm mb-4" style={{ background: "var(--primary-light)", borderLeft: "3px solid var(--primary)" }}>
                        <p className="font-semibold mb-1" style={{ color: "var(--primary)" }}>Açıklama</p>
                        <p style={{ color: "var(--text)" }}>{q.exp}</p>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: "var(--text-muted)" }}>Puan: <span style={{ color: "var(--primary)", fontWeight: 600 }}>{score}</span> / {quizIdx}</span>
                      {answered && (
                        <button onClick={nextQuestion}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity"
                          style={{ background: "var(--primary)" }}>
                          {quizIdx + 1 < QUIZ.length ? "Sonraki Soru →" : "Sonucu Gör →"}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-xl border p-8 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="text-5xl font-bold mb-2" style={{ color: score / QUIZ.length >= 0.85 ? "var(--success)" : score / QUIZ.length >= 0.65 ? "var(--primary)" : "var(--warning)" }}>
                    {Math.round((score / QUIZ.length) * 100)}%
                  </div>
                  <p className="font-semibold mb-1">{score / QUIZ.length >= 0.85 ? "Mükemmel!" : score / QUIZ.length >= 0.65 ? "İyi" : "Tekrar Et"}</p>
                  <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>{score} / {QUIZ.length} doğru</p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <button onClick={startQuiz}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90"
                      style={{ background: "var(--primary)" }}>Tekrar Başla</button>
                    <button onClick={() => { setView("home"); setActiveNerve(null); }}
                      className="px-4 py-2 rounded-lg text-sm font-medium border hover:bg-[var(--primary-light)] transition-all"
                      style={{ borderColor: "var(--border)", color: "var(--text)" }}>Konulara Dön</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
