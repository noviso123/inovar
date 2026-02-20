from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import datetime

from database import get_db
from models import OrcamentoItem, Solicitacao
from pydantic import BaseModel

router = APIRouter(prefix="/db/budgets", tags=["budgets"])

class BudgetCreate(BaseModel):
    solicitacao_id: str
    descricao: str
    quantidade: float = 1.0
    valor_unit: float = 0.0
    tipo: Optional[str] = None

@router.get("/by-request/{request_id}")
def list_budget_items(request_id: str, db: Session = Depends(get_db)):
    items = db.query(OrcamentoItem).filter(OrcamentoItem.solicitacao_id == request_id).all()
    return {"data": items}

@router.post("/")
def add_budget_item(req: BudgetCreate, db: Session = Depends(get_db)):
    valor_total = req.quantidade * req.valor_unit
    item = OrcamentoItem(
        id=str(uuid.uuid4()),
        solicitacao_id=req.solicitacao_id,
        descricao=req.descricao,
        quantidade=req.quantidade,
        valor_unit=req.valor_unit,
        valor_total=valor_total,
        tipo=req.tipo,
        created_at=datetime.datetime.utcnow()
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"data": item}

@router.delete("/{item_id}")
def delete_budget_item(item_id: str, db: Session = Depends(get_db)):
    item = db.query(OrcamentoItem).filter(OrcamentoItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
    return {"success": True}
