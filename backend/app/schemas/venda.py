from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class VendaCreate(BaseModel):
    produto_id: int
    quantidade: int = Field(1, ge=1)
    cliente_id: Optional[int] = None
    cliente_nome: Optional[str] = Field(None, max_length=100)
    origem: str = Field("painel", max_length=20)


class VendaResponse(BaseModel):
    id: int
    produto_id: Optional[int]
    produto_nome: str
    quantidade: int
    preco_unitario: float
    valor_total: float
    cliente_id: Optional[int]
    cliente_nome: Optional[str]
    origem: str
    criado_em: datetime

    model_config = {"from_attributes": True}
