from typing import Optional, List, Dict
from datetime import datetime, date
from sqlmodel import SQLModel, Field, Column, JSON

# 근무 세션(타이머)
class WorkSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    started_at: datetime = Field(index=True)            # ← 인덱스
    ended_at: Optional[datetime] = Field(default=None, index=True)  # ← 선택
    minutes: Optional[int] = None
    memo: Optional[str] = None

# 채점 우선순위 항목
class PriorityItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    # 필수
    book: str = Field(index=True)
    due_weekday: int = Field(ge=0, le=6, index=True)  # 월=0 ~ 일=6
    due_hour: int = Field(ge=0, le=23)
    due_minute: int = Field(ge=0, le=59)

    # 선택(가벼운 확장)
    flags: Dict[str, bool] = Field(default_factory=dict, sa_column=Column(JSON))  # 예: {"answer": true, "listening": false}
    links: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    memo: Optional[str] = None

    # 완료 상태(주당 1회 완료 판정용) — 대안 A: 주 시작일 보관
    completed_week_start: Optional[date] = Field(default=None, index=True)

# 링크 모음
class ResourceLink(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    url: str
    category: Optional[str] = None
