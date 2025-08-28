from typing import Optional
from sqlmodel import SQLModel

class LinkCreate(SQLModel, table=False):
    title: str
    url: str
    category: Optional[str] = None

class LinkUpdate(SQLModel, table=False):
    title: Optional[str] = None
    url: Optional[str] = None
    category: Optional[str] = None
