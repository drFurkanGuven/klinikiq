/** Histoloji listesi, filtreler ve manuel yükleme formları için ortak sınıflandırma. */

export const HISTOLOGY_SPECIALTIES: Record<string, string> = {
  pathology: "Patoloji",
  cardiology: "Kardiyoloji",
  endocrinology: "Endokrinoloji",
  neurology: "Nöroloji",
  pulmonology: "Pulmonoloji",
  gastroenterology: "Gastroenteroloji",
  nephrology: "Nefroloji",
  infectious_disease: "Enfeksiyon",
  hematology: "Hematoloji",
  rheumatology: "Romatoloji",
  basic_sciences: "Temel bilimler (histoloji)",
};

/** Liste / filtre (histoloji sayfası) */
export const CURRICULUM_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Tüm preparatlar" },
  { value: "clinical", label: "Klinik branşlar" },
  { value: "basic_cell_tissue", label: "Hücre ve doku" },
  { value: "basic_organ_system", label: "Organ sistemleri (temel)" },
];

/** Yükleme formu: boş = klinik kayıt (müfredat yok) */
export const CURRICULUM_TRACK_UPLOAD: { value: string; label: string }[] = [
  { value: "", label: "Klinik / müfredat belirtilmedi" },
  { value: "basic_cell_tissue", label: "Hücre ve doku (temel histoloji)" },
  { value: "basic_organ_system", label: "Organ sistemleri (temel)" },
];

export const SCIENCE_UNIT_LABELS: Record<string, string> = {
  epithelium: "Epitel",
  connective_tissue: "Bağ doku",
  muscle_tissue: "Kas dokusu",
  cartilage_bone: "Kıkırdak ve kemik",
  nervous_tissue: "Sinir dokusu",
  blood: "Kan ve yayma",
  lymphoid: "Lenfoid sistem",
  respiratory: "Solunum",
  digestive: "Sindirim",
};

export const SCIENCE_UNIT_OPTIONS = Object.entries(SCIENCE_UNIT_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const STAIN_OPTIONS = ["", "H&E", "PAS", "Masson", "IHC", "Wright-Giemsa"];

export const ORGAN_OPTIONS = [
  "",
  "Epitel",
  "Bağ doku",
  "Kas",
  "Kemik",
  "Kan",
  "Akciğer",
  "Böbrek",
  "Meme",
  "Adrenal",
  "Serebellum",
];
