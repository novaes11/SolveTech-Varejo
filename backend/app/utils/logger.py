import logging
import sys


# Essa classe toda só existe pra injetar os códigos ANSI de cor no log.
# O esquema é: cada nível de log ganha uma cor, aí quando tu bate o olho no
# terminal já sabe se tá tudo certo (verde), se tem algo suspeito (amarelo)
# ou se explodiu tudo (vermelho). Simples e eficiente.
CORES = {
    "DEBUG": "\033[96m",      # ciano — pra debug verbose, coisa de dev curioso
    "INFO": "\033[92m",       # verde — tudo fluindo, vida boa
    "WARNING": "\033[93m",    # amarelo — atenção, algo merece um olhar
    "ERROR": "\033[91m",      # vermelho — deu ruim, vai conferir
    "CRITICAL": "\033[1;91m", # vermelho bold — caos total, chama o bombeiro
}
RESET = "\033[0m"
CINZA = "\033[90m"
BRANCO = "\033[97m"
NEGRITO = "\033[1m"


class SolveTechFormatter(logging.Formatter):
    """
    Formatter customizado que transforma o log sem graça do Python num painel
    colorido de respeito. Cada linha mostra: hora | nível | módulo | mensagem,
    tudo com as cores certinhas pra tu não perder nada no terminal.
    """

    FORMATO = (
        "{cinza}%(asctime)s{reset} "
        "{cor_nivel}{negrito}%(levelname)-8s{reset} "
        "{cinza}│{reset} "
        "{branco}%(name)-25s{reset} "
        "{cinza}│{reset} "
        "%(message)s"
    )

    def format(self, record: logging.LogRecord) -> str:
        cor = CORES.get(record.levelname, RESET)

        fmt = self.FORMATO.format(
            cinza=CINZA,
            reset=RESET,
            cor_nivel=cor,
            negrito=NEGRITO,
            branco=BRANCO,
        )

        formatter = logging.Formatter(fmt, datefmt="%H:%M:%S")
        return formatter.format(record)


def get_logger(nome: str, nivel: int = logging.DEBUG) -> logging.Logger:
    """
    Fábrica de loggers. Chama get_logger(__name__) em qualquer módulo
    e ele já vem configurado com as cores e saída pro terminal.
    O truque do hasHandlers() é pra não duplicar handler se o módulo
    for importado mais de uma vez (Uvicorn adora fazer isso).
    """
    logger = logging.getLogger(nome)
    logger.setLevel(nivel)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(nivel)
        handler.setFormatter(SolveTechFormatter())
        logger.addHandler(handler)

    logger.propagate = False
    return logger


def configurar_loggers_externos():
    """
    Aqui a gente amansa os loggers do Uvicorn e do SQLAlchemy pra eles
    usarem o nosso formatter bonito em vez do padrãozão sem graça.
    De quebra, sobe o nível do SQLAlchemy pra WARNING pra não poluir
    o terminal com cada SELECT que o ORM faz.
    """
    formatter = SolveTechFormatter()

    for nome_logger in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        logger_ext = logging.getLogger(nome_logger)
        logger_ext.handlers.clear()
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(formatter)
        logger_ext.addHandler(handler)
        logger_ext.propagate = False

    # SQLAlchemy é verboso demais no DEBUG, só queremos saber dos WARNINGs
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
