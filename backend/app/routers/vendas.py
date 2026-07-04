from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.estoque import Produto
from app.models.fiado import Cliente
from app.models.venda import Venda
from app.schemas.venda import VendaCreate, VendaResponse

router = APIRouter(prefix="/api/vendas", tags=["Vendas"])


@router.post("/", response_model=VendaResponse, status_code=status.HTTP_201_CREATED)
def registrar_venda(venda: VendaCreate, db: Session = Depends(get_db)):
    produto = db.query(Produto).filter(Produto.id == venda.produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    if produto.quantidade < venda.quantidade:
        raise HTTPException(
            status_code=400,
            detail=f"Estoque insuficiente: só tem {produto.quantidade} un. de {produto.nome}",
        )

    cliente = None
    if venda.cliente_id is not None:
        cliente = db.query(Cliente).filter(Cliente.id == venda.cliente_id).first()
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")

    # A venda dá baixa no estoque na hora — tudo na mesma transação
    produto.quantidade -= venda.quantidade

    nova = Venda(
        produto_id=produto.id,
        produto_nome=produto.nome,
        quantidade=venda.quantidade,
        preco_unitario=produto.preco,
        valor_total=round(produto.preco * venda.quantidade, 2),
        cliente_id=cliente.id if cliente else None,
        cliente_nome=cliente.nome if cliente else venda.cliente_nome,
        origem=venda.origem,
    )
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova


@router.get("/", response_model=list[VendaResponse])
def listar_vendas(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return (
        db.query(Venda)
        .order_by(Venda.criado_em.desc(), Venda.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
