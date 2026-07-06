"""Soru metninden konu etiketi ve harita deep link üretimi."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

_REGISTRY_PATH = (
    Path(__file__).resolve().parents[2] / "data" / "mastery" / "topic_registry.json"
)


@lru_cache(maxsize=1)
def _load_registry() -> list[dict[str, Any]]:
    if not _REGISTRY_PATH.is_file():
        return []
    data = json.loads(_REGISTRY_PATH.read_text(encoding="utf-8"))
    topics = data.get("topics")
    return topics if isinstance(topics, list) else []


def classify_topic(item: dict[str, Any]) -> str | None:
    """Soru için en iyi topic_slug tahmini."""
    parts: list[str] = [
        str(item.get("question_tr") or ""),
        str(item.get("question") or ""),
    ]
    matched = item.get("matched_keywords")
    if isinstance(matched, list):
        parts.extend(str(k) for k in matched)
    opts = item.get("options_tr") or item.get("options")
    if isinstance(opts, list):
        for o in opts:
            if isinstance(o, dict) and o.get("text") is not None:
                parts.append(str(o["text"]))
    blob = " ".join(parts).lower()

    best_slug: str | None = None
    best_score = 0
    for topic in _load_registry():
        slug = str(topic.get("topic_slug") or "")
        kws = topic.get("keywords") or []
        if not slug or not isinstance(kws, list):
            continue
        score = 0
        for kw in kws:
            kw_l = str(kw).lower().strip()
            if kw_l and kw_l in blob:
                score += max(1, len(kw_l) // 4)
        if score > best_score:
            best_score = score
            best_slug = slug
    return best_slug if best_score > 0 else None


def topic_label(slug: str | None) -> str | None:
    if not slug:
        return None
    for topic in _load_registry():
        if topic.get("topic_slug") == slug:
            return str(topic.get("label_tr") or slug)
    return slug


def remediation_for_topic(slug: str | None) -> dict[str, str] | None:
    if not slug:
        return None
    for topic in _load_registry():
        if topic.get("topic_slug") != slug:
            continue
        map_id = topic.get("pharma_map_id")
        if not map_id:
            return {
                "topic_slug": slug,
                "topic_label": str(topic.get("label_tr") or slug),
            }
        node_id = topic.get("pharma_node_id")
        href = f"/farmakoloji/haritalar/{map_id}"
        if node_id:
            href += f"?focus={node_id}"
        return {
            "topic_slug": slug,
            "topic_label": str(topic.get("label_tr") or slug),
            "map_href": href,
        }
    return None


def all_topics() -> list[dict[str, Any]]:
    return list(_load_registry())
