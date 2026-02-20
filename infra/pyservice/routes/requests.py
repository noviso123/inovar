"""Service Requests (Chamados) CRUD — exactly matching GORM solicitacoes schema"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import uuid

from database import get_db
from models import Solicitacao, SolicitacaoEquipamento, SolicitacaoHistorico, Equipamento

router = APIRouter()

class RequestCreate(BaseModel):
    client_id: str
    company_id: str = ""
    client_name: str = ""
    equipment_ids: List[str] = []
    priority: str = "MEDIA"
    service_type: str = "CORRETIVA"
    description: str = ""
    sla_hours: int = 48
    created_by_id: str = ""
    created_by_name: str = ""

class StatusUpdate(BaseModel):
    status: str
    user_id: str = ""
    user_name: str = ""
    notes: str = ""

def req_to_dict(r: Solicitacao, equips: list = None) -> dict:
    result = {
        "id": r.id, "numero": r.numero, "clientId": r.client_id,
        "companyId": r.company_id or "", "clientName": r.client_name or "",
        "responsibleId": r.responsible_id or "", "responsibleName": r.responsible_name or "",
        "status": r.status, "priority": r.priority, "serviceType": r.service_type or "",
        "description": r.description or "", "observation": r.observation or "",
        "slaLimit": r.sla_limit.isoformat() if r.sla_limit else None,
        "createdAt": r.created_at.isoformat() if r.created_at else "",
    }
    if equips is not None:
        result["equipments"] = equips
    return result

@router.get("")
def list_requests(company_id: str = "", client_id: str = "", status: str = "",
                  priority: str = "", db: Session = Depends(get_db)):
    q = db.query(Solicitacao)
    if company_id:
        q = q.filter(Solicitacao.company_id == company_id)
    if client_id:
        q = q.filter(Solicitacao.client_id == client_id)
    if status:
        q = q.filter(Solicitacao.status == status)
    if priority:
        q = q.filter(Solicitacao.priority == priority)
    requests = q.order_by(Solicitacao.created_at.desc()).all()

    results = []
    for r in requests:
        se_list = db.query(SolicitacaoEquipamento).filter(
            SolicitacaoEquipamento.solicitacao_id == r.id
        ).all()
        equips = []
        for se in se_list:
            eq = db.query(Equipamento).filter(Equipamento.id == se.equipamento_id).first()
            if eq:
                equips.append({"id": eq.id, "brand": eq.brand, "model": eq.model,
                               "btu": eq.btu, "location": eq.location})
        results.append(req_to_dict(r, equips))

    return {"data": results}

@router.get("/{req_id}")
def get_request(req_id: str, db: Session = Depends(get_db)):
    r = db.query(Solicitacao).filter(Solicitacao.id == req_id).first()
    if not r:
        raise HTTPException(404, "Request not found")

    se_list = db.query(SolicitacaoEquipamento).filter(
        SolicitacaoEquipamento.solicitacao_id == r.id
    ).all()
    equips = []
    for se in se_list:
        eq = db.query(Equipamento).filter(Equipamento.id == se.equipamento_id).first()
        if eq:
            equips.append({"id": eq.id, "brand": eq.brand, "model": eq.model,
                           "btu": eq.btu, "location": eq.location, "serialNumber": eq.serial_number})

    return {"data": req_to_dict(r, equips)}

@router.post("", status_code=201)
def create_request(req: RequestCreate, db: Session = Depends(get_db)):
    max_num = db.query(func.max(Solicitacao.numero)).scalar() or 0
    numero = max_num + 1

    now = datetime.utcnow()
    sla_limit = now + timedelta(hours=req.sla_hours)

    sol = Solicitacao(
        id=str(uuid.uuid4()), numero=numero, client_id=req.client_id,
        company_id=req.company_id, client_name=req.client_name,
        status="ABERTA", priority=req.priority, service_type=req.service_type,
        description=req.description, sla_limit=sla_limit,
        created_at=now,
    )
    db.add(sol)
    db.flush()

    for eid in req.equipment_ids:
        db.add(SolicitacaoEquipamento(
            id=str(uuid.uuid4()), solicitacao_id=sol.id, equipamento_id=eid,
        ))

    db.add(SolicitacaoHistorico(
        id=str(uuid.uuid4()), solicitacao_id=sol.id,
        user_id=req.created_by_id, user_name=req.created_by_name,
        action=f"Chamado #{numero} criado", details=f"Prioridade: {req.priority}",
        level="INFO", created_at=now,
    ))

    db.commit()
    db.refresh(sol)
    return {"data": req_to_dict(sol)}

@router.patch("/{req_id}/status")
def update_status(req_id: str, req: StatusUpdate, db: Session = Depends(get_db)):
    sol = db.query(Solicitacao).filter(Solicitacao.id == req_id).first()
    if not sol:
        raise HTTPException(404, "Request not found")

    old_status = sol.status
    sol.status = req.status
    sol.updated_at = datetime.utcnow()

    db.add(SolicitacaoHistorico(
        id=str(uuid.uuid4()), solicitacao_id=sol.id,
        user_id=req.user_id, user_name=req.user_name,
        action=f"Status: {old_status} → {req.status}",
        details=req.notes, level="INFO", created_at=datetime.utcnow(),
    ))

    db.commit()
    db.refresh(sol)
    return {"data": req_to_dict(sol)}

@router.get("/{req_id}/history")
def get_history(req_id: str, db: Session = Depends(get_db)):
    entries = db.query(SolicitacaoHistorico).filter(
        SolicitacaoHistorico.solicitacao_id == req_id
    ).order_by(SolicitacaoHistorico.created_at.desc()).all()
    return {"data": [{
        "id": h.id, "userId": h.user_id, "userName": h.user_name,
        "action": h.action, "details": h.details, "level": h.level,
        "createdAt": h.created_at.isoformat() if h.created_at else "",
    } for h in entries]}

@router.post("/history")
def add_history(entry: dict, db: Session = Depends(get_db)):
    h = SolicitacaoHistorico(
        id=str(uuid.uuid4()), solicitacao_id=entry.get("solicitacao_id", ""),
        user_id=entry.get("user_id", ""), user_name=entry.get("user_name", ""),
        action=entry.get("action", ""), details=entry.get("details", ""),
        level=entry.get("level", "INFO"), url=entry.get("url", ""),
        created_at=datetime.utcnow(),
    )
    db.add(h)
    db.commit()
    return {"data": {"id": h.id}}
