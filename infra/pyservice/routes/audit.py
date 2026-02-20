from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from database import get_db
from models import AuditLog

router = APIRouter()

class AuditLogCreate(BaseModel):
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    entity: str
    entity_id: Optional[str] = None
    action: str
    details: Optional[str] = None
    before_value: Optional[str] = None
    after_value: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

def log_to_dict(log: AuditLog) -> dict:
    return {
        "id": log.id,
        "userId": log.user_id,
        "userName": log.user_name,
        "userRole": log.user_role,
        "entity": log.entity,
        "entityId": log.entity_id,
        "action": log.action,
        "details": log.details,
        "beforeValue": log.before_value,
        "afterValue": log.after_value,
        "ipAddress": log.ip_address,
        "userAgent": log.user_agent,
        "createdAt": log.created_at.isoformat() if log.created_at else None
    }

@router.get("")
def list_audit_logs(
    entity: Optional[str] = None,
    entity_id: Optional[str] = None,
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if entity:
        query = query.filter(AuditLog.entity == entity)
    if entity_id:
        query = query.filter(AuditLog.entity_id == entity_id)

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return {"data": [log_to_dict(log) for log in logs]}

@router.post("", status_code=201)
def create_audit_log(req: AuditLogCreate, db: Session = Depends(get_db)):
    log = AuditLog(
        id=str(uuid.uuid4()),
        user_id=req.user_id,
        user_name=req.user_name,
        user_role=req.user_role,
        entity=req.entity,
        entity_id=req.entity_id,
        action=req.action,
        details=req.details,
        before_value=req.before_value,
        after_value=req.after_value,
        ip_address=req.ip_address,
        user_agent=req.user_agent,
        created_at=datetime.utcnow()
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"data": log_to_dict(log)}
