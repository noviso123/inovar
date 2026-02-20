from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
import datetime

from database import get_db
from models import Anexo, Solicitacao
from pydantic import BaseModel

router = APIRouter(prefix="/db/attachments", tags=["attachments"])

class AttachmentCreate(BaseModel):
    solicitacao_id: str
    file_name: str
    file_path: str
    mime_type: str
    file_size: int
    uploaded_by_id: str
    uploaded_by_name: str

@router.get("/by-request/{request_id}")
def list_attachments(request_id: str, db: Session = Depends(get_db)):
    items = db.query(Anexo).filter(Anexo.solicitacao_id == request_id).all()
    return {"data": items}

@router.post("/")
def add_attachment(req: AttachmentCreate, db: Session = Depends(get_db)):
    item = Anexo(
        id=str(uuid.uuid4()),
        solicitacao_id=req.solicitacao_id,
        file_name=req.file_name,
        file_path=req.file_path,
        mime_type=req.mime_type,
        file_size=req.file_size,
        uploaded_by_id=req.uploaded_by_id,
        uploaded_by_name=req.uploaded_by_name,
        created_at=datetime.datetime.utcnow()
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"data": item}

@router.delete("/{item_id}")
def delete_attachment(item_id: str, db: Session = Depends(get_db)):
    item = db.query(Anexo).filter(Anexo.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
    return {"success": True}
