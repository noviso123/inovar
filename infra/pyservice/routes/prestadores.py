from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from database import get_db
from models import Prestador, User, Endereco

router = APIRouter()

class EnderecoData(BaseModel):
    street: str = ""
    number: str = ""
    complement: str = ""
    district: str = ""
    city: str = ""
    state: str = ""
    zipCode: str = ""

class PrestadorUpdate(BaseModel):
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None
    cnpj: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    bank_details: Optional[str] = None
    pix_key: Optional[str] = None
    pix_key_type: Optional[str] = None
    logo_url: Optional[str] = None
    endereco: Optional[EnderecoData] = None

def prestador_to_dict(p: Prestador) -> dict:
    result = {
        "id": p.id, "userId": p.user_id, "razaoSocial": p.razao_social,
        "nomeFantasia": p.nome_fantasia, "cnpj": p.cnpj or "",
        "email": p.email or "", "phone": p.phone or "",
        "address": p.address or "", "bankDetails": p.bank_details or "",
        "pixKey": p.pix_key or "", "pixKeyType": p.pix_key_type or "",
        "logoUrl": p.logo_url or "",
    }
    if p.endereco:
        result["endereco"] = {
            "id": p.endereco.id, "street": p.endereco.street,
            "number": p.endereco.number, "complement": p.endereco.complement,
            "district": p.endereco.district, "city": p.endereco.city,
            "state": p.endereco.state, "zipCode": p.endereco.zip_code,
        }
    return result

@router.get("/by-user/{user_id}")
def get_by_user(user_id: str, db: Session = Depends(get_db)):
    p = db.query(Prestador).filter(Prestador.user_id == user_id).first()
    if not p:
        raise HTTPException(404, "Prestador not found")
    return {"data": prestador_to_dict(p)}

@router.put("/by-user/{user_id}")
def update_by_user(user_id: str, req: PrestadorUpdate, db: Session = Depends(get_db)):
    p = db.query(Prestador).filter(Prestador.user_id == user_id).first()
    if not p:
        # Create new if not found (matching Go logic)
        p = Prestador(id=str(uuid.uuid4()), user_id=user_id, created_at=datetime.utcnow())
        db.add(p)
        db.flush()

    if req.razao_social: p.razao_social = req.razao_social
    if req.nome_fantasia: p.nome_fantasia = req.nome_fantasia
    if req.cnpj: p.cnpj = req.cnpj
    if req.email: p.email = req.email
    if req.phone: p.phone = req.phone
    if req.address: p.address = req.address
    if req.bank_details: p.bank_details = req.bank_details
    if req.pix_key: p.pix_key = req.pix_key
    if req.pix_key_type: p.pix_key_type = req.pix_key_type
    if req.logo_url: p.logo_url = req.logo_url

    if req.endereco:
        if p.endereco:
            p.endereco.street = req.endereco.street
            p.endereco.number = req.endereco.number
            p.endereco.complement = req.endereco.complement
            p.endereco.district = req.endereco.district
            p.endereco.city = req.endereco.city
            p.endereco.state = req.endereco.state
            p.endereco.zip_code = req.endereco.zip_code
        else:
            addr = Endereco(
                id=str(uuid.uuid4()), street=req.endereco.street,
                number=req.endereco.number, complement=req.endereco.complement,
                district=req.endereco.district, city=req.endereco.city,
                state=req.endereco.state, zip_code=req.endereco.zipCode
            )
            db.add(addr)
            db.flush()
            p.endereco_id = addr.id

    p.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(p)
    return {"data": prestador_to_dict(p)}
