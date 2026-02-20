from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import datetime

from database import get_db
from models import Checklist, Solicitacao
from pydantic import BaseModel

router = APIRouter(prefix="/db/checklists", tags=["checklists"])

class ChecklistCreate(BaseModel):
    solicitacao_id: str
    equipamento_id: Optional[str] = None
    description: str

class ChecklistUpdate(BaseModel):
    description: Optional[str] = None
    done: Optional[bool] = None

@router.get("/by-request/{request_id}")
def list_checklists(request_id: str, db: Session = Depends(get_db)):
    items = db.query(Checklist).filter(Checklist.solicitacao_id == request_id).all()
    return {"data": items}

@router.post("/")
def create_checklist(req: ChecklistCreate, db: Session = Depends(get_db)):
    item = Checklist(
        id=str(uuid.uuid4()),
        solicitacao_id=req.solicitacao_id,
        equipamento_id=req.equipamento_id,
        description=req.description,
        done=False,
        created_at=datetime.datetime.utcnow()
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"data": item}

@router.put("/{item_id}")
def update_checklist(item_id: str, req: ChecklistUpdate, db: Session = Depends(get_db)):
    item = db.query(Checklist).filter(Checklist.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")

    if req.description is not None:
        item.description = req.description
    if req.done is not None:
        item.done = req.done

    db.commit()
    db.refresh(item)
    return {"data": item}

@router.delete("/{item_id}")
def delete_checklist(item_id: str, db: Session = Depends(get_db)):
    item = db.query(Checklist).filter(Checklist.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
    return {"success": True}
