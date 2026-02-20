"""Clients CRUD routes — exactly matching GORM schema"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from database import get_db
from models import Cliente, User, Endereco

router = APIRouter()

class EnderecoData(BaseModel):
    street: str = ""
    number: str = ""
    complement: str = ""
    district: str = ""
    city: str = ""
    state: str = ""
    zipCode: str = ""

class ClientCreate(BaseModel):
    name: str
    email: str
    password_hash: str
    phone: str = ""
    document: str = ""
    company_id: str = ""
    endereco: Optional[EnderecoData] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    document: Optional[str] = None
    endereco: Optional[EnderecoData] = None

def client_to_dict(c: Cliente) -> dict:
    result = {
        "id": c.id, "userId": c.user_id, "companyId": c.company_id or "",
        "name": c.name, "document": c.document or "", "phone": c.phone or "",
        "email": c.email or "",
        "createdAt": c.created_at.isoformat() if c.created_at else "",
    }
    if c.endereco:
        result["endereco"] = {
            "id": c.endereco.id, "street": c.endereco.street,
            "number": c.endereco.number, "complement": c.endereco.complement,
            "district": c.endereco.district, "city": c.endereco.city,
            "state": c.endereco.state, "zipCode": c.endereco.zip_code,
        }
    return result

@router.get("")
def list_clients(company_id: str = "", db: Session = Depends(get_db)):
    q = db.query(Cliente)
    if company_id:
        q = q.filter(Cliente.company_id == company_id)
    clients = q.order_by(Cliente.created_at.desc()).all()
    return {"data": [client_to_dict(c) for c in clients]}

@router.get("/{client_id}")
def get_client(client_id: str, db: Session = Depends(get_db)):
    c = db.query(Cliente).filter(Cliente.id == client_id).first()
    if not c:
        raise HTTPException(404, "Client not found")
    return {"data": client_to_dict(c)}

@router.post("", status_code=201)
def create_client(req: ClientCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "Email já cadastrado")

    user = User(
        id=str(uuid.uuid4()), name=req.name, email=req.email,
        password_hash=req.password_hash, role="CLIENTE", phone=req.phone,
        active=True, must_change_password=True, company_id=req.company_id,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.flush()

    endereco_id = None
    if req.endereco:
        endereco = Endereco(
            id=str(uuid.uuid4()), street=req.endereco.street,
            number=req.endereco.number, complement=req.endereco.complement,
            district=req.endereco.district, city=req.endereco.city,
            state=req.endereco.state, zip_code=req.endereco.zipCode,
        )
        db.add(endereco)
        db.flush()
        endereco_id = endereco.id

    client = Cliente(
        id=str(uuid.uuid4()), user_id=user.id, company_id=req.company_id,
        name=req.name, document=req.document, phone=req.phone,
        email=req.email, endereco_id=endereco_id,
        created_at=datetime.utcnow(),
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return {"data": client_to_dict(client)}

@router.put("/{client_id}")
def update_client(client_id: str, req: ClientUpdate, db: Session = Depends(get_db)):
    c = db.query(Cliente).filter(Cliente.id == client_id).first()
    if not c:
        raise HTTPException(404, "Client not found")

    if req.name is not None:
        c.name = req.name
    if req.phone is not None:
        c.phone = req.phone
    if req.document is not None:
        c.document = req.document

    if req.endereco:
        if c.endereco:
            c.endereco.street = req.endereco.street
            c.endereco.number = req.endereco.number
            c.endereco.complement = req.endereco.complement
            c.endereco.district = req.endereco.district
            c.endereco.city = req.endereco.city
            c.endereco.state = req.endereco.state
            c.endereco.zip_code = req.endereco.zipCode
        else:
            endereco = Endereco(
                id=str(uuid.uuid4()), street=req.endereco.street,
                number=req.endereco.number, complement=req.endereco.complement,
                district=req.endereco.district, city=req.endereco.city,
                state=req.endereco.state, zip_code=req.endereco.zipCode,
            )
            db.add(endereco)
            db.flush()
            c.endereco_id = endereco.id

    c.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(c)
    return {"data": client_to_dict(c)}

@router.delete("/{client_id}")
def delete_client(client_id: str, db: Session = Depends(get_db)):
    c = db.query(Cliente).filter(Cliente.id == client_id).first()
    if not c:
        raise HTTPException(404, "Client not found")
    db.delete(c)
    db.commit()
    return {"message": "Deleted"}
