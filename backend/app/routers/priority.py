import csv
from io import StringIO
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from starlette.responses import StreamingResponse
from sqlmodel import Session, select
from ..models import PriorityItem
from ..database import get_session
from ..deps import admin_guard

router = APIRouter(prefix="/priority", tags=["priority"])

@router.get("", response_model=List[PriorityItem])
def list_items(session: Session = Depends(get_session)):
    return session.exec(select(PriorityItem).order_by(PriorityItem.score.desc())).all()

@router.post("", response_model=PriorityItem, dependencies=[Depends(admin_guard)])
def add_item(item: PriorityItem, session: Session = Depends(get_session)):
    item.id = None
    session.add(item); session.commit(); session.refresh(item)
    return item

@router.put("/{pid}", response_model=PriorityItem, dependencies=[Depends(admin_guard)])
def update_item(pid: int, item: PriorityItem, session: Session = Depends(get_session)):
    db = session.get(PriorityItem, pid)
    if not db: raise HTTPException(404, "없음")
    for k, v in item.model_dump(exclude={"id"}).items():
        setattr(db, k, v)
    session.add(db); session.commit(); session.refresh(db)
    return db

@router.delete("/{pid}", dependencies=[Depends(admin_guard)])
def delete_item(pid: int, session: Session = Depends(get_session)):
    db = session.get(PriorityItem, pid)
    if not db: raise HTTPException(404, "없음")
    session.delete(db); session.commit()
    return {"ok": True}

# CSV import/export
@router.post("/import-csv", dependencies=[Depends(admin_guard)])
async def import_csv(file: UploadFile = File(...), session: Session = Depends(get_session)):
    text = (await file.read()).decode("utf-8")
    reader = csv.DictReader(StringIO(text))
    for row in reader:
        item = PriorityItem(
            title=row.get("title","").strip(),
            score=float(row.get("score") or 0),
            due=datetime.fromisoformat(row["due"]) if row.get("due") else None,
            tag=(row.get("tag") or None),
        )
        session.add(item)
    session.commit()
    return {"ok": True}

@router.get("/export.csv", dependencies=[Depends(admin_guard)])
def export_csv(session: Session = Depends(get_session)):
    def gen():
        yield "id,title,score,due,tag\n"
        for it in session.exec(select(PriorityItem)).all():
            due = it.due.isoformat() if it.due else ""
            title = it.title.replace('"', '""')
            yield f'{it.id},"{title}",{it.score},{due},{it.tag or ""}\n'
    return StreamingResponse(gen(), media_type="text/csv",
        headers={"Content-Disposition":"attachment; filename=priority.csv"})
