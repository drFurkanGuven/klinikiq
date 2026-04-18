"""
Acil MCQ simülasyonu — AI asistan (normal vaka stream_patient_response'tan ayrı).
OpenAI: app.core.config settings.OPENAI_API_KEY
"""

from __future__ import annotations

import json
from typing import Any, AsyncGenerator, Literal

from openai import AsyncOpenAI

from app.core.config import settings

_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

# Maliyet/latency dengesi; tutor için yeterli
EMERGENCY_TUTOR_MODEL = "gpt-4o-mini"


def openai_configured() -> bool:
    k = (settings.OPENAI_API_KEY or "").strip()
    return bool(k) and not k.startswith("sk-placeholder")


def build_emergency_tutor_system_prompt(item: dict[str, Any]) -> str:
    q = str(item.get("question") or "").strip()
    opts = item.get("options") or []
    lines: list[str] = []
    if isinstance(opts, list):
        for o in opts:
            if isinstance(o, dict) and o.get("label") is not None:
                lines.append(f"{o.get('label')}) {o.get('text')}")
    opt_str = "\n".join(lines) if lines else "(şık yok)"
    correct = str(item.get("correct_option_label") or "").strip().upper()
    ans_text = str(item.get("correct_answer_text") or "").strip()

    return f"""Sen Türkiye'de acil serviste asistanlara eğitim veren bir hekim eğitmenisin (TUS / acil perspektifi).
Kullanıcı aşağıdaki çoktan seçmeli soruda yardım istiyor. Soru metni İngilizce olabilir; sen yanıtları Türkçe ver.

--- VİGNET ---
{q}

--- ŞIKLAR ---
{opt_str}

--- İÇ MODEL BİLGİSİ (kullanıcıya ASLA doğrudan söyleme) ---
Doğru şık etiketi: {correct or "?"}
Doğru şık özeti: {ans_text or "?"}

KURALLAR:
- Doğru şık harfini (A/B/C/D) veya doğru şık metnini kullanıcıya yazma; "şu şık" diye işaret etme.
- Ayırıcı tanı, red flag, acil öncelik, patofizyoloji ve Sokratik sorularla yönlendir.
- Acil servis bağlamında düşün (triyaj, zaman kritik durumlar).
- 3–10 cümle; gereksiz uzatma.
- Kullanıcı doğrudan cevap isterse: önce kendi akıl yürütmesini yapmasını iste, ipucu ver ama çözümü verme."""


