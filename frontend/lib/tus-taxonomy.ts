/**
 * Tıp (TUS) — Temel / Klinik bilimler sınıflandırması.
 * Paylaşım formları ve topluluk akışı filtreleri için tek kaynak.
 */

export type TusGroupId = "temel" | "klinik";

export type TusTopic = {
  id: string;
  name: string;
};

export type TusBranch = {
  id: string;
  name: string;
  topics: TusTopic[];
};

export const TIP_SECTION_LABEL = "Tıp" as const;

export const TUS_GROUP_META: Record<
  TusGroupId,
  { id: TusGroupId; label: string; description: string }
> = {
  temel: {
    id: "temel",
    label: "Temel bilimler",
    description: "Anatomi, fizyoloji, patoloji, farmakoloji ve ilişkili temel dersler.",
  },
  klinik: {
    id: "klinik",
    label: "Klinik bilimler",
    description: "Dahiliye, cerrahi, pediatri, KHD ve diğer klinik branşlar.",
  },
};

/** Temel bilimler — dal ve konu listeleri */
export const TUS_TEMEL_BRANCHES: TusBranch[] = [
  {
    id: "anatomi",
    name: "Anatomi",
    topics: [
      { id: "ust-alt-ekstremite", name: "Üst ve alt ekstremite" },
      { id: "gogus-mediasten-kalp", name: "Göğüs duvarı, mediasten, kalp" },
      { id: "karin-periton-retroperiton", name: "Karın duvarı, periton, retroperiton" },
      { id: "gastrointestinal-anatomi", name: "Gastrointestinal sistem" },
      { id: "karaciger-safra-pankreas-anat", name: "Karaciğer, safra yolları, pankreas" },
      { id: "bobrek-uriner", name: "Böbrek ve üriner sistem" },
      { id: "pelvis-genital-anat", name: "Pelvis ve genital sistem" },
      { id: "bas-boyun", name: "Baş-boyun" },
      { id: "omurga-sinir-sistemi-anat", name: "Omurga, beyin, omurilik, kranial sinirler" },
      { id: "endokrin-anat", name: "Endokrin bezler" },
    ],
  },
  {
    id: "histoloji-embriyoloji",
    name: "Histoloji ve embriyoloji",
    topics: [
      { id: "temel-dokular", name: "Epitel, bağ doku, kas, sinir" },
      { id: "dolasim-kan", name: "Dolaşım ve kan hücreleri" },
      { id: "gi-histoloji", name: "Gastrointestinal histoloji" },
      { id: "solunum-uriner-histoloji", name: "Solunum ve üriner histoloji" },
      { id: "genital-histoloji", name: "Genital sistem histolojisi" },
      { id: "embriyo-ilk-haftalar", name: "İlk haftalar ve germ katmanları" },
      { id: "yuz-agiz-gelisim", name: "Yüz, ağız, farinks gelişimi" },
      { id: "kalp-damar-embriyo", name: "Kalp ve damar gelişimi" },
      { id: "urogenital-embriyo", name: "Ürogenital gelişim" },
      { id: "sinir-embriyo", name: "Sinir sistemi gelişimi" },
    ],
  },
  {
    id: "fizyoloji",
    name: "Fizyoloji",
    topics: [
      { id: "hucre-membran-transport", name: "Hücre membranı ve transport" },
      { id: "sinir-kas-fizyolojisi", name: "Sinir ve kas fizyolojisi" },
      { id: "kardiyovaskuler-fiz", name: "Kardiyovasküler fizyoloji" },
      { id: "solunum-fiz", name: "Solunum fizyolojisi" },
      { id: "bobrek-sivi-elektrolit-asitbaz", name: "Böbrek, sıvı-elektrolit, asit-baz" },
      { id: "gi-motilite-emilim", name: "GI motilite, salgı ve emilim" },
      { id: "endokrin-fiz", name: "Endokrin fizyoloji" },
      { id: "ureme-fiz", name: "Üreme fizyolojisi" },
    ],
  },
  {
    id: "biyokimya",
    name: "Biyokimya",
    topics: [
      { id: "amino-asit-protein-enzim", name: "Amino asitler, proteinler, enzimler" },
      { id: "karbonhidrat-metabolizma", name: "Karbonhidrat metabolizması" },
      { id: "lipid-metabolizma", name: "Lipid metabolizması" },
      { id: "mitokondri-etz", name: "Mitokondri ve elektron transport zinciri" },
      { id: "vitamin-mineral", name: "Vitaminler ve mineraller" },
      { id: "hemoglobin-porfiri", name: "Hemoglobin ve porfiri" },
      { id: "doku-metabolizma", name: "Karaciğer, kas, beyin metabolizması" },
    ],
  },
  {
    id: "mikrobiyoloji",
    name: "Mikrobiyoloji",
    topics: [
      { id: "bakteriler", name: "Bakteriler (önemli patojenler)" },
      { id: "mantarlar", name: "Mantarlar" },
      { id: "virusler", name: "Virüsler" },
      { id: "sterilizasyon-asepsi", name: "Sterilizasyon ve antisepsi" },
      { id: "antibiyotik-direnc", name: "Antibiyotikler ve direnç" },
      { id: "asi-bagisiklik", name: "Aşılar ve bağışıklama" },
      { id: "lab-tani", name: "Laboratuvar tanı yaklaşımı" },
    ],
  },
  {
    id: "parazitoloji",
    name: "Parazitoloji",
    topics: [
      { id: "protozoonlar", name: "Protozoonlar" },
      { id: "helmintler", name: "Helmintler" },
      { id: "ektoparazitler", name: "Ekto-parazitler" },
      { id: "parazit-epidemi-tedavi", name: "Epidemiyoloji ve tedavi ilkeleri" },
    ],
  },
  {
    id: "patoloji",
    name: "Patoloji",
    topics: [
      { id: "hucre-hasari-adaptasyon", name: "Hücre hasarı, adaptasyon, nekroz" },
      { id: "inflamasyon-onarim", name: "İnflamasyon ve onarım" },
      { id: "tromboz-emboli-sok", name: "Hemodinamik bozukluklar, tromboz, emboli" },
      { id: "immun-patoloji", name: "İmmün patoloji" },
      { id: "neoplazi-genel", name: "Neoplazi (genel prensipler)" },
      { id: "sistem-patolojileri", name: "Sistem patolojileri (KV, solunum, GI, böbrek…)" },
    ],
  },
  {
    id: "farmakoloji",
    name: "Farmakoloji",
    topics: [
      { id: "pk-pd", name: "Farmakokinetik ve farmakodinami" },
      { id: "otonon-farm", name: "Otonom farmakoloji" },
      { id: "kardiyovaskuler-ilac", name: "Kardiyovasküler ilaçlar" },
      { id: "solunum-gi-ilac", name: "Solunum ve GI ilaçları" },
      { id: "diuretik-raas", name: "Diüretikler ve RAAS" },
      { id: "endokrin-ilac", name: "Endokrin ilaçlar" },
      { id: "antimikrobiyal", name: "Antimikrobiyaller" },
      { id: "analjezik-nsaii-opioid", name: "Analjezikler, NSAİİ, opioidler" },
      { id: "antikoagulan", name: "Antikoagülanlar ve antitrombotikler" },
      { id: "sns-psikoaktif", name: "SNS ilaçları" },
    ],
  },
  {
    id: "genetik",
    name: "Tıbbi genetik",
    topics: [
      { id: "mendel-kalitim", name: "Mendel kalıtımı ve paternler" },
      { id: "kromozom-bozukluklari", name: "Kromozom bozuklukları" },
      { id: "mutasyon-dna-onarim", name: "Mutasyon ve DNA onarımı" },
      { id: "populasyon-genetigi", name: "Popülasyon genetiği (temel)" },
    ],
  },
];

