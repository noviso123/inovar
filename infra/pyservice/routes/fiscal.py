from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
import datetime
from datetime import datetime as dt

from database import get_db
from models import ConfiguracaoFiscal, NotaFiscal, NFSeEvento, CertificadoDigital
from pydantic import BaseModel

router = APIRouter(prefix="/db/fiscal", tags=["fiscal"])

class FiscalConfigUpdate(BaseModel):
    codigo_municipio: Optional[int] = None
    inscricao_municipal: Optional[str] = None
    regime_tributario: Optional[str] = None
    natureza_operacao: Optional[int] = None
    cnae: Optional[str] = None
    codigo_servico: Optional[str] = None
    aliquota_iss: Optional[float] = None
    ambiente: Optional[str] = None

class CertUpdate(BaseModel):
    nome: str
    cert_path: str
    validade: dt
    password: Optional[str] = None

@router.get("/config/{prestador_id}")
def get_config(prestador_id: str, db: Session = Depends(get_db)):
    config = db.query(ConfiguracaoFiscal).filter(ConfiguracaoFiscal.prestador_id == prestador_id).first()
    return {"data": config}

@router.put("/config/{prestador_id}")
def update_config(prestador_id: str, req: FiscalConfigUpdate, db: Session = Depends(get_db)):
    config = db.query(ConfiguracaoFiscal).filter(ConfiguracaoFiscal.prestador_id == prestador_id).first()
    if not config:
        config = ConfiguracaoFiscal(id=str(uuid.uuid4()), prestador_id=prestador_id)
        db.add(config)

    for field, value in req.dict(exclude_unset=True).items():
        setattr(config, field, value)

    db.commit()
    db.refresh(config)
    return {"data": config}

@router.post("/certificate/{prestador_id}")
def add_certificate(prestador_id: str, req: CertUpdate, db: Session = Depends(get_db)):
    db.query(CertificadoDigital).filter(CertificadoDigital.prestador_id == prestador_id).update({"ativo": False})

    cert = CertificadoDigital(
        id=str(uuid.uuid4()),
        prestador_id=prestador_id,
        nome=req.nome,
        cert_path=req.cert_path,
        validade=req.validade,
        ativo=True,
        password=req.password,
        created_at=dt.utcnow()
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return {"data": cert}

@router.get("/certificate/{prestador_id}")
def get_certificate(prestador_id: str, db: Session = Depends(get_db)):
    cert = db.query(CertificadoDigital).filter(CertificadoDigital.prestador_id == prestador_id, CertificadoDigital.ativo == True).first()
    return {"data": cert}

@router.get("/nfse/by-request/{request_id}")
def get_nfse(request_id: str, db: Session = Depends(get_db)):
    nfse = db.query(NotaFiscal).filter(NotaFiscal.solicitacao_id == request_id).first()
    return {"data": nfse}

@router.post("/nfse")
def create_nfse(req: dict, db: Session = Depends(get_db)):
    if "id" not in req:
        req["id"] = str(uuid.uuid4())
    nfse = NotaFiscal(**req)
    db.add(nfse)
    db.commit()
    db.refresh(nfse)
    return {"data": nfse}

@router.patch("/nfse/{nfse_id}")
def update_nfse(nfse_id: str, req: dict, db: Session = Depends(get_db)):
    nfse = db.query(NotaFiscal).filter(NotaFiscal.id == nfse_id).first()
    if not nfse:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in req.items():
        if hasattr(nfse, field):
            setattr(nfse, field, value)
    db.commit()
    db.refresh(nfse)
    return {"data": nfse}

@router.get("/nfse/{nfse_id}/events")
def list_nfse_events(nfse_id: str, db: Session = Depends(get_db)):
    events = db.query(NFSeEvento).filter(NFSeEvento.nfse_id == nfse_id).order_by(NFSeEvento.created_at.desc()).all()
    return {"data": events}

@router.post("/nfse/event")
def create_nfse_event(req: dict, db: Session = Depends(get_db)):
    if "id" not in req:
        req["id"] = str(uuid.uuid4())
    event = NFSeEvento(**req)
    db.add(event)
    db.commit()
    db.refresh(event)
    return {"data": event}
