# app/routers/priority.py
from __future__ import annotations

import csv
import json
from io import StringIO
from typing import List, Optional, Dict
from datetime import datetime, timedelta, date
import zoneinfo

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from pydantic import BaseModel, Field as PydField
from starlette.responses import StreamingResponse
from sqlmodel import Session, select

from ..models import PriorityItem
from ..database import get_session
from ..deps import admin_guard

router = APIRouter(prefix="/priority", tags=["priority"])


# ----- 시간 유틸 (KST) -----
KST = zoneinfo.ZoneInfo("Asia/Seoul")

def week_start_kst(dt: datetime) -> datetime:
    """월요일 00:00 (KST)"""
    d = dt.astimezone(KST)
    monday = d - timedelta(days=d.weekday())
    return datetime(monday.year, monday.month, monday.day, tzinfo=KST)

def due_at_this_week(item: PriorityItem, now: datetime) -> datetime:
    ws = week_start_kst(now)
    base = ws + timedelta(days=item.due_weekday)
    return base.replace(hour=item.due_hour, minute=item.due_minute, second=0, microsecond=0)

def effective_due_at(item: PriorityItem, now: datetime) -> datetime:
    """
    이번 주가 완료되었으면 다음 주로 표시.
    """
    ws = week_start_kst(now)
    this_due = due_at_this_week(item, now)
    if item.completed_week_start == ws.date():
        return this_due + timedelta(days=7)
    return this_due

def status_of(item: PriorityItem, now: datetime) -> str:
    """
    next_week: 이번 주 완료되어 다음 주 일정으로 보이는 상태
    upcoming : 아직 마감 전(=미래/현재)
    overdue  : 마감 시각이 지남(=과거)
    """
    ws = week_start_kst(now)
    eff = effective_due_at(item, now)
    if item.completed_week_start == ws.date():
        return "next_week" if eff >= now else "overdue"
    return "upcoming" if eff >= now else "overdue"

# ----- 출력 스키마 -----
class ItemOut(BaseModel):
    id: int
    book: str
    due_weekday: int
    due_hour: int
    due_minute: int
    flags: Dict[str, bool]
    links: List[str]
    memo: Optional[str]
    completed_week_start: Optional[date]

    effective_due_at: datetime
    status: str
    minutes_until_due: int

