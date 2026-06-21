from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.fiado import TipoMovimentacao


class ClienteBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=100, examples=["Dona Maria"])
    telefone: str = Field(..., min_length=10, max_length=20, examples=["5511999998888"])
    limite_fiado: float = Field(default=0.0, ge=0, examples=[200.0])


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=100)
    telefone: Optional[str] = Field(None, min_length=10, max_length=20)
    limite_fiado: Optional[float] = Field(None, ge=0)


class FiadoBase(BaseModel):
    descricao: str = Field(..., min_length=1, max_length=200, examples=["2x Pastel de Carne"])
    valor: float = Field(..., gt=0, examples=[17.0])
    tipo: TipoMovimentacao = Field(..., examples=[TipoMovimentacao.COMPRA])


class FiadoCreate(FiadoBase):
    cliente_id: int


class FiadoResponse(FiadoBase):
    id: int
    cliente_id: int
    criado_em: datetime

    model_config = {"from_attributes": True}


class ClienteResponse(ClienteBase):
    id: int
    criado_em: datetime

    model_config = {"from_attributes": True}


class ClienteComSaldo(ClienteResponse):
    """Esse aqui é o schema que mostra o saldo devedor calculado na hora — sem guardar campo duplicado."""
    saldo_devedor: float = 0.0
    fiados: list[FiadoResponse] = []
