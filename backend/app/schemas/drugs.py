"""DrugBank + CARD (antibiyotik) API yanıt modelleri."""

from pydantic import BaseModel, Field


class DrugSummary(BaseModel):
    drugbank_id: str
    name: str
    drug_type: str | None = None
    groups: str | None = None
    atc_codes: str | None = None
    indication: str | None = Field(None, description="İlk 200 karakter")


class DrugSearchResponse(BaseModel):
    total: int
    page: int
    results: list[DrugSummary]


class DrugDetail(BaseModel):
    drugbank_id: str
    name: str
    drug_type: str | None = None
    groups: str | None = None
    description: str | None = None
    indication: str | None = None
    mechanism: str | None = None
    pharmacodynamics: str | None = None
    toxicity: str | None = None
    metabolism: str | None = None
    absorption: str | None = None
    half_life: str | None = None
    protein_binding: str | None = None
    route_of_elimination: str | None = None
    volume_of_distribution: str | None = None
    drug_interactions: str | None = None
    food_interactions: str | None = None
    targets: str | None = None
    atc_codes: str | None = None
    average_mass: str | None = None


class DrugCompareResponse(BaseModel):
    drugs: list[DrugDetail]


class AtcTreeResponse(BaseModel):
    categories: list[str]


class ByAtcResponse(BaseModel):
    results: list[DrugSummary]


class AntibioticOrganismRow(BaseModel):
    antibiotic_name: str | None = None
    organism: str | None = None
    resistance_mechanism: str | None = None
    aro_accession: str | None = None
    amr_gene_family: str | None = None
    drug_class: str | None = None
    description: str | None = None


class AntibioticOrganismItem(BaseModel):
    antibiotic_name: str
    organism: str | None = None
    resistance_mechanism: str | None = None
    aro_accession: str | None = None
    amr_gene_family: str | None = None
    drug_class: str | None = None
    description: str | None = None


class ResistanceMechanismGroupOut(BaseModel):
    resistance_mechanism: str
    count: int
    gene_families: list[str]
    entries: list[AntibioticOrganismItem]


class ByDrugClassResponse(BaseModel):
    drug_class: str
    total: int
    resistance_mechanisms: list[ResistanceMechanismGroupOut]


class ByDrugAntibioticResponse(BaseModel):
    antibiotic_name: str
    organisms: list[AntibioticOrganismRow]


class AntibioticHitItem(BaseModel):
    antibiotic_name: str
    drugbank_id: str | None = None
    resistance_mechanism: str | None = None
    drug_class: str | None = None


class ByOrganismResponse(BaseModel):
    organism: str
    antibiotics: list[AntibioticHitItem]


class OrganismsListResponse(BaseModel):
    organisms: list[str]


class DrugClassesResponse(BaseModel):
    classes: list[str]
