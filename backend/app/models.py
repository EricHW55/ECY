from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field

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
    title: str
    score: float = 0
    due: Optional[datetime] = None
    tag: Optional[str] = None

# 링크 모음
class ResourceLink(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    url: str
    category: Optional[str] = None
