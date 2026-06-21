from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class TipoMovimentacao(str, enum.Enum):
    """Compra = o cliente tá levando fiado. Pagamento = o cliente tá quitando a dívida."""
    COMPRA = "compra"
    PAGAMENTO = "pagamento"


class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    telefone = Column(String(20), unique=True, nullable=False, index=True)
    limite_fiado = Column(Float, default=0.0)
    criado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    fiados = relationship("Fiado", back_populates="cliente", cascade="all, delete-orphan")


class Fiado(Base):
    __tablename__ = "fiados"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    descricao = Column(String(200), nullable=False)
    valor = Column(Float, nullable=False)
    tipo = Column(Enum(TipoMovimentacao), nullable=False)
    criado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    cliente = relationship("Cliente", back_populates="fiados")
