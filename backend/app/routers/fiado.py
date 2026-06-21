from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.fiado import Cliente, Fiado, TipoMovimentacao
from app.schemas.fiado import (
    ClienteCreate,
    ClienteUpdate,
    ClienteResponse,
    ClienteComSaldo,
    FiadoCreate,
    FiadoResponse,
)

router = APIRouter(prefix="/api/fiado", tags=["Caderneta (Fiado)"])


def _calcular_saldo(cliente: Cliente) -> float:
    """Soma as compras e subtrai os pagamentos — o saldo devedor real do cliente."""
    saldo = 0.0
    for mov in cliente.fiados:
        if mov.tipo == TipoMovimentacao.COMPRA:
            saldo += mov.valor
        else:
            saldo -= mov.valor
    return round(saldo, 2)


# ─── Clientes ────────────────────────────────────────────────────────────────


@router.post("/clientes", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
def criar_cliente(cliente: ClienteCreate, db: Session = Depends(get_db)):
    existente = db.query(Cliente).filter(Cliente.telefone == cliente.telefone).first()
    if existente:
        raise HTTPException(status_code=409, detail="Já existe um cliente com esse telefone")

    novo = Cliente(**cliente.model_dump())
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo


@router.get("/clientes", response_model=list[ClienteResponse])
def listar_clientes(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return db.query(Cliente).offset(skip).limit(limit).all()


@router.get("/clientes/{cliente_id}", response_model=ClienteComSaldo)
def buscar_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    return ClienteComSaldo(
        id=cliente.id,
        nome=cliente.nome,
        telefone=cliente.telefone,
        limite_fiado=cliente.limite_fiado,
        criado_em=cliente.criado_em,
        saldo_devedor=_calcular_saldo(cliente),
        fiados=[FiadoResponse.model_validate(f) for f in cliente.fiados],
    )


@router.patch("/clientes/{cliente_id}", response_model=ClienteResponse)
def atualizar_cliente(cliente_id: int, dados: ClienteUpdate, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(cliente, campo, valor)

    db.commit()
    db.refresh(cliente)
    return cliente


@router.delete("/clientes/{cliente_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    db.delete(cliente)
    db.commit()


# ─── Movimentações (Fiado) ───────────────────────────────────────────────────


@router.post("/movimentacoes", response_model=FiadoResponse, status_code=status.HTTP_201_CREATED)
def registrar_fiado(fiado: FiadoCreate, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id == fiado.cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    # Sacou? Se for compra, a gente checa se o cliente ainda tem limite disponível
    if fiado.tipo == TipoMovimentacao.COMPRA:
        saldo_atual = _calcular_saldo(cliente)
        if saldo_atual + fiado.valor > cliente.limite_fiado:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Limite de fiado estourado! "
                    f"Saldo atual: R${saldo_atual:.2f}, "
                    f"Limite: R${cliente.limite_fiado:.2f}"
                ),
            )

    nova_mov = Fiado(**fiado.model_dump())
    db.add(nova_mov)
    db.commit()
    db.refresh(nova_mov)
    return nova_mov


@router.get("/movimentacoes/{cliente_id}", response_model=list[FiadoResponse])
def listar_movimentacoes(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return db.query(Fiado).filter(Fiado.cliente_id == cliente_id).order_by(Fiado.criado_em.desc()).all()
