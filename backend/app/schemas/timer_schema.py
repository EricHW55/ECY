# table=False => DB 테이블 아님, I/O DTO용
from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel

class SessionStart(SQLModel, table=False):
    memo: Optional[str] = None

class SessionUpdate(SQLModel, table=False):
    started_at: datetime
    ended_at: datetime
    memo: Optional[str] = None
