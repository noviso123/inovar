from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from database import get_db
from models import Solicitacao, Expense
from pydantic import BaseModel

router = APIRouter()

@router.get("/summary")
def get_summary(db: Session = Depends(get_db)):
    requests = db.query(Solicitacao).all()
    expenses = db.query(Expense).all()

    total_revenue = sum(r.valor_orcamento or 0.0 for r in requests if r.status == "FINALIZADA")
    pending_revenue = sum(r.valor_orcamento or 0.0 for r in requests if r.status not in ["FINALIZADA", "CANCELADA"])
    total_expenses = sum(e.amount for e in expenses)

    transactions = []
    for r in requests:
        if r.status == "FINALIZADA":
            transactions.append({
                "id": r.id,
                "date": r.updated_at,
                "type": "income",
                "amount": r.valor_orcamento,
                "description": f"OS #{r.numero} - {r.client_name}",
                "status": "paid"
            })

    for e in expenses:
        transactions.append({
            "id": e.id,
            "date": e.date,
            "type": "expense",
            "amount": e.amount,
            "description": f"[{e.category}] {e.description}",
            "status": "paid"
        })

    return {
        "data": {
            "totalRevenue": total_revenue,
            "netProfit": total_revenue - total_expenses,
            "pendingRevenue": pending_revenue,
            "expenses": total_expenses,
            "transactions": transactions
        }
    }

@router.get("/expenses")
def list_expenses(db: Session = Depends(get_db)):
    return {"data": db.query(Expense).all()}

@router.post("/expenses")
def create_expense(req: dict, db: Session = Depends(get_db)):
    if "id" not in req:
        req["id"] = str(uuid.uuid4())
    exp = Expense(**req)
    db.add(exp)
    db.commit()
    db.refresh(exp)
    return {"data": exp}
