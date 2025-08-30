# txt_to_neon.py
# 사용 예:
#   python txt_to_neon.py --input data.txt --assume-pm --batch 1000 --create-tables
#   python txt_to_neon.py --input data.txt --dry-run

from __future__ import annotations
import argparse, re
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterator, Optional, Any, List, Dict
import sys

# ---- 프로젝트 임포트 경로 보정 (레포 루트 기준) ----
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlmodel import SQLModel, Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import text

# 백엔드 설정/모델/엔진 재사용
from backend.app.settings import settings
from backend.app.models import WorkSession
from backend.app.database import engine as dest_engine  # Neon 엔진

# ──────────────────────────────────────────────────────────────────────────────
# 1) .txt 포맷 파싱
#    예) "[v] 3/7 2:31 ~ 4:36"
# ──────────────────────────────────────────────────────────────────────────────
ROW_RE = re.compile(
    r"""
    ^\s*
    (?:\[[^\]]*\]\s*)?         # [v] 같은 태그는 무시
    (?P<month>\d{1,2})/
    (?P<day>\d{1,2})
    \s+
    (?P<sh>\d{1,2}):(?P<sm>\d{2})
    \s*~\s*
    (?P<eh>\d{1,2}):(?P<em>\d{2})
    \s*$
    """,
    re.VERBOSE,
)

# 월별 연도 매핑(네가 쓰던 로직을 그대로)
YEAR_BY_MONTH = {1: 2025, 2: 2025, 3: 2025, 4: 2025, 5: 2025, 6: 2025, 7: 2025, 8: 2025,
                 9: 2024, 10: 2024, 11: 2024, 12: 2024}

@dataclass
class Row:
    month: int
    day: int
    sh: int
    sm: int
    eh: int
    em: int

def parse_txt_lines(path: str) -> Iterator[Row]:
    p = Path(path)
    with p.open("r", encoding="utf-8") as f:
        for ln in f:
            s = ln.strip()
            if not s or s.startswith("#"):
                continue
            m = ROW_RE.match(s)
            if not m:
                # 포맷 안 맞는 줄은 스킵(필요하면 raise)
                continue
            gd = m.groupdict()
            yield Row(
                month=int(gd["month"]),
                day=int(gd["day"]),
                sh=int(gd["sh"]),
                sm=int(gd["sm"]),
                eh=int(gd["eh"]),
                em=int(gd["em"]),
            )

def to_iso_kst(year: int, month: int, day: int, hour: int, minute: int,
               assume_pm: bool, tz_offset="+09:00") -> str:
    """로컬 텍스트 시간을 ISO8601(+09:00)로 변환.
       assume_pm=True면 1~11시는 12시간을 더해 오후로 간주."""
    h = hour
    if assume_pm and 1 <= h <= 11:
        h += 12
    # 초는 0으로
    return f"{year:04d}-{month:02d}-{day:02d}T{h:02d}:{minute:02d}:00{tz_offset}"

def minutes_between(start_iso: str, end_iso: str) -> int:
    """시작/종료 ISO 문자열로 분 계산. (종료가 시작보다 앞이면 +24h 처리)"""
    st = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
    en = datetime.fromisoformat(end_iso.replace("Z", "+00:00"))
    if en < st:
        en = en + timedelta(days=1)
    return max(0, int((en - st).total_seconds() // 60))

# ──────────────────────────────────────────────────────────────────────────────
# 2) DB 쓰기(UPSERT + INSERT + 시퀀스 보정)
# ──────────────────────────────────────────────────────────────────────────────
def upsert_without_id(session: Session, payloads: List[Dict[str, Any]]):
    """id 미지정 → 일반 INSERT (자동증가)"""
    if not payloads:
        return
    t = WorkSession.__table__
    session.execute(t.insert().values(payloads))

def fix_pg_sequence(session: Session):
    session.exec(text(
        "SELECT setval(pg_get_serial_sequence('worksession','id'), "
        "COALESCE((SELECT MAX(id) FROM worksession), 1))"
    ))

# ──────────────────────────────────────────────────────────────────────────────
# 3) main
# ──────────────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="Import .txt (e.g. '[v] 3/7 2:31 ~ 4:36') into Neon(Postgres)")
    ap.add_argument("--input", required=True, help="텍스트 파일 경로")
    ap.add_argument("--batch", type=int, default=1000, help="배치 크기")
    ap.add_argument("--create-tables", action="store_true",
                    help="목표 DB에 테이블 생성(SQLModel metadata). 운영은 Alembic 권장")
    ap.add_argument("--assume-pm", action="store_true",
                    help="1~11시를 오후로 간주(예: 3:29 → 15:29)")
    ap.add_argument("--tz", default="+09:00", help="타임존 오프셋(기본 +09:00)")
    ap.add_argument("--dry-run", action="store_true", help="쓰기 없이 파싱/건수만 확인")
    args = ap.parse_args()

    print(f"[i] DEST (Neon) URL = {settings.DATABASE_URL}")

    if args.create_tables:
        print("[i] creating tables on destination (if not exists)…")
        SQLModel.metadata.create_all(dest_engine)

    rows = list(parse_txt_lines(args.input))
    print(f"[i] parsed rows: {len(rows)}")
    if args.dry_run:
        for r in rows[:5]:
            y = YEAR_BY_MONTH.get(r.month)
            st = to_iso_kst(y, r.month, r.day, r.sh, r.sm, args.assume_pm, args.tz)
            en = to_iso_kst(y, r.month, r.day, r.eh, r.em, args.assume_pm, args.tz)
            mins = minutes_between(st, en)
            print("  ", y, r.month, r.day, "=>", st, "~", en, f"({mins}분)")
        print("[i] dry-run: no write will occur.")
        return

    # 실제 업로드
    moved = 0
    with Session(dest_engine) as dst:
        batch_payload: List[Dict[str, Any]] = []

        for r in rows:
            year = YEAR_BY_MONTH.get(r.month)
            if not year:
                # 필요하면 기본연도 로직 추가
                raise ValueError(f"연도 매핑 없음: month={r.month}")

            st_iso = to_iso_kst(year, r.month, r.day, r.sh, r.sm, args.assume_pm, args.tz)
            en_iso = to_iso_kst(year, r.month, r.day, r.eh, r.em, args.assume_pm, args.tz)
            mins = minutes_between(st_iso, en_iso)

            batch_payload.append({
                # id는 지정하지 않음(자동증가)
                "started_at": st_iso,
                "ended_at": en_iso,
                "minutes": mins,
                "memo": None,
            })

            if len(batch_payload) >= args.batch:
                upsert_without_id(dst, batch_payload)
                moved += len(batch_payload)
                print(f"  - moved {moved}/{len(rows)}")
                batch_payload.clear()

        if batch_payload:
            upsert_without_id(dst, batch_payload)
            moved += len(batch_payload)
            print(f"  - moved {moved}/{len(rows)}")

        # 시퀀스 보정(혹시 수동 id를 넣는 경우 대비. 지금은 거의 noop)
        fix_pg_sequence(dst)
        dst.commit()

    print("[✔] done.")

if __name__ == "__main__":
    main()