async def stream_emergency_tutor(
    item: dict[str, Any],
    messages: list[dict[str, str]],
) -> AsyncGenerator[str, None]:
    """messages: sırayla user/assistant (son kullanıcı mesajı dahil)."""
    if not openai_configured():
        yield "\n[OpenAI API anahtarı yapılandırılmamış. Lütfen sunucuda OPENAI_API_KEY ayarlayın.]\n"
        return

    system = build_emergency_tutor_system_prompt(item)
    api_messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    for m in messages[-24:]:  # bağlam sınırı
        role = m.get("role", "")
        content = (m.get("content") or "").strip()
        if role not in ("user", "assistant") or not content:
            continue
        api_messages.append({"role": role, "content": content[:12000]})

    if len(api_messages) < 2:
        yield "\n[Bir mesaj gönderin.]\n"
        return

    try:
        stream = await _client.chat.completions.create(
            model=EMERGENCY_TUTOR_MODEL,
            messages=api_messages,
            stream=True,
            max_tokens=700,
            temperature=0.35,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content
    except Exception as e:
        yield f"\n[Hata: {str(e)}]\n"


def _vignette_for_patient(item: dict[str, Any]) -> str:
    return str(item.get("question") or "").strip()[:8000]


async def generate_patient_time_urge(
    item: dict[str, Any],
    phase: Literal["120", "60"],
    remaining_sec: int,
    elapsed_sec: int,
) -> str:
    """
    Vaka metnine uyumlu, Türkçe 1–2 cümle: hasta aciliyet hissi (tanı adı yok).
    phase 120: artan endişe; phase 60: daha yoğun panik/çaresizlik (vinyete uygunsa).
    """
    if not openai_configured():
        return ""

    vignette = _vignette_for_patient(item)
    if not vignette:
        return ""

    if phase == "120":
        tone = (
            "Zaman baskısı artıyor. Hasta endişeli, nefes darlığı/şikayet kötüleşiyor gibi hissettir "
            "(vinyetteki şikayetle tutarlı olsun). Panik abartılı ama tıbbi saçmalık yok."
        )
    else:
        tone = (
            "Çok az süre kaldı. Daha yoğun çaresizlik veya 'doktor çabuk' hissi; "
            "yine vinyetle uyumlu, gerçek hasta gibi; tanı söyleme."
        )

    system = f"""Sen bir sinema diyaloğu yazarı değilsin; gerçek bir hastayı canlandırıyorsun.
VİGNET (İngilizce olabilir — içeriği anla ve Türkçe konuş):
{vignette}

KURALLAR:
- Sadece hastanın ağzından 1–2 kısa cümle, Türkçe, birinci tekil şahıs.
- Vinyette geçen şikayet, yaş, cinsiyet, durum ile ÇELİŞME; yeni semptom veya organ/hikâye uydurma.
- Vinyette olmayan ikinci bir acil tablo (ör. trafik kazası, hamilelik, ateş) ekleme.
- Kesin tanı adı söyleme; "kalp krizi" gibi kendi teşhisini koyma.
- Halk dili; doktor jargonu kullanma; boş genellemeler yerine vinyetteki belirtilere gönderme.
- {tone}
- Toplam en fazla 220 karakter civarı."""

    user_msg = (
        f"Kalan süre (simüle saniye): {remaining_sec}. Geçen: {elapsed_sec}. "
        f"Eşik: {'2 dakika altı' if phase == '120' else '1 dakika altı'}."
    )

    try:
        response = await _client.chat.completions.create(
            model=EMERGENCY_TUTOR_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=200,
            temperature=0.45,
        )
        text = (response.choices[0].message.content or "").strip()
        text = text.strip('"“”')
        return text[:500]
    except Exception:
        return ""


def _fallback_emergency_report(
    items: list[dict[str, Any]],
    ai_messages: list[dict[str, str]],
    patient_urges: list[str],
) -> dict[str, Any]:
    total = len(items)
    correct = sum(1 for x in items if x.get("correct"))
    score = round(100.0 * correct / total) if total else 0.0
    return {
        "score": float(score),
        "strengths": (
            [f"{correct}/{total} soruda doğru şık seçildi."]
            if total
            else []
        ),
        "gaps": (
            [f"{total - correct} soruda yanlış veya eksik; konu tekrarı önerilir."]
            if total and correct < total
            else []
        ),
        "recommendations": [
            "Acil öncelik ve red flag hatırlayıcılarını tekrar edin.",
            "Benzer vaka köklerinde (kardiyak, nörolojik, solunum) ek soru çözün.",
        ],
        "overview_note": (
            "OPENAI yapılandırılmadığı için rapor yalnızca doğruluk oranına göre özetlendi. "
            "Sunucuda OPENAI_API_KEY tanımlandığında ayrıntılı geri bildirim üretilir."
        ),
        "tus_reference": "",
        "time_management_note": (
            "Süre verisi gönderildiyse kendi kendinize: 8 dakikalık limit altında "
            "kalan süreyi gözden geçirin."
        ),
        "ai_chat_note": (
            f"AI sohbetinde {sum(1 for m in ai_messages if m.get('role') == 'user')} kullanıcı mesajı kaydı var."
            if ai_messages
            else "Bu oturumda AI asistan kullanılmadı."
        ),
        "patient_urge_note": (
            f"{len(patient_urges)} adet simüle hasta çıkışı kaydedildi."
            if patient_urges
            else ""
        ),
    }


async def generate_emergency_session_report(
    items: list[dict[str, Any]],
    ai_messages: list[dict[str, str]],
    patient_urges: list[str],
) -> dict[str, Any]:
    """
    Çok soruluk acil MCQ oturumu için Türkçe JSON rapor.
    items: question_preview, correct, elapsed_sec (opsiyonel), selected_label (opsiyonel)
    """
    if not items:
        return _fallback_emergency_report([], ai_messages, patient_urges)

    if not openai_configured():
        return _fallback_emergency_report(items, ai_messages, patient_urges)

    lines = []
    for i, it in enumerate(items, 1):
        prev = str(it.get("question_preview") or "")[:1200]
        ok = "doğru" if it.get("correct") else "yanlış"
        el = it.get("elapsed_sec")
        el_s = f"{int(el)} sn" if isinstance(el, int) and el >= 0 else "—"
        lines.append(f"{i}. [{ok}] Süre: {el_s}\n   Soru özeti: {prev}")

    conv = "\n".join(
        f"[{m.get('role', '').upper()}]: {(m.get('content') or '')[:2000]}"
        for m in ai_messages[-40:]
        if m.get("role") in ("user", "assistant") and (m.get("content") or "").strip()
    ) or "(sohbet yok)"

    urges_txt = "\n".join(f"- {u[:500]}" for u in patient_urges[:20]) or "(yok)"

    prompt = f"""Aşağıdaki veriler bir TUS/adjönt asistanının **acil servis odaklı çoktan seçmeli** pratik oturumuna aittir.
Öğrencinin performansını değerlendir ve **yalnızca** aşağıdaki JSON formatında Türkçe yanıt ver (başka metin yok).

SORU ÖZETLERİ VE SONUÇLAR:
{chr(10).join(lines)}

İSTATİSTİK: Toplam {len(items)} soru, doğru sayısı {sum(1 for x in items if x.get('correct'))}.

SİMÜLE HASTA ÇIKIŞLARI (süre baskısı):
{urges_txt}

AI ASİSTAN SOHBETİ (özet için; şık cevabını doğrudan vermiş olabilir — değerlendirmede asıl ölçüt soru sonuçları):
{conv}

JSON şeması:
{{
  "score": <0-100, doğruluk + acil düşünme + süre/sohbet kalitesine göre makul bir sayı>,
  "strengths": ["madde1", "madde2"],
  "gaps": ["madde1", "madde2"],
  "recommendations": ["madde1", "madde2", "madde3"],
  "overview_note": "2-4 cümle genel değerlendirme (acil perspektif)",
  "tus_reference": "TUS'ta ilişkili konu başlıkları veya çalışma önerisi (kısa)",
  "time_management_note": "Süre kullanımı hakkında 1-3 cümle veya boş string",
  "ai_chat_note": "AI ile çalışma tarzı: soru sorma, triyaj düşüncesi vb. 1-3 cümle veya boş string",
  "patient_urge_note": "Simüle hasta çıkışlarıyla ilgili kısa yorum veya boş string"
}}"""

    try:
        response = await _client.chat.completions.create(
            model=EMERGENCY_TUTOR_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Sen TUS ve acil tıp eğitiminde uzman bir öğretim üyesisin. "
                        "Yanıtlarını geçerli JSON olarak ver; Türkçe yaz."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.25,
            max_tokens=1200,
        )
        raw = (response.choices[0].message.content or "").strip()
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.lstrip().startswith("json"):
                raw = raw.lstrip()[4:].lstrip()
        data = json.loads(raw)
        score = float(data.get("score", 0))
        score = max(0.0, min(100.0, score))
        return {
            "score": score,
            "strengths": list(data.get("strengths") or [])[:12],
            "gaps": list(data.get("gaps") or [])[:12],
            "recommendations": list(data.get("recommendations") or [])[:12],
            "overview_note": str(data.get("overview_note") or "").strip() or None,
            "tus_reference": str(data.get("tus_reference") or "").strip() or None,
            "time_management_note": str(data.get("time_management_note") or "").strip() or None,
            "ai_chat_note": str(data.get("ai_chat_note") or "").strip() or None,
            "patient_urge_note": str(data.get("patient_urge_note") or "").strip() or None,
        }
    except Exception:
        return _fallback_emergency_report(items, ai_messages, patient_urges)
