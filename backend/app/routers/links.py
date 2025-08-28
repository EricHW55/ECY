from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from ..models import ResourceLink
from ..database import get_session
from ..deps import admin_guard

router = APIRouter(prefix="/links", tags=["links"])

@router.get("", response_model=List[ResourceLink])
def list_links(session: Session = Depends(get_session)):
    return session.exec(select(ResourceLink)).all()

@router.post("", response_model=ResourceLink, dependencies=[Depends(admin_guard)])
def add_link(link: ResourceLink, session: Session = Depends(get_session)):
    link.id = None
    session.add(link); session.commit(); session.refresh(link)
    return link

@router.put("/{lid}", response_model=ResourceLink, dependencies=[Depends(admin_guard)])
def update_link(lid: int, link: ResourceLink, session: Session = Depends(get_session)):
    db = session.get(ResourceLink, lid)
    if not db: raise HTTPException(404, "없음")
    for k, v in link.model_dump(exclude={"id"}).items():
        setattr(db, k, v)
    session.add(db); session.commit(); session.refresh(db)
    return db

@router.delete("/{lid}", dependencies=[Depends(admin_guard)])
def delete_link(lid: int, session: Session = Depends(get_session)):
    db = session.get(ResourceLink, lid)
    if not db: raise HTTPException(404, "없음")
    session.delete(db); session.commit()
    return {"ok": True}
