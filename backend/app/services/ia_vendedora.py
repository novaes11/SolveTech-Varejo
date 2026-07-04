import re
import unicodedata
from difflib import SequenceMatcher

from sqlalchemy.orm import Session

from app.models.estoque import Produto
from app.models.fiado import Cliente, Fiado, TipoMovimentacao
from app.models.venda import Venda
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Quantidades faladas por extenso — típico de áudio transcrito ("vendi dois pastéis")
NUMEROS_POR_EXTENSO = {
    "um": 1, "uma": 1, "dois": 2, "duas": 2, "tres": 3, "quatro": 4,
    "cinco": 5, "seis": 6, "sete": 7, "oito": 8, "nove": 9, "dez": 10,
}

_PADRAO_VENDA = re.compile(r"\bvendi\b\s*(?P<resto>.*)", re.IGNORECASE)


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


# ─── Venda por voz ("vendi um pastel pro Kenzo") ─────────────────────────────


def _sem_acento(texto: str) -> str:
    decomposto = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in decomposto if unicodedata.category(c) != "Mn")


def _singularizar(palavra: str) -> str:
    """Plural simplificado do pt-BR: pastéis→pastel, limões→limão, coxinhas→coxinha."""
    if len(palavra) > 4 and palavra.endswith("eis"):
        return palavra[:-3] + "el"
    if len(palavra) > 4 and (palavra.endswith("oes") or palavra.endswith("aes")):
        return palavra[:-3] + "ao"
    if len(palavra) > 3 and palavra.endswith("s"):
        return palavra[:-1]
    return palavra


def _normalizar_para_busca(texto: str) -> str:
    """Minúsculo, sem acento e no singular — pra comparar fala com cadastro."""
    palavras = re.findall(r"[a-z0-9]+", _sem_acento(texto))
    return " ".join(_singularizar(p) for p in palavras)


def _interpretar_venda(mensagem: str) -> tuple[int, str, str | None] | None:
    """
    Quebra frases tipo "vendi 2 pastéis fiado pro Kenzo" em
    (quantidade, trecho_produto, trecho_cliente). Devolve None se
    não conseguir entender o formato.
    """
    texto = _sem_acento(mensagem)
    m = _PADRAO_VENDA.search(texto)
    if not m:
        return None

    resto = re.sub(r"\bfiado\b", " ", m.group("resto")).strip(" .!?,")
    if not resto:
        return None

    # O cliente vem depois do último "para/pro/pra" — o que sobra antes é o produto
    partes = re.split(r"\s+(?:para|pro|pra)\s+", resto, maxsplit=1)
    trecho_produto = partes[0].strip(" .!?,")
    trecho_cliente = None
    if len(partes) > 1:
        trecho_cliente = re.sub(r"^(?:o|a|os|as)\s+", "", partes[1]).strip(" .!?,") or None

    qtd = 1
    m_qtd = re.match(r"^(\d+|" + "|".join(NUMEROS_POR_EXTENSO) + r")\s+", trecho_produto)
    if m_qtd:
        token = m_qtd.group(1)
        qtd = int(token) if token.isdigit() else NUMEROS_POR_EXTENSO[token]
        trecho_produto = trecho_produto[m_qtd.end():].strip()

    if not trecho_produto:
        return None
    return qtd, trecho_produto, trecho_cliente


def _encontrar_produto(trecho: str, produtos: list[Produto]) -> tuple[Produto | None, list[Produto]]:
    """
    Casa o que foi falado com o estoque. Devolve (produto, ambíguos):
    match único → (produto, []); empate → (None, [candidatos]); nada → (None, []).
    """
    alvo = _normalizar_para_busca(trecho)
    candidatos: list[tuple[float, Produto]] = []
    for p in produtos:
        nome = _normalizar_para_busca(p.nome)
        if alvo == nome:
            return p, []
        if alvo in nome or nome in alvo:
            candidatos.append((1.0, p))
            continue
        ratio = SequenceMatcher(None, alvo, nome).ratio()
        if ratio >= 0.6:
            candidatos.append((ratio, p))

    if not candidatos:
        return None, []
    candidatos.sort(key=lambda c: -c[0])
    melhor = candidatos[0][0]
    empatados = [p for score, p in candidatos if score == melhor]
    if len(empatados) > 1:
        return None, empatados
    return empatados[0], []


def _encontrar_cliente(trecho: str | None, db: Session) -> Cliente | None:
    if not trecho:
        return None
    alvo = _normalizar_para_busca(trecho)
    for c in db.query(Cliente).all():
        nome = _normalizar_para_busca(c.nome)
        if alvo == nome or nome.startswith(alvo) or alvo in nome:
            return c
    return None


