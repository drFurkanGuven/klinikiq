"""
Farmakoloji — NLM RxNorm + FDA openFDA üzerinden özet ilaç bilgisi (İngilizce, ABD etiketi).
Tıbbi karar için kullanılmamalı; eğitim ve keşif amaçlıdır.
"""

from __future__ import annotations

import os
from typing import Any, List

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter()

RXNAV_BASE = "https://rxnav.nlm.nih.gov/REST"
OPENFDA_LABEL = "https://api.fda.gov/drug/label.json"

HTTP_TIMEOUT = 20.0


def _as_list(v: Any) -> list:
    if v is None:
        return []
    if isinstance(v, list):
        return v
    return [v]


def _flatten_spl_field(val: Any) -> str:
    """SPL alanı string veya string listesi olabilir."""
    parts: List[str] = []
    for item in _as_list(val):
        if isinstance(item, str) and item.strip():
            parts.append(item.strip())
    return "\n\n".join(parts) if parts else ""


def _parse_rxnorm_concepts(payload: dict) -> list[dict]:
    out: list[dict] = []
    dg = payload.get("drugGroup") or {}
    groups = dg.get("conceptGroup")
    if not groups:
        return out
    if not isinstance(groups, list):
        groups = [groups]
    for g in groups:
        props = g.get("conceptProperties")
        if not props:
            continue
        if not isinstance(props, list):
            props = [props]
        for p in props:
            rxcui = p.get("rxcui")
            name = p.get("name")
            tty = p.get("tty")
            if rxcui and name:
                out.append({"rxcui": str(rxcui), "name": str(name), "tty": tty})
    return out


def _parse_approximate(payload: dict) -> list[dict]:
    out: list[dict] = []
    ag = payload.get("approximateGroup") or {}
    cands = ag.get("candidate")
    if not cands:
        return out
    if not isinstance(cands, list):
        cands = [cands]
    for c in cands:
        rxcui = c.get("rxcui")
        name = c.get("name")
        if rxcui and name:
            out.append({"rxcui": str(rxcui), "name": str(name), "tty": None})
    return out


class DrugSearchItem(BaseModel):
    rxcui: str
    name: str
    tty: str | None = None


class DrugSearchOut(BaseModel):
    query: str
    results: list[DrugSearchItem] = Field(default_factory=list)
    source: str = "RxNorm (NLM)"


class LabelSection(BaseModel):
    key: str
    title: str
    text: str


class DrugLabelOut(BaseModel):
    rxcui: str
    generic_names: list[str] = Field(default_factory=list)
    brand_names: list[str] = Field(default_factory=list)
    manufacturer: list[str] = Field(default_factory=list)
    sections: list[LabelSection] = Field(default_factory=list)
    source: str = "openFDA (US SPL / ABD etiketi)"
    disclaimer: str = (
        "İngilizce, ABD FDA etiket özetidir; Türkiye ruhsatlı ürün bilgisi değildir. "
        "Tıbbi karar için kullanılmaz."
    )


async def _fetch_json(client: httpx.AsyncClient, url: str, params: dict | None = None) -> dict:
    r = await client.get(url, params=params or {}, timeout=HTTP_TIMEOUT)
    r.raise_for_status()
    return r.json()


def _openfda_params(search: str, api_key: str | None) -> dict:
    p: dict = {"search": search, "limit": 1}
    if api_key:
        p["api_key"] = api_key
    return p


@router.get("/search", response_model=DrugSearchOut)
async def search_drugs(
    q: str = Query(..., min_length=2, max_length=200, description="İlaç adı (örn. metformin, aspirin)"),
):
    q = q.strip()
    if len(q) < 2:
        raise HTTPException(status_code=400, detail="En az 2 karakter girin.")

    async with httpx.AsyncClient() as client:
        try:
            url = f"{RXNAV_BASE}/drugs.json"
            data = await _fetch_json(client, url, {"name": q})
            items = _parse_rxnorm_concepts(data)
            if not items:
                at_url = f"{RXNAV_BASE}/approximateTerm.json"
                at_data = await _fetch_json(client, at_url, {"term": q, "maxEntries": 20})
                items = _parse_approximate(at_data)
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"RxNorm erişilemedi: {e!s}") from e

    # Tekilleştir rxcui
    seen: set[str] = set()
    uniq: list[DrugSearchItem] = []
    for it in items:
        if it["rxcui"] in seen:
            continue
        seen.add(it["rxcui"])
        uniq.append(DrugSearchItem(**it))
        if len(uniq) >= 25:
            break

    return DrugSearchOut(query=q, results=uniq)


# SPL etiketinde sık kullanılan alanlar (openFDA mapping)
_LABEL_FIELDS: list[tuple[str, str]] = [
    ("indications_and_usage", "Endikasyon / kullanım"),
    ("dosage_and_administration", "Doz ve uygulama"),
    ("contraindications", "Kontrendikasyonlar"),
    ("warnings_and_cautions", "Uyarılar"),
    ("warnings", "Uyarılar (warnings)"),
    ("drug_interactions", "İlaç etkileşimleri"),
    ("adverse_reactions", "Yan etkiler"),
    ("pregnancy", "Gebelik"),
    ("nursing_mothers", "Emzirme"),
    ("pediatric_use", "Pediatrik kullanım"),
    ("geriatric_use", "Geriatrik kullanım"),
    ("overdosage", "Aşırı doz"),
    ("description", "Açıklama"),
    ("clinical_pharmacology", "Klinik farmakoloji"),
]


@router.get("/label/{rxcui}", response_model=DrugLabelOut)
async def get_label_by_rxcui(rxcui: str):
    rxcui = rxcui.strip()
    if not rxcui.isdigit():
        raise HTTPException(status_code=400, detail="Geçersiz RxCUI.")

    api_key = os.environ.get("OPENFDA_API_KEY") or None

    async with httpx.AsyncClient() as client:
        try:
            params = _openfda_params(f"openfda.rxcui:{rxcui}", api_key)
            data = await _fetch_json(client, OPENFDA_LABEL, params)
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"openFDA erişilemedi: {e!s}") from e

    results = data.get("results") or []
    if not results:
        raise HTTPException(
            status_code=404,
            detail="Bu RxCUI için ABD etiketi bulunamadı (openFDA). Başka bir isim deneyin.",
        )

    row = results[0]
    of = row.get("openfda") or {}

    generic_names = [str(x) for x in _as_list(of.get("generic_name")) if x]
    brand_names = [str(x) for x in _as_list(of.get("brand_name")) if x]
    manufacturer = [str(x) for x in _as_list(of.get("manufacturer_name")) if x]

    sections: list[LabelSection] = []
    for key, title in _LABEL_FIELDS:
        text = _flatten_spl_field(row.get(key))
        if text:
            # Çok uzun blokları kısalt (UI)
            if len(text) > 12000:
                text = text[:12000] + "\n\n[… metin kısaltıldı]"
            sections.append(LabelSection(key=key, title=title, text=text))

    return DrugLabelOut(
        rxcui=rxcui,
        generic_names=generic_names,
        brand_names=brand_names,
        manufacturer=manufacturer,
        sections=sections,
    )
