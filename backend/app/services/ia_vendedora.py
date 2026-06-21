from sqlalchemy.orm import Session

from app.models.estoque import Produto
from app.models.fiado import Cliente, Fiado, TipoMovimentacao
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _buscar_cliente_por_telefone(telefone: str, db: Session) -> Cliente | None:
    return db.query(Cliente).filter(Cliente.telefone == telefone).first()


def _calcular_saldo(cliente: Cliente) -> float:
    saldo = 0.0
    for mov in cliente.fiados:
        if mov.tipo == TipoMovimentacao.COMPRA:
            saldo += mov.valor
        else:
            saldo -= mov.valor
    return round(saldo, 2)


def _listar_produtos_disponiveis(db: Session) -> list[Produto]:
    return db.query(Produto).filter(Produto.quantidade > 0).all()


def processar_mensagem(telefone: str, mensagem: str, db: Session) -> str:
    """
    Aqui é o cérebro (mock) da IA vendedora.
    No MVP ela faz o básico: consulta estoque, confere fiado do cliente
    e monta uma resposta esperta. Quando trocar pelo LLM de verdade,
    é só refatorar essa função — o resto do sistema nem percebe.
    """
    logger.info(f"🤖 Mensagem recebida de {telefone}: \"{mensagem}\"")

    cliente = _buscar_cliente_por_telefone(telefone, db)
    produtos = _listar_produtos_disponiveis(db)
    msg = mensagem.lower().strip()

    if not cliente:
        logger.warning(f"👤 Cliente não cadastrado: {telefone}")
        return (
            "Opa! Não te encontrei no sistema ainda. 😅 "
            "Pede pro dono da barraquinha te cadastrar e a gente conversa!"
        )

    logger.debug(f"👤 Cliente identificado: {cliente.nome} (ID {cliente.id})")

    # Se o cliente quer ver o cardápio / estoque
    if any(palavra in msg for palavra in ["cardápio", "cardapio", "produtos", "tem o que", "o que tem"]):
        logger.info(f"📋 Intenção detectada: CARDÁPIO — {cliente.nome} quer ver os produtos")
        if not produtos:
            logger.warning("📦 Estoque zerado — nenhum produto disponível")
            return "Poxa, o estoque tá zerado agora! 😢 Volta mais tarde que pode ter novidade."

        linhas = ["Olha o que a gente tem disponível hoje! 🛒\n"]
        for p in produtos:
            linhas.append(f"• {p.nome} — R${p.preco:.2f} ({p.quantidade} un.)")
        resposta = "\n".join(linhas)
        logger.info(f"✅ Cardápio enviado com {len(produtos)} produto(s)")
        return resposta

    # Se o cliente quer ver o saldo do fiado
    if any(palavra in msg for palavra in ["fiado", "dívida", "divida", "saldo", "devo"]):
        saldo = _calcular_saldo(cliente)
        limite = cliente.limite_fiado
        logger.info(f"💳 Intenção detectada: FIADO — {cliente.nome} | saldo: R${saldo:.2f} | limite: R${limite:.2f}")
        if saldo <= 0:
            return f"Tá limpo, {cliente.nome}! 🎉 Sem dívida nenhuma. Seu limite é de R${limite:.2f}."
        return (
            f"Fala, {cliente.nome}! Seu saldo devedor tá em R${saldo:.2f} "
            f"e seu limite é R${limite:.2f}. "
            f"Sobrando R${max(limite - saldo, 0):.2f} de crédito. 💰"
        )

    # Resposta genérica pra quando a IA não entende
    logger.info(f"❓ Intenção não reconhecida de {cliente.nome}: \"{mensagem}\"")
    return (
        f"E aí, {cliente.nome}! 😊 Não entendi direito o que você quis dizer. "
        "Tenta mandar 'cardápio' pra ver os produtos ou 'fiado' pra conferir sua conta!"
    )