def _registrar_venda(mensagem: str, db: Session) -> str:
    """
    Comando do dono da barraquinha: "vendi X pro Y". Dá baixa no estoque,
    registra a venda (aparece no painel) e, se falar "fiado", anota na
    caderneta do cliente também.
    """
    interpretacao = _interpretar_venda(mensagem)
    if interpretacao is None:
        return (
            "Quase! Pra anotar uma venda, fala tipo: "
            "'vendi 2 pastéis pro Kenzo' ou 'vendi uma coxinha fiado pra Maria'. 😉"
        )

    qtd, trecho_produto, trecho_cliente = interpretacao
    eh_fiado = "fiado" in _sem_acento(mensagem)

    produto, ambiguos = _encontrar_produto(trecho_produto, db.query(Produto).all())
    if ambiguos:
        nomes = ", ".join(p.nome for p in ambiguos)
        return f"Achei mais de um produto parecido com '{trecho_produto}': {nomes}. Qual deles? 🤔"
    if produto is None:
        return (
            f"Não achei '{trecho_produto}' no estoque. 🤔 "
            "Manda 'cardápio' pra ver os produtos cadastrados!"
        )
    if produto.quantidade < qtd:
        return (
            f"Ih, não dá! Só tem {produto.quantidade} un. de {produto.nome} no estoque "
            f"e você quer vender {qtd}. Confere aí! 📦"
        )

    cliente = _encontrar_cliente(trecho_cliente, db)
    valor_total = round(produto.preco * qtd, 2)

    if eh_fiado:
        if cliente is None:
            nome_falado = trecho_cliente.title() if trecho_cliente else "o cliente"
            return (
                f"Pra vender fiado eu preciso do cliente na caderneta, "
                f"e não achei '{nome_falado}' lá. Cadastra ele primeiro no painel! 📒"
            )
        saldo = _calcular_saldo(cliente)
        if saldo + valor_total > cliente.limite_fiado:
            return (
                f"Opa, segura! Esse fiado estoura o limite de {cliente.nome}: "
                f"saldo R${saldo:.2f} + R${valor_total:.2f} passa do limite de "
                f"R${cliente.limite_fiado:.2f}. Não anotei nada. ✋"
            )

    # Tudo validado — baixa o estoque e registra a venda numa transação só
    produto.quantidade -= qtd
    nome_cliente = cliente.nome if cliente else (trecho_cliente.title() if trecho_cliente else None)
    venda = Venda(
        produto_id=produto.id,
        produto_nome=produto.nome,
        quantidade=qtd,
        preco_unitario=produto.preco,
        valor_total=valor_total,
        cliente_id=cliente.id if cliente else None,
        cliente_nome=nome_cliente,
        origem="whatsapp",
    )
    db.add(venda)
    if eh_fiado:
        db.add(Fiado(
            cliente_id=cliente.id,
            descricao=f"{qtd}x {produto.nome} (venda WhatsApp)",
            valor=valor_total,
            tipo=TipoMovimentacao.COMPRA,
        ))
    db.commit()

    logger.info(
        f"🛒 Venda registrada via WhatsApp: {qtd}x {produto.nome} — R${valor_total:.2f}"
        f"{' no fiado' if eh_fiado else ''} | estoque restante: {produto.quantidade}"
    )

    resposta = f"✅ Venda anotada! {qtd}x {produto.nome} — R${valor_total:.2f}"
    if nome_cliente:
        resposta += f" pro(a) {nome_cliente}"
    if eh_fiado:
        resposta += " (no fiado 📒)"
    resposta += f".\nEstoque de {produto.nome} agora: {produto.quantidade} un."
    if trecho_cliente and cliente is None:
        resposta += f"\n(Não achei '{trecho_cliente.title()}' na caderneta, mas a venda tá registrada!)"
    return resposta


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

    # Comando de venda do dono ("vendi um pastel pro Kenzo") — vem antes da
    # checagem de cadastro porque quem fala isso é o comerciante, não o cliente
    if re.search(r"\bvendi\b", msg):
        logger.info("🛒 Intenção detectada: VENDA — registrando venda por voz/texto")
        return _registrar_venda(mensagem, db)

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
        "Tenta mandar 'cardápio' pra ver os produtos, 'fiado' pra conferir sua conta "
        "ou 'vendi ...' pra anotar uma venda!"
    )
