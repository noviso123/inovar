"""Users CRUD routes — called by Go via HTTP"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from database import get_db
from models import User, Prestador, Tecnico, RefreshToken

router = APIRouter()

class TokenCreate(BaseModel):
    user_id: str
    token: str
    expires_at: datetime

@router.post("/tokens", status_code=201)
def create_token(req: TokenCreate, db: Session = Depends(get_db)):
    token_obj = RefreshToken(
        id=str(uuid.uuid4()), user_id=req.user_id, token=req.token,
        expires_at=req.expires_at, revoked=False, created_at=datetime.utcnow()
    )
    db.add(token_obj)
    db.commit()
    return {"data": {"id": token_obj.id}}

@router.get("/tokens/{token}")
def get_token(token: str, db: Session = Depends(get_db)):
    t = db.query(RefreshToken).filter(RefreshToken.token == token, RefreshToken.revoked == False).first()
    if not t:
        raise HTTPException(404, "Token not found")
    return {"data": {
        "userId": t.user_id, "token": t.token, "expiresAt": t.expires_at.isoformat(),
        "revoked": t.revoked
    }}

@router.post("/tokens/revoke/{user_id}")
def revoke_tokens(user_id: str, db: Session = Depends(get_db)):
    db.query(RefreshToken).filter(RefreshToken.user_id == user_id).update({"revoked": True})
    db.commit()
    return {"message": "Tokens revoked"}

class UserCreate(BaseModel):
    name: str
    email: str
    password_hash: str
    role: str
    phone: str = ""
    company_id: str = ""
    avatar_url: str = ""
    specialties: str = ""

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    active: Optional[bool] = None
    must_change_password: Optional[bool] = None
    company_id: Optional[str] = None
    password_hash: Optional[str] = None

def user_to_dict(u: User) -> dict:
    return {
        "id": u.id, "name": u.name, "email": u.email,
        "role": u.role, "phone": u.phone, "active": u.active,
        "mustChangePassword": u.must_change_password,
        "companyId": u.company_id or "", "avatarUrl": u.avatar_url or "",
        "createdAt": u.created_at.isoformat() if u.created_at else "",
    }

@router.get("")
def list_users(company_id: str = "", role: str = "", reset_token: str = "", db: Session = Depends(get_db)):
    q = db.query(User).filter(User.deleted_at.is_(None))
    if company_id:
        q = q.filter(User.company_id == company_id)
    if role:
        q = q.filter(User.role == role)
    if reset_token:
        q = q.filter(User.reset_token == reset_token)

    users = q.order_by(User.created_at.desc()).all()
    return {"data": [user_to_dict(u) for u in users]}

@router.get("/{user_id}")
def get_user(user_id: str, include_hash: bool = False, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not u:
        raise HTTPException(404, "User not found")
    result = user_to_dict(u)
    if include_hash:
        result["passwordHash"] = u.password_hash
    return {"data": result}

@router.post("", status_code=201)
def create_user(req: UserCreate, db: Session = Depends(get_db)):
    # Check duplicate email
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "Email já cadastrado")

    company_id = req.company_id
    prestador_id = None

    # Auto-create Prestador profile
    if req.role == "PRESTADOR":
        prestador_id = str(uuid.uuid4())
        company_id = prestador_id

    # Auto-assign Tecnico to first Prestador
    if req.role == "TECNICO" and not company_id:
        p = db.query(Prestador).first()
        if p:
            company_id = p.id

    user = User(
        id=str(uuid.uuid4()), name=req.name, email=req.email,
        password_hash=req.password_hash, role=req.role, phone=req.phone,
        active=True, must_change_password=True, company_id=company_id,
        avatar_url=req.avatar_url, created_at=datetime.utcnow(),
    )
    db.add(user)
    db.flush()

    if req.role == "PRESTADOR" and prestador_id:
        db.add(Prestador(
            id=prestador_id, user_id=user.id, razao_social=req.name,
            nome_fantasia=req.name, email=req.email, phone=req.phone,
            created_at=datetime.utcnow(),
        ))

    if req.role == "TECNICO":
        db.add(Tecnico(
            id=str(uuid.uuid4()), user_id=user.id,
            company_id=company_id, specialties=req.specialties,
            created_at=datetime.utcnow(),
        ))

    db.commit()
    db.refresh(user)
    return {"data": user_to_dict(user)}

@router.put("/{user_id}")
def update_user(user_id: str, req: UserUpdate, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not u:
        raise HTTPException(404, "User not found")
    for k, v in req.model_dump(exclude_none=True).items():
        setattr(u, k, v)
    u.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(u)
    return {"data": user_to_dict(u)}

@router.patch("/{user_id}/block")
def toggle_block(user_id: str, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")
    u.active = not u.active
    u.updated_at = datetime.utcnow()
    db.commit()
    return {"data": user_to_dict(u)}

@router.post("/{user_id}/reset-password")
def reset_password(user_id: str, password_hash: str = "", db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")
    if password_hash:
        u.password_hash = password_hash
    u.must_change_password = True
    u.updated_at = datetime.utcnow()
    db.commit()
    return {"data": user_to_dict(u)}

@router.delete("/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(404, "User not found")
    u.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "Deleted"}

@router.get("/by-email/{email}")
def get_by_email(email: str, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.email == email, User.deleted_at.is_(None)).first()
    if not u:
        raise HTTPException(404, "User not found")
    result = user_to_dict(u)
    result["passwordHash"] = u.password_hash
    return {"data": result}
