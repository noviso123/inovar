"""
SQLAlchemy models — EXACTLY matching the GORM-created SQLite schema.
Generated from PRAGMA table_info() output.
"""

from sqlalchemy import Column, String, Integer, Boolean, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    phone = Column(String(20), default="")
    active = Column(Boolean, default=True)
    must_change_password = Column(Boolean, default=True)
    company_id = Column(String(36), index=True)
    avatar_url = Column(String(500), default="")
    reset_token = Column(String(36))
    reset_token_expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime)


class Prestador(Base):
    __tablename__ = "prestadores"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), unique=True, nullable=False)
    razao_social = Column(String(255), nullable=False)
    nome_fantasia = Column(String(255), default="")
    cnpj = Column(String(20))
    email = Column(String(255), default="")
    phone = Column(String(20), default="")
    address = Column(String(500), default="")
    endereco_id = Column(String(36))
    logo_url = Column(String(500), default="")
    bank_details = Column(Text, default="")
    pix_key = Column(String(255), default="")
    pix_key_type = Column(String(50), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Endereco(Base):
    __tablename__ = "enderecos"

    id = Column(String(36), primary_key=True)
    street = Column(String(255), nullable=False, default="")
    number = Column(String(20), default="")
    complement = Column(String(100), default="")
    district = Column(String(100), default="")
    city = Column(String(100), nullable=False, default="")
    state = Column(String(2), nullable=False, default="")
    zip_code = Column(String(10), nullable=False, default="")


class Cliente(Base):
    """clientes: NO active, NO deleted_at columns"""
    __tablename__ = "clientes"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    document = Column(String(30), default="")
    email = Column(String(255), default="")
    phone = Column(String(20), default="")
    endereco_id = Column(String(36), ForeignKey("enderecos.id"))
    company_id = Column(String(36), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

    endereco = relationship("Endereco", foreign_keys=[endereco_id])
    user = relationship("User", foreign_keys=[user_id])


class Tecnico(Base):
    __tablename__ = "tecnicos"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    company_id = Column(String(36), nullable=False, index=True)
    specialties = Column(String(500), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Equipamento(Base):
    __tablename__ = "equipamentos"

    id = Column(String(36), primary_key=True)
    client_id = Column(String(36), ForeignKey("clientes.id"), nullable=False, index=True)
    company_id = Column(String(36), index=True)
    brand = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    btu = Column(Integer, nullable=False)
    serial_number = Column(String(100), default="")
    location = Column(String(255), nullable=False)
    last_preventive_date = Column(DateTime)
    next_preventive_date = Column(DateTime)
    preventive_interval = Column(Integer, default=0)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime)


class Solicitacao(Base):
    """Exact match to GORM solicitacoes table"""
    __tablename__ = "solicitacoes"

    id = Column(String(36), primary_key=True)
    numero = Column(Integer)
    client_id = Column(String(36), ForeignKey("clientes.id"), nullable=False, index=True)
    client_name = Column(String(255), nullable=False, default="")
    company_id = Column(String(36), nullable=False, index=True)
    status = Column(String(50), nullable=False, default="ABERTA")
    priority = Column(String(50), nullable=False, default="MEDIA")
    service_type = Column(String(50), default="CORRETIVA")
    description = Column(Text, nullable=False, default="")
    responsible_id = Column(String(36))
    responsible_name = Column(String(255), default="")
    scheduled_at = Column(DateTime)
    sla_limit = Column(DateTime, nullable=False)
    confirmed_at = Column(DateTime)
    confirmed_by = Column(String(36))
    observation = Column(Text, default="")
    locked_by = Column(String(36))
    locked_at = Column(DateTime)
    valor_orcamento = Column(Float, default=0)
    orcamento_aprovado = Column(Boolean)
    assinatura_cliente = Column(Text, default="")
    assinatura_tecnico = Column(Text, default="")
    data_assinatura = Column(DateTime)
    materials_used = Column(Text, default="")
    next_maintenance_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class SolicitacaoEquipamento(Base):
    __tablename__ = "solicitacao_equipamentos"

    id = Column(String(36), primary_key=True)
    solicitacao_id = Column(String(36), ForeignKey("solicitacoes.id"), nullable=False)
    equipamento_id = Column(String(36), ForeignKey("equipamentos.id"), nullable=False)

    equipamento = relationship("Equipamento", foreign_keys=[equipamento_id])


class SolicitacaoHistorico(Base):
    __tablename__ = "solicitacao_historicos"

    id = Column(String(36), primary_key=True, nullable=False)
    solicitacao_id = Column(String(36), ForeignKey("solicitacoes.id"), nullable=False, index=True)
    user_id = Column(String(36))
    user_name = Column(String(255), default="")
    action = Column(String(255), default="")
    details = Column(Text, default="")
    level = Column(String(20), default="INFO")
    url = Column(String(500), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
