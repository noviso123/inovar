from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from database import get_db
from models import Agenda, User, Solicitacao
from pydantic import BaseModel

router = APIRouter()

class AgendaCreate(BaseModel):
    user_id: str
    solicitacao_id: str
    title: str
    scheduled_at: datetime
    duration: int = 60
    notes: Optional[str] = None

@router.get("/")
def list_agenda(
    user_id: Optional[str] = None,
    company_id: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Agenda)

    if user_id:
        query = query.filter(Agenda.user_id == user_id)
    elif company_id:
        query = query.join(User).filter(User.company_id == company_id)

    if start:
        query = query.filter(Agenda.scheduled_at >= start)
    if end:
        query = query.filter(Agenda.scheduled_at <= end)

    return {"data": query.order_by(Agenda.scheduled_at.asc()).all()}

@router.post("/")
def create_agenda(req: AgendaCreate, db: Session = Depends(get_db)):
    entry = Agenda(
        id=str(uuid.uuid4()),
        user_id=req.user_id,
        solicitacao_id=req.solicitacao_id,
        title=req.title,
        scheduled_at=req.scheduled_at,
        duration=req.duration,
        notes=req.notes
    )
    db.add(entry)

    # Update solicitacao
    sol = db.query(Solicitacao).filter(Solicitacao.id == req.solicitacao_id).first()
    if sol:
        sol.status = "AGENDADA"
        sol.scheduled_at = req.scheduled_at

    db.commit()
    db.refresh(entry)
    return {"data": entry}

@router.put("/{id}")
def update_agenda(id: str, req: dict, db: Session = Depends(get_db)):
    entry = db.query(Agenda).filter(Agenda.id == id).first()
    if not entry:
        raise HTTPException(404, "Not found")

    for field, value in req.items():
        if hasattr(entry, field):
            if field == "scheduled_at" and value:
                if isinstance(value, str):
                    value = datetime.fromisoformat(value.replace("Z", "+00:00"))
                # Update sol too
                sol = db.query(Solicitacao).filter(Solicitacao.id == entry.solicitacao_id).first()
                if sol:
                    sol.scheduled_at = value
            setattr(entry, field, value)

    db.commit()
    db.refresh(entry)
    return {"data": entry}

@router.delete("/{id}")
def delete_agenda(id: str, db: Session = Depends(get_db)):
    entry = db.query(Agenda).filter(Agenda.id == id).first()
    if not entry:
        raise HTTPException(404, "Not found")

    # Clear sol
    sol = db.query(Solicitacao).filter(Solicitacao.id == entry.solicitacao_id).first()
    if sol:
        sol.scheduled_at = None

    db.delete(entry)
    db.commit()
    return {"message": "Deleted"}
