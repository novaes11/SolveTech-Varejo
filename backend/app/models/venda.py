from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey

from app.database import Base


class Venda(Base):
    __tablename__ = "vendas"

    id = Column(Integer, primary_key=True, index=True)
    # Guardamos nome e preço como "fotografia" do momento da venda — se o
    # produto ou o cliente forem apagados depois, o histórico continua íntegro
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=True)
    produto_nome = Column(String(100), nullable=False)
    quantidade = Column(Integer, nullable=False, default=1)
    preco_unitario = Column(Float, nullable=False)
    valor_total = Column(Float, nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    cliente_nome = Column(String(100), nullable=True)
    origem = Column(String(20), nullable=False, default="painel")  # "painel" | "whatsapp"
    criado_em = Column(DateTime, default=lambda: datetime.now(timezone.utc))
