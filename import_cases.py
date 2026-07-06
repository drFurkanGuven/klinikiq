"""
KlinikIQ — Vaka Import Scripti
================================
cases_ready.jsonl dosyasını PostgreSQL'e yükler.
Projenin .env dosyasındaki DATABASE_URL'i kullanır.

Kullanım:
  pip install psycopg2-binary python-dotenv
  python import_cases.py --input cases_ready.jsonl

  # Sadece test et, DB'ye yazma:
  python import_cases.py --input cases_ready.jsonl --dry-run

  # Belirli uzmanlık alanını yükle:
  python import_cases.py --input cases_ready.jsonl --specialty cardiology
"""

import json
import argparse
import os
import sys
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import Json
except ImportError:
    print("HATA: psycopg2 kurulu değil.")
    print("Çalıştır: pip install psycopg2-binary")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # .env manuel okunacak


def get_db_url() -> str:
    """DATABASE_URL'i .env veya environment'tan alır."""
    url = os.getenv("DATABASE_URL")
    if url:
        return url

    # .env dosyasını manuel oku
    env_file = Path(".env")
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip()

    print("HATA: DATABASE_URL bulunamadı.")
    print("Proje kök klasöründe .env dosyası olmalı.")
    sys.exit(1)


def connect(db_url: str):
    """PostgreSQL bağlantısı kurar."""
    try:
        conn = psycopg2.connect(db_url)
        return conn
    except Exception as e:
        print(f"HATA: Veritabanına bağlanılamadı: {e}")
        sys.exit(1)


CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS cases (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(500) NOT NULL,
    specialty       VARCHAR(100) NOT NULL DEFAULT 'general',
    difficulty      VARCHAR(20)  NOT NULL DEFAULT 'medium',
    patient_json    JSONB        NOT NULL DEFAULT '{}',
    hidden_diagnosis TEXT        NOT NULL DEFAULT '',
    scoring_rubric  JSONB        NOT NULL DEFAULT '{}',
    educational_notes JSONB      NOT NULL DEFAULT '{}',
    full_question   TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cases_specialty   ON cases(specialty);
CREATE INDEX IF NOT EXISTS idx_cases_difficulty  ON cases(difficulty);
CREATE INDEX IF NOT EXISTS idx_cases_is_active   ON cases(is_active);
"""

INSERT_SQL = """
INSERT INTO cases
    (id, title, specialty, difficulty, patient_json, hidden_diagnosis,
     scoring_rubric, educational_notes, full_question, is_active)
VALUES
    (%(id)s, %(title)s, %(specialty)s, %(difficulty)s, %(patient_json)s, %(hidden_diagnosis)s,
     %(scoring_rubric)s, %(educational_notes)s, %(full_question)s, %(is_active)s)
ON CONFLICT DO NOTHING;
"""


def import_cases(input_file: str, db_url: str, specialty_filter: str = None,
                 dry_run: bool = False, batch_size: int = 100):

    # Dosyayı oku
    cases = []
    with open(input_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                case = json.loads(line)
                # Filtre uygula
                if specialty_filter and case.get("specialty") != specialty_filter:
                    continue
                cases.append(case)
            except Exception as e:
                print(f"  [UYARI] Satır atlandı: {e}")

    print(f"Yüklenecek: {len(cases)} vaka")

    if dry_run:
        print("\n[DRY RUN] Veritabanına yazılmadı.")
        print("Örnek vaka:")
        print(json.dumps(cases[0], ensure_ascii=False, indent=2)[:500])
        return

    # Bağlan
    conn = connect(db_url)
    cur = conn.cursor()

    # Tabloyu oluştur (yoksa)
    cur.execute(CREATE_TABLE_SQL)
    conn.commit()
    print("Tablo hazır.")

    # Batch insert
    inserted = 0
    errors = 0

    for i in range(0, len(cases), batch_size):
        batch = cases[i:i + batch_size]
        try:
            for case in batch:
                import uuid
                cur.execute(INSERT_SQL, {
                    "id":                 str(uuid.uuid4()),
                    "title":              case.get("title", ""),
                    "specialty":          case.get("specialty", "general"),
                    "difficulty":         case.get("difficulty", "medium"),
                    "patient_json":       Json(case.get("patient_json", {})),
                    "hidden_diagnosis":   case.get("hidden_diagnosis", ""),
                    "scoring_rubric":     Json(case.get("scoring_rubric", {})),
                    "educational_notes":  json.dumps(case.get("educational_notes", {})),
                    "full_question":      case.get("full_question", ""),
                    "is_active":          case.get("is_active", True),
                })
            conn.commit()
            inserted += len(batch)
            print(f"  {inserted}/{len(cases)} yüklendi...", end="\r")
        except Exception as e:
            conn.rollback()
            errors += len(batch)
            print(f"\n  [HATA] Batch {i}-{i+batch_size}: {e}")

    cur.close()
    conn.close()

    print(f"\nTamamlandı!")
    print(f"  Yüklenen: {inserted} vaka")
    print(f"  Hatalı:   {errors} vaka")

    # Kontrol sorgusu
    conn2 = connect(db_url)
    cur2 = conn2.cursor()
    cur2.execute("SELECT specialty, COUNT(*) FROM cases GROUP BY specialty ORDER BY COUNT(*) DESC;")
    rows = cur2.fetchall()
    cur2.close()
    conn2.close()

    print("\nVeritabanındaki dağılım:")
    for specialty, count in rows:
        print(f"  {specialty:25s} → {count} vaka")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",     default="cases_ready.jsonl")
    parser.add_argument("--specialty", default=None,
                        help="Sadece bu uzmanlık alanını yükle (ör: cardiology)")
    parser.add_argument("--dry-run",   action="store_true",
                        help="Test modu — DB'ye yazma")
    parser.add_argument("--batch",     type=int, default=100,
                        help="Batch boyutu (varsayılan: 100)")
    args = parser.parse_args()

    if not Path(args.input).exists():
        print(f"HATA: {args.input} bulunamadı.")
        print("Önce convert_medqa.py çalıştır.")
        sys.exit(1)

    db_url = get_db_url()
    print(f"Veritabanı: {db_url.split('@')[-1]}")  # şifre gizle

    import_cases(
        input_file=args.input,
        db_url=db_url,
        specialty_filter=args.specialty,
        dry_run=args.dry_run,
        batch_size=args.batch
    )


if __name__ == "__main__":
    main()
