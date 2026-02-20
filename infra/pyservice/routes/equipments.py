"""Equipments CRUD routes — called by Go via HTTP"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import uuid

from database import get_db
from models import Equipamento

router = APIRouter()

class EquipCreate(BaseModel):
    client_id: str
    company_id: str = ""
    brand: str
    model: str
    btu: int
    serial_number: str = ""
    location: str
    preventive_interval: int = 0

class EquipUpdate(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    btu: Optional[int] = None
    serial_number: Optional[str] = None
    location: Optional[str] = None
    preventive_interval: Optional[int] = None

def equip_to_dict(e: Equipamento) -> dict:
    return {
        "id": e.id, "clientId": e.client_id, "companyId": e.company_id or "",
        "brand": e.brand, "model": e.model, "btu": e.btu,
        "serialNumber": e.serial_number or "", "location": e.location,
        "preventiveInterval": e.preventive_interval or 0,
        "active": e.active,
        "lastPreventiveDate": e.last_preventive_date.isoformat() if e.last_preventive_date else None,
        "nextPreventiveDate": e.next_preventive_date.isoformat() if e.next_preventive_date else None,
        "createdAt": e.created_at.isoformat() if e.created_at else "",
    }

@router.get("")
def list_equipments(company_id: str = "", client_id: str = "", active_only: str = "", db: Session = Depends(get_db)):
    q = db.query(Equipamento).filter(Equipamento.deleted_at.is_(None))
    if company_id:
        q = q.filter(Equipamento.company_id == company_id)
    if client_id:
        q = q.filter(Equipamento.client_id == client_id)
    if active_only == "true":
        q = q.filter(Equipamento.active == True)
    return {"data": [equip_to_dict(e) for e in q.order_by(Equipamento.created_at.desc()).all()]}

@router.get("/{equip_id}")
def get_equipment(equip_id: str, db: Session = Depends(get_db)):
    e = db.query(Equipamento).filter(Equipamento.id == equip_id, Equipamento.deleted_at.is_(None)).first()
    if not e:
        raise HTTPException(404, "Equipment not found")
    return {"data": equip_to_dict(e)}

@router.post("", status_code=201)
def create_equipment(req: EquipCreate, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    next_prev = None
    if req.preventive_interval > 0:
        next_prev = now + timedelta(days=req.preventive_interval)

    equip = Equipamento(
        id=str(uuid.uuid4()), client_id=req.client_id, company_id=req.company_id,
        brand=req.brand, model=req.model, btu=req.btu,
        serial_number=req.serial_number, location=req.location,
        preventive_interval=req.preventive_interval,
        last_preventive_date=now, next_preventive_date=next_prev,
        active=True, created_at=now,
    )
    db.add(equip)
    db.commit()
    db.refresh(equip)
    return {"data": equip_to_dict(equip)}

@router.put("/{equip_id}")
def update_equipment(equip_id: str, req: EquipUpdate, db: Session = Depends(get_db)):
    e = db.query(Equipamento).filter(Equipamento.id == equip_id, Equipamento.deleted_at.is_(None)).first()
    if not e:
        raise HTTPException(404, "Equipment not found")
    for k, v in req.model_dump(exclude_none=True).items():
        setattr(e, k, v)
    e.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(e)
    return {"data": equip_to_dict(e)}

@router.patch("/{equip_id}/deactivate")
def deactivate(equip_id: str, db: Session = Depends(get_db)):
    e = db.query(Equipamento).filter(Equipamento.id == equip_id).first()
    if not e:
        raise HTTPException(404, "Equipment not found")
    e.active = False
    e.updated_at = datetime.utcnow()
    db.commit()
    return {"data": equip_to_dict(e)}

@router.patch("/{equip_id}/reactivate")
def reactivate(equip_id: str, db: Session = Depends(get_db)):
    e = db.query(Equipamento).filter(Equipamento.id == equip_id).first()
    if not e:
        raise HTTPException(404, "Equipment not found")
    e.active = True
    e.updated_at = datetime.utcnow()
    db.commit()
    return {"data": equip_to_dict(e)}

@router.delete("/{equip_id}")
def delete_equipment(equip_id: str, db: Session = Depends(get_db)):
    e = db.query(Equipamento).filter(Equipamento.id == equip_id).first()
    if not e:
        raise HTTPException(404, "Equipment not found")
    e.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Deleted"}
