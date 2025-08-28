from datetime import datetime
from math import floor
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session, select
from sqlalchemy import func
from zoneinfo import ZoneInfo

from ..models import WorkSession
from ..database import get_session
from ..deps import admin_guard
from ..schemas.timer_schema import SessionStart, SessionUpdate


router = APIRouter(prefix="/timer", tags=["sessions"])

KST = ZoneInfo("Asia/Seoul")

def now_kst_native() -> datetime:
    # 현재 KST 시각을 timezone-aware로 만든 뒤 tz 정보를 제거(naive)해서 반환.
    # DB에는 'KST 기준 naive datetime'으로 저장/조회합니다.
    return datetime.now(KST).replace(tzinfo=None)

def month_bounds_kst(
    year: Optional[int],
    month: Optional[int],
) -> tuple[datetime, datetime]:
    # KST 달력 기준으로 [해당 달 1일 00:00, 다음 달 1일 00:00) 범위를 naive datetime으로 반환.
    # year/month가 None이면 현재 KST 기준으로 보정.
    now_local = datetime.now(KST)
    y = year or now_local.year
    m = month or now_local.month
    next_y, next_m = (y + 1, 1) if m == 12 else (y, m + 1)
    start = datetime(y, m, 1, 0, 0, 0)      # KST naive
    end   = datetime(next_y, next_m, 1, 0, 0, 0)  # KST naive
    return start, end

@router.post("/start", response_model=WorkSession)
def start_session(
    payload: SessionStart,  # JSON 바디: { "memo": "..." }
    session: Session = Depends(get_session),
):
    active = session.exec(
        select(WorkSession).where(WorkSession.ended_at.is_(None))
    ).first()
    if active:
        raise HTTPException(400, "이미 진행 중인 타이머가 있습니다.")

    ws = WorkSession(started_at=now_kst_native(), memo=payload.memo)
    session.add(ws)
    session.commit()
    session.refresh(ws)
    return ws


@router.post("/stop", response_model=WorkSession)
def stop_session(session: Session = Depends(get_session)):
    ws = session.exec(
        select(WorkSession).where(WorkSession.ended_at.is_(None))
    ).first()
    if not ws:
        raise HTTPException(400, "진행 중인 타이머가 없습니다.")

    ws.ended_at = now_kst_native()
    ws.minutes = floor((ws.ended_at - ws.started_at).total_seconds() / 60)
    session.add(ws)
    session.commit()
    session.refresh(ws)
    return ws


@router.get("", response_model=List[WorkSession])
def list_sessions(
    year: Optional[int] = Query(None, ge=1),
    month: Optional[int] = Query(None, ge=1, le=12),
    session: Session = Depends(get_session),
):
    # year/month 미지정 시 → 현재 KST 기준으로 보정
    if year is None or month is None:
        now_local = datetime.now(KST)
        if year is None:
            year = now_local.year
        if month is None:
            month = now_local.month

    # KST 달력 기준 범위 계산
    start, end = month_bounds_kst(year, month)

    stmt = (
        select(WorkSession)
        .where(WorkSession.started_at >= start, WorkSession.started_at < end)
        .order_by(WorkSession.started_at.desc())
    )
    return session.exec(stmt).all()


@router.get("/summary")
def monthly_summary(
    year: int,
    month: int,
    session: Session = Depends(get_session),
):
    start, end = month_bounds_kst(year, month)

    total_minutes = session.exec(
        select(func.coalesce(func.sum(WorkSession.minutes), 0)).where(
            WorkSession.started_at >= start,
            WorkSession.started_at < end,
        )
    ).scalar_one()  # ← 정수로 바로

    return {"year": year, "month": month, "total_minutes": total_minutes}


# 잘못 측정한 시간 수정(관리자) — JSON 바디 사용
@router.put("/{sid}", response_model=WorkSession, dependencies=[Depends(admin_guard)])
def update_session(
    sid: int,
    body: SessionUpdate,  # JSON 바디: { started_at, ended_at, memo }
    session: Session = Depends(get_session),
):
    if body.ended_at <= body.started_at:
        raise HTTPException(400, "종료가 시작보다 빠를 수 없습니다.")

    ws = session.get(WorkSession, sid)
    if not ws:
        raise HTTPException(404, "없음")

    ws.started_at = body.started_at
    ws.ended_at = body.ended_at
    ws.memo = body.memo
    ws.minutes = floor((body.ended_at - body.started_at).total_seconds() / 60)

    session.add(ws)
    session.commit()
    session.refresh(ws)
    return ws


@router.delete("/{sid}", dependencies=[Depends(admin_guard)])
def delete_session(sid: int, session: Session = Depends(get_session)):
    ws = session.get(WorkSession, sid)
    if not ws:
        raise HTTPException(404, "없음")
    session.delete(ws)
    session.commit()
    return {"ok": True}
