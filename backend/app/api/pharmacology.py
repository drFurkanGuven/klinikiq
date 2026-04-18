"""
Farmakoloji — TİTCK ilaç verisi, [turkish-medicine-api](https://github.com/tugcantopaloglu/turkish-medicine-api) üzerinden proxy.

Yerelde: `npm run download && npm start` (varsayılan port 3000).
Backend: `TURKISH_MEDICINE_API_URL=http://127.0.0.1:3000`
"""

from __future__ import annotations

import os
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()


def _titck_row_barcode_digits(row: dict[str, Any]) -> str | None:
    """TİTCK satırından barkod rakamları (frontend titckBarcode ile uyumlu)."""
    raw = row.get("Barkod") if "Barkod" in row else row.get("barkod")
    if raw is None or raw == "":
        return None
    if isinstance(raw, bool):
        return None
    if isinstance(raw, (int, float)):
        if isinstance(raw, float) and not raw.is_integer():
            return None
        s = str(int(raw))
    elif isinstance(raw, str):
        s = "".join(c for c in raw if c.isdigit())
    else:
        return None
    return s if len(s) >= 8 else None


def _pick_row_by_barcode_search(rows: list[dict[str, Any]], digits: str, sheet: str | None) -> dict[str, Any] | None:
    """Aynı barkodlu satırlar içinden mümkünse doğru sayfayı seç."""
    exact = [r for r in rows if _titck_row_barcode_digits(r) == digits]
    if not exact:
        return None
    if len(exact) == 1:
        return exact[0]
    if sheet and sheet.strip():
        sh = sheet.strip()
        for r in exact:
            if r.get("_sheet") == sh:
                return r
    return exact[0]

HTTP_TIMEOUT = 45.0


def _turkish_api_base() -> str:
    base = (os.environ.get("TURKISH_MEDICINE_API_URL") or "").strip().rstrip("/")
    if not base:
        raise HTTPException(
            status_code=503,
            detail=(
                "Türkiye ilaç API adresi tanımlı değil. "
                "turkish-medicine-api çalışırken TURKISH_MEDICINE_API_URL ayarlayın "
                "(örn. http://127.0.0.1:3000)."
            ),
        )
    return base


async def _proxy_get(path: str, params: dict[str, Any] | None = None) -> Any:
    base = _turkish_api_base()
    url = f"{base}{path}"
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(url, params=params or {}, timeout=HTTP_TIMEOUT)
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"İlaç API erişilemedi: {e!s}") from e

    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="Kayıt bulunamadı.")
    if r.status_code >= 400:
        try:
            body = r.json()
            msg = body.get("error") if isinstance(body, dict) else str(body)
        except Exception:
            msg = r.text[:200] or r.reason_phrase
        # 4xx ve 503 (veri henüz yüklenmedi) aynen iletilir; diğer 5xx → 502
        if 400 <= r.status_code < 500 or r.status_code == 503:
            raise HTTPException(status_code=r.status_code, detail=str(msg))
        raise HTTPException(status_code=502, detail=str(msg))

    try:
        return r.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail="İlaç API geçersiz yanıt verdi.") from e


@router.get("/search")
async def search_turkey_medicines(
    q: str = Query(..., min_length=2, max_length=200),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    sheet: str | None = Query(
        None,
        max_length=120,
        description="Opsiyonel TİTCK sayfa adı (örn. AKTİF ÜRÜNLER LİSTESİ). Boş = tüm sayfalar.",
    ),
):
    """TİTCK listesinde tam metin arama (upstream: GET /api/medicines/search)."""
    q = q.strip()
    if len(q) < 2:
        raise HTTPException(status_code=400, detail="En az 2 karakter girin.")
    params: dict[str, Any] = {"q": q, "page": page, "limit": limit}
    if sheet and sheet.strip():
        params["sheet"] = sheet.strip()
    return await _proxy_get("/api/medicines/search", params)


@router.get("/medicine/{medicine_id}")
async def get_turkey_medicine(medicine_id: int):
    """Tek kayıt (upstream: GET /api/medicines/:id).

    Upstream tüm sayfaları tek dizide birleştirirken her sayfada id 1..n yeniden
    başladığı için aynı id birden fazla üründe tekrarlanır; id ile yanlış kayıt
    dönebilir. Mümkünse barkod endpoint'ini kullanın.
    """
    if medicine_id < 1:
        raise HTTPException(status_code=400, detail="Geçersiz kayıt numarası.")
    return await _proxy_get(f"/api/medicines/{medicine_id}")


@router.get("/medicine-by-barcode")
async def get_turkey_medicine_by_barcode(
    barcode: str = Query(..., min_length=8, max_length=32),
    sheet: str | None = Query(
        None,
        max_length=120,
        description="Arama sonucundaki _sheet (aynı barkod nadir tekrarlarda ayırt için).",
    ),
):
    """TİTCK kaydını barkod ile getirir (upstream: GET /api/medicines/search?q=…).

    Birleşik listede tekrarlayan id sorununu aşmak için liste satırındaki barkod
    ile tam eşleşen satır seçilir.
    """
    digits = "".join(ch for ch in barcode if ch.isdigit())
    if len(digits) < 8:
        raise HTTPException(status_code=400, detail="Geçersiz barkod.")

    async def search_rows(with_sheet: str | None) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"q": digits, "page": 1, "limit": 200}
        if with_sheet and with_sheet.strip():
            params["sheet"] = with_sheet.strip()
        body = await _proxy_get("/api/medicines/search", params)
        data = body.get("data")
        if not isinstance(data, list):
            return []
        return [r for r in data if isinstance(r, dict)]

    chosen_sheet = sheet.strip() if sheet and sheet.strip() else None
    rows = await search_rows(chosen_sheet)
    picked = _pick_row_by_barcode_search(rows, digits, chosen_sheet)
    if picked is None and chosen_sheet:
        rows = await search_rows(None)
        picked = _pick_row_by_barcode_search(rows, digits, None)

    if picked is None:
        raise HTTPException(
            status_code=404,
            detail="Bu barkod için TİTCK kaydı bulunamadı.",
        )
    return picked
