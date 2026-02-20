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


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36))
    user_name = Column(String(255))
    user_role = Column(String(50))
    entity = Column(String(100), nullable=False)
    entity_id = Column(String(36))
    action = Column(String(50), nullable=False)
    details = Column(Text)
    before_value = Column(Text)
    after_value = Column(Text)
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)


class Anexo(Base):
    __tablename__ = "anexos"

    id = Column(String(36), primary_key=True)
    solicitacao_id = Column(String(36), ForeignKey("solicitacoes.id"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    mime_type = Column(String(100))
    file_size = Column(Integer)
    uploaded_by_id = Column(String(36), nullable=False)
    uploaded_by_name = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)


class Checklist(Base):
    __tablename__ = "checklists"

    id = Column(String(36), primary_key=True)
    solicitacao_id = Column(String(36), ForeignKey("solicitacoes.id"), nullable=False, index=True)
    equipamento_id = Column(String(36), ForeignKey("equipamentos.id"))
    description = Column(String(255), nullable=False)
    checked = Column(Boolean, default=False)
    observation = Column(Text)
    checked_by_id = Column(String(36))
    checked_by_name = Column(String(255))
    checked_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)


class OrcamentoItem(Base):
    __tablename__ = "orcamento_itens"

    id = Column(String(36), primary_key=True)
    solicitacao_id = Column(String(36), ForeignKey("solicitacoes.id"), nullable=False, index=True)
    descricao = Column(String(255), nullable=False)
    quantidade = Column(Float, default=1.0)
    valor_unit = Column(Float, default=0.0)
    valor_total = Column(Float, default=0.0)
    tipo = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)


class NotaFiscal(Base):
    __tablename__ = "notas_fiscais"

    id = Column(String(36), primary_key=True)
    solicitacao_id = Column(String(36), ForeignKey("solicitacoes.id"), nullable=False, index=True)
    prestador_id = Column(String(36), nullable=False, index=True)
    numero = Column(String(50))
    codigo_verificacao = Column(String(50))
    tomador_nome = Column(String(255), nullable=False)
    tomador_documento = Column(String(20), nullable=False)
    tomador_endereco = Column(Text)
    discriminacao = Column(Text, nullable=False)
    codigo_servico = Column(String(20))
    cnae = Column(String(20))
    valor_servicos = Column(Float, default=0.0)
    valor_deducoes = Column(Float, default=0.0)
    valor_liquido = Column(Float, default=0.0)
    aliquota_iss = Column(Float, default=0.0)
    valor_iss = Column(Float, default=0.0)
    valor_pis = Column(Float, default=0.0)
    valor_cofins = Column(Float, default=0.0)
    valor_csll = Column(Float, default=0.0)
    valor_ir = Column(Float, default=0.0)
    valor_inss = Column(Float, default=0.0)
    status = Column(String(30), nullable=False, index=True, default="PENDENTE")
    mensagem_erro = Column(Text)
    xml_path = Column(String(500))
    pdf_path = Column(String(500))
    data_emissao = Column(DateTime)
    data_competencia = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class NFSeEvento(Base):
    __tablename__ = "nfse_eventos"

    id = Column(String(36), primary_key=True)
    nfse_id = Column(String(36), ForeignKey("notas_fiscais.id"), nullable=False, index=True)
    tipo = Column(String(50), nullable=False)
    status = Column(String(30))
    protocolo = Column(String(100))
    mensagem = Column(Text)
    motivo = Column(Text)
    user_id = Column(String(36))
    created_at = Column(DateTime, default=datetime.utcnow)


class CertificadoDigital(Base):
    __tablename__ = "certificados_digitais"

    id = Column(String(36), primary_key=True)
    prestador_id = Column(String(36), unique=True, nullable=False, index=True)
    nome = Column(String(255), nullable=False)
    tipo = Column(String(20), nullable=False)  # A1, A3
    validade = Column(DateTime, nullable=False)
    cert_path = Column(String(500))
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class ConfiguracaoFiscal(Base):
    __tablename__ = "configuracoes_fiscais"

    id = Column(String(36), primary_key=True)
    prestador_id = Column(String(36), unique=True, nullable=False, index=True)
    inscricao_municipal = Column(String(30))
    inscricao_estadual = Column(String(30))
    cnae = Column(String(20))
    codigo_servico = Column(String(20))
    item_lista_servico = Column(String(10))
    regime_tributario = Column(String(50))
    tipo_cnpj = Column(String(30))
    optante_simples_nac = Column(Boolean, default=False)
    faixa_simples_nac = Column(String(20))
    aliquota_simples_nac = Column(Float, default=0.0)
    is_mei = Column(Boolean, default=False)
    incentivador_cultural = Column(Boolean, default=False)
    aliquota_iss_padrao = Column(Float, default=0.0)
    iss_retido = Column(Boolean, default=False)
    local_prestacao = Column(String(20))
    natureza_operacao = Column(String(50))
    aliquota_pis = Column(Float, default=0.0)
    aliquota_cofins = Column(Float, default=0.0)
    aliquota_csll = Column(Float, default=0.0)
    aliquota_irpj = Column(Float, default=0.0)
    aliquota_inss = Column(Float, default=0.0)
    retem_pis = Column(Boolean, default=False)
    retem_cofins = Column(Boolean, default=False)
    retem_csll = Column(Boolean, default=False)
    retem_ir = Column(Boolean, default=False)
    retem_inss = Column(Boolean, default=False)
    ambiente = Column(String(20)) # PRODUCAO, HOMOLOGACAO
    codigo_municipio = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Agenda(Base):
    __tablename__ = "agenda"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    solicitacao_id = Column(String(36), ForeignKey("solicitacoes.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    duration = Column(Integer, default=60)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String(36), primary_key=True)
    description = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(50))
    date = Column(DateTime, default=datetime.utcnow)
    user_id = Column(String(36), ForeignKey("users.id"))
    company_id = Column(String(36))
    created_at = Column(DateTime, default=datetime.utcnow)