def to_out(item: PriorityItem, now: datetime) -> ItemOut:
    eff_aware = effective_due_at(item, now)       # tz-aware
    delta_min = int((eff_aware - now).total_seconds() // 60)
    eff_naive = eff_aware.replace(tzinfo=None)    # 응답은 naive로

    return ItemOut(
        id=item.id,
        book=item.book,
        due_weekday=item.due_weekday,
        due_hour=item.due_hour,
        due_minute=item.due_minute,
        flags=item.flags or {},
        links=item.links or [],
        memo=item.memo,
        completed_week_start=item.completed_week_start,
        effective_due_at=eff_naive,
        status=status_of(item, now),
        minutes_until_due=delta_min
    )

# ----- 생성/수정 입력 스키마 -----
class ItemCreate(BaseModel):
    book: str
    due_weekday: int = PydField(ge=0, le=6)
    due_hour: int = PydField(ge=0, le=23)
    due_minute: int = PydField(ge=0, le=59)
    flags: Dict[str, bool] = PydField(default_factory=dict)
    links: List[str] = PydField(default_factory=list)
    memo: Optional[str] = None

class ItemUpdate(BaseModel):
    book: Optional[str] = None
    due_weekday: Optional[int] = PydField(default=None, ge=0, le=6)
    due_hour: Optional[int] = PydField(default=None, ge=0, le=23)
    due_minute: Optional[int] = PydField(default=None, ge=0, le=59)
    flags: Optional[Dict[str, bool]] = None
    links: Optional[List[str]] = None
    memo: Optional[str] = None
    completed_week_start: Optional[date] = None

# =========================
#          라우트
# =========================

# 리스트(정렬: 미래/현재 → 과거[오버듀])
@router.get("", response_model=List[ItemOut])
def list_items(
    q: Optional[str] = Query(None, description="책 이름 검색"),
    session: Session = Depends(get_session),
):
    stmt = select(PriorityItem)
    if q:
        stmt = stmt.where(PriorityItem.book.contains(q))
    items = session.exec(stmt).all()

    now = datetime.now(KST)              # aware (KST)
    now_naive = now.replace(tzinfo=None) # ★ 정렬은 naive 기준으로

    outs = [to_out(i, now) for i in items]
    # 현재 시각 기준: 미래/현재 먼저, 과거(오버듀) 아래
    outs.sort(key=lambda o: (0 if o.effective_due_at >= now_naive else 1, o.effective_due_at))
    return outs

# 생성 (관리자)
@router.post("", response_model=ItemOut, dependencies=[Depends(admin_guard)])
def add_item(payload: ItemCreate, session: Session = Depends(get_session)):
    item = PriorityItem(**payload.model_dump())
    session.add(item)
    session.commit()
    session.refresh(item)
    return to_out(item, datetime.now(KST))

# 수정 (관리자)
@router.put("/{pid}", response_model=ItemOut, dependencies=[Depends(admin_guard)])
def update_item(pid: int, payload: ItemUpdate, session: Session = Depends(get_session)):
    db = session.get(PriorityItem, pid)
    if not db:
        raise HTTPException(404, "없음")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(db, k, v)

    session.add(db)
    session.commit()
    session.refresh(db)
    return to_out(db, datetime.now(KST))

# 삭제 (관리자, 하드 삭제)
@router.delete("/{pid}", dependencies=[Depends(admin_guard)])
def delete_item(pid: int, session: Session = Depends(get_session)):
    db = session.get(PriorityItem, pid)
    if not db:
        raise HTTPException(404, "없음")
    session.delete(db)
    session.commit()
    return {"ok": True}

# 완료(이번 주), 일반 사용자도 가능하게 열어둠
@router.post("/{pid}/complete", response_model=ItemOut)
def complete_item(pid: int, session: Session = Depends(get_session)):
    now = datetime.now(KST)
    ws = week_start_kst(now).date()
    db = session.get(PriorityItem, pid)
    if not db:
        raise HTTPException(404, "없음")
    db.completed_week_start = ws
    session.add(db); session.commit(); session.refresh(db)
    return to_out(db, now)

# 완료 취소
@router.post("/{pid}/uncomplete", response_model=ItemOut)
def uncomplete_item(pid: int, session: Session = Depends(get_session)):
    db = session.get(PriorityItem, pid)
    if not db:
        raise HTTPException(404, "없음")
    db.completed_week_start = None
    session.add(db); session.commit(); session.refresh(db)
    return to_out(db, datetime.now(KST))

@router.get("/{pid}", response_model=ItemOut)
def get_item(pid: int, session: Session = Depends(get_session)):
    db = session.get(PriorityItem, pid)
    if not db:
        raise HTTPException(404, "없음")
    return to_out(db, datetime.now(KST))


# =========================
#     CSV Import / Export
# =========================

def _parse_int(v: Optional[str], default: int = 0, lo: int = None, hi: int = None) -> int:
    try:
        x = int(v) if v is not None and v != "" else default
        if lo is not None and x < lo: x = lo
        if hi is not None and x > hi: x = hi
        return x
    except Exception:
        return default

def _parse_date(v: Optional[str]) -> Optional[date]:
    if not v:
        return None
    try:
        return date.fromisoformat(v)
    except Exception:
        return None

def _parse_flags(v: Optional[str]) -> Dict[str, bool]:
    """
    flags 파싱:
    - JSON 문자열: {"answer": true, "listening": false}
    - 세미콜론 구분: "answer=true;listening=false"
    - 콤마 구분: "answer=true,listening=false"
    """
    if not v:
        return {}
    s = v.strip()
    # JSON 시도
    try:
        obj = json.loads(s)
        if isinstance(obj, dict):
            return {str(k): bool(obj[k]) for k in obj.keys()}
    except Exception:
        pass
    # 세미콜론/콤마 파싱
    out: Dict[str, bool] = {}
    for token in [t.strip() for t in s.replace(";", ",").split(",") if t.strip()]:
        if "=" in token:
            k, vv = token.split("=", 1)
            out[k.strip()] = vv.strip().lower() in ("1", "true", "t", "y", "yes")
        else:
            out[token] = True
    return out

def _parse_links(v: Optional[str]) -> List[str]:
    """
    links 파싱:
    - JSON 배열 문자열: ["https://...","https://..."]
    - 콤마 구분: "https://a,https://b"
    """
    if not v:
        return []
    s = v.strip()
    try:
        arr = json.loads(s)
        if isinstance(arr, list):
            return [str(x) for x in arr]
    except Exception:
        pass
    return [t.strip() for t in s.split(",") if t.strip()]

# CSV Import (관리자)
@router.post("/import-csv", dependencies=[Depends(admin_guard)])
async def import_csv(file: UploadFile = File(...), session: Session = Depends(get_session)):
    """
    허용 컬럼:
    - book (필수)
    - due_weekday, due_hour, due_minute
    - flags  (JSON 문자열만 허용)  예) {"answer": true, "listening": false}
    - links  (JSON 배열만 허용)    예) ["https://a","https://b"]
    - memo
    - completed_week_start (YYYY-MM-DD)
    """
    text = (await file.read()).decode("utf-8-sig")  # BOM 안전하게
    reader = csv.DictReader(StringIO(text))
    count = 0

    for row in reader:
        norm = { (k or "").strip().lower(): (v or "").strip() for k, v in row.items() }
        book = norm.get("book") or norm.get("title")
        if not book:
            continue

        def _json_or(default, s):
            try:
                return json.loads(s) if s else default
            except Exception:
                return default

        def _date_or_none(s):
            try:
                return date.fromisoformat(s) if s else None
            except Exception:
                return None

        item = PriorityItem(
            book=book,
            due_weekday=int(norm.get("due_weekday") or norm.get("weekday") or 0),
            due_hour=int(norm.get("due_hour") or norm.get("hour") or 0),
            due_minute=int(norm.get("due_minute") or norm.get("minute") or 0),
            flags=_json_or({}, norm.get("flags")),
            links=_json_or([], norm.get("links")),
            memo=norm.get("memo") or None,
            completed_week_start=_date_or_none(norm.get("completed_week_start")),
        )
        session.add(item); count += 1

    session.commit()
    return {"ok": True, "imported": count}


# CSV Export (관리자)
@router.get("/export.csv", dependencies=[Depends(admin_guard)])
def export_csv(session: Session = Depends(get_session)):
    """
    헤더:
    id,book,due_weekday,due_hour,due_minute,flags,links,memo,completed_week_start,effective_due_at,status
    flags/links는 JSON 문자열로 내보냄.
    """
    now = datetime.now(KST)

    def generate():
        sio = StringIO()
        writer = csv.writer(sio)
        writer.writerow([
            "id","book","due_weekday","due_hour","due_minute",
            "flags","links","memo","completed_week_start",
            "effective_due_at","status"
        ])
        yield sio.getvalue(); sio.seek(0); sio.truncate(0)

        items = session.exec(select(PriorityItem)).all()
        for it in items:
            out = to_out(it, now)
            writer.writerow([
                out.id,
                out.book,
                out.due_weekday,
                out.due_hour,
                out.due_minute,
                json.dumps(out.flags, ensure_ascii=False),
                json.dumps(out.links, ensure_ascii=False),
                (out.memo or ""),
                out.completed_week_start.isoformat() if out.completed_week_start else "",
                out.effective_due_at.isoformat(),
                out.status,
            ])
            yield sio.getvalue(); sio.seek(0); sio.truncate(0)

    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=priority.csv"}
    )
