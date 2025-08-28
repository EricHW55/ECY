from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel

class PriorityCreate(SQLModel, table=False):
    title: str
    score: float = 0
    due: Optional[datetime] = None
    tag: Optional[str] = None

class PriorityUpdate(SQLModel, table=False):
    title: Optional[str] = None
    score: Optional[float] = None
    due: Optional[datetime] = None
    tag: Optional[str] = None
