from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProdutoBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=100, examples=["Pastel de Carne"])
    preco: float = Field(..., gt=0, examples=[8.50])
    quantidade: int = Field(..., ge=0, examples=[50])
    foto_url: Optional[str] = Field(None, max_length=500)


class ProdutoCreate(ProdutoBase):
    pass


class ProdutoUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=100)
    preco: Optional[float] = Field(None, gt=0)
    quantidade: Optional[int] = Field(None, ge=0)
    foto_url: Optional[str] = Field(None, max_length=500)


class ProdutoResponse(ProdutoBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime

    model_config = {"from_attributes": True}