/** Klinik bilimler — dal ve konu listeleri */
export const TUS_KLINIK_BRANCHES: TusBranch[] = [
  {
    id: "dahiliye",
    name: "İç hastalıkları (Dahiliye)",
    topics: [
      { id: "akciger-hastaliklari", name: "Akciğer hastalıkları" },
      { id: "kardiyoloji-dahiliye", name: "Kardiyoloji" },
      { id: "gastroenteroloji-dahiliye", name: "Gastroenteroloji" },
      { id: "nefroloji", name: "Nefroloji" },
      { id: "hematoloji", name: "Hematoloji" },
      { id: "endokrinoloji-dahiliye", name: "Endokrinoloji" },
      { id: "romatoloji", name: "Romatoloji" },
      { id: "enfeksiyon", name: "Enfeksiyon hastalıkları" },
      { id: "noroloji-dahiliye", name: "Nöroloji (dahiliye perspektifi)" },
    ],
  },
  {
    id: "cerrahi",
    name: "Cerrahi bilimler",
    topics: [
      { id: "preop-degerlendirme", name: "Preoperatif değerlendirme" },
      { id: "yara-enfeksiyon", name: "Yara iyileşmesi ve enfeksiyon" },
      { id: "abdominal-aciller", name: "Abdominal aciller" },
      { id: "herni", name: "Herniler" },
      { id: "safra-pankreas-cerrahi", name: "Safra ve pankreas (cerrahi)" },
      { id: "travma-cerrahi", name: "Travma cerrahisi (temel)" },
      { id: "meme-kolorektal-temel", name: "Meme ve kolorektal (temel)" },
    ],
  },
  {
    id: "kadin-dogum",
    name: "Kadın hastalıkları ve doğum",
    topics: [
      { id: "gebelik-takibi", name: "Gebelik takibi ve trimester sorunları" },
      { id: "preeklampsi-eklampsi", name: "Preeklampsi ve eklampsi" },
      { id: "dogum-obstetrik-acil", name: "Doğum eylemi ve obstetrik aciller" },
      { id: "jinekolojik-kanama", name: "Jinekolojik kanamalar" },
      { id: "endometriozis-adenomiyozis", name: "Endometriozis ve adenomiyozis" },
      { id: "hpv-serviks", name: "HPV ve serviks patolojisi" },
      { id: "kontrasepsiyon", name: "Kontrasepsiyon" },
    ],
  },
  {
    id: "pediatri",
    name: "Pediatri",
    topics: [
      { id: "buyume-beslenme", name: "Büyüme, gelişme ve beslenme" },
      { id: "asi-takvimi", name: "Aşı takvimi" },
      { id: "solunum-enfeksiyonlari-ped", name: "Solunum enfeksiyonları" },
      { id: "gastroenterit-dehidratasyon", name: "Gastroenterit ve dehidratasyon" },
      { id: "konjenital-kalp-ped", name: "Konjenital kalp hastalıkları (temel)" },
      { id: "konvulsiyon-ped", name: "Konvülsiyon ve febril konvülsiyon" },
    ],
  },
  {
    id: "psikiyatri",
    name: "Psikiyatri",
    topics: [
      { id: "depresyon-bipolar", name: "Depresyon ve bipolar bozukluk" },
      { id: "anksiyete", name: "Anksiyete bozuklukları" },
      { id: "sizofreni-spektrum", name: "Şizofreni spektrumu" },
      { id: "madde-kotu-kullanim", name: "Madde kullanım bozuklukları" },
      { id: "intihar-riski", name: "İntihar riski değerlendirmesi" },
      { id: "psikofarmakoloji", name: "Psikofarmakoloji" },
    ],
  },
  {
    id: "acil-tip",
    name: "Acil tıp",
    topics: [
      { id: "travma-atls", name: "Travma (ATLS prensipleri)" },
      { id: "sok-sepsis", name: "Şok ve sepsis" },
      { id: "zehirlenme", name: "Zehirlenmeler" },
      { id: "termal-yaralanma", name: "Termal yaralanmalar" },
      { id: "acil-karin", name: "Acil cerrahi abdomen" },
    ],
  },
  {
    id: "halk-sagligi",
    name: "Halk sağlığı",
    topics: [
      { id: "epidemiyoloji-temel", name: "Epidemiyoloji temelleri" },
      { id: "tarama-programlari", name: "Tarama programları" },
      { id: "bagisiklam-genel", name: "Bağışıklama" },
      { id: "meslek-hastaliklari", name: "Meslek hastalıkları (temel)" },
    ],
  },
  {
    id: "radyoloji",
    name: "Radyoloji",
    topics: [
      { id: "akciger-grafisi", name: "Akciğer grafisi (temel paternler)" },
      { id: "akut-abdomen-goruntu", name: "Akut abdomen görüntüleme" },
      { id: "bt-mr-endikasyon", name: "BT/MR endikasyonları (temel)" },
    ],
  },
  {
    id: "anestezi",
    name: "Anesteziyoloji ve reanimasyon",
    topics: [
      { id: "asa-preop", name: "ASA ve preoperatif risk" },
      { id: "anestezi-turleri", name: "Anestezi türleri" },
      { id: "havayolu-temel", name: "Havayolu yönetimi (temel)" },
      { id: "agri-yonetimi", name: "Ağrı yönetimi (temel)" },
    ],
  },
  {
    id: "gogus",
    name: "Göğüs hastalıkları",
    topics: [
      { id: "astim-koah", name: "Astım ve KOAH" },
      { id: "pnomoni-tbc", name: "Pnömoni ve TBC" },
      { id: "pe-pah-temel", name: "PE ve PAH (temel)" },
    ],
  },
  {
    id: "dermatoloji",
    name: "Dermatoloji",
    topics: [
      { id: "egzama-psoriasis", name: "Egzama ve psoriasis" },
      { id: "ilac-dokuntuleri", name: "İlaç döküntüleri" },
      { id: "deri-enfeksiyon", name: "Deri enfeksiyonları" },
      { id: "melanom-temel", name: "Melanom (temel)" },
    ],
  },
  {
    id: "goz",
    name: "Göz hastalıkları",
    topics: [
      { id: "refraksiyon", name: "Refraksiyon bozuklukları" },
      { id: "glokom-temel", name: "Glokom (temel)" },
      { id: "retinopati-temel", name: "Retina (ör. DM retinopatisi)" },
    ],
  },
  {
    id: "kbb",
    name: "Kulak burun boğaz",
    topics: [
      { id: "otitis", name: "Otitis" },
      { id: "sinuzit", name: "Sinüzit" },
      { id: "isitme-kaybi-temel", name: "İşitme kaybı (temel)" },
    ],
  },
  {
    id: "ortopedi",
    name: "Ortopedi ve travmatoloji",
    topics: [
      { id: "kirik-turleri", name: "Kırık türleri ve komplikasyonlar" },
      { id: "spor-yaralanma", name: "Spor yaralanmaları (temel)" },
      { id: "osteoporoz-artroz", name: "Osteoporoz ve osteoartrit (temel)" },
    ],
  },
  {
    id: "uroloji",
    name: "Üroloji",
    topics: [
      { id: "bph", name: "BPH" },
      { id: "tas-hastaligi", name: "Taş hastalığı" },
      { id: "urolojik-enfeksiyon", name: "Ürolojik enfeksiyonlar" },
    ],
  },
];

export function getBranchesForGroup(group: TusGroupId): TusBranch[] {
  return group === "temel" ? TUS_TEMEL_BRANCHES : TUS_KLINIK_BRANCHES;
}

export function findTopicPath(
  group: TusGroupId,
  branchId: string,
  topicId: string
): { branch: TusBranch; topic: TusTopic } | null {
  const branches = getBranchesForGroup(group);
  const branch = branches.find((b) => b.id === branchId);
  if (!branch) return null;
  const topic = branch.topics.find((t) => t.id === topicId);
  if (!topic) return null;
  return { branch, topic };
}
