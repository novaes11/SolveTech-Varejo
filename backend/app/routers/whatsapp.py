from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.services.ia_vendedora import processar_mensagem
from app.services.transcricao import (
    TAMANHO_MINIMO_TRANSCRICAO,
    ErroDownloadAudio,
    ErroTranscricao,
    ErroTranscricaoNaoConfigurada,
    processar_audio,
)
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp Webhook"])


class MensagemRecebida(BaseModel):
    telefone: str
    mensagem: str | None = None
    # Campos pra mensagem de áudio (nota de voz, arquivo de mídia etc.):
    # informe tipo="audio" e o áudio via URL ou base64. O formato ajuda a
    # nomear o temporário certo (ex.: "ogg", "m4a"); padrão é ogg, que é
    # como a voz do WhatsApp chega.
    tipo: Literal["texto", "audio"] = "texto"
    audio_url: str | None = None
    audio_base64: str | None = None
    audio_formato: str | None = None


class RespostaWebhook(BaseModel):
    telefone: str
    resposta: str
    transcricao: str | None = None  # preenchido só quando a mensagem foi um áudio


def _eh_mensagem_de_audio(payload: MensagemRecebida) -> bool:
    return payload.tipo == "audio" or bool(payload.audio_url or payload.audio_base64)


@router.get("/webhook")
def verificar_webhook(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
):
    """Endpoint de verificação que a Meta chama quando você cadastra o webhook."""
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Token de verificação inválido")


@router.post("/webhook", response_model=RespostaWebhook)
def receber_mensagem(payload: MensagemRecebida, db: Session = Depends(get_db)):
    """
    Recebe a mensagem do WhatsApp, joga pra IA vendedora processar
    e devolve a resposta prontinha pra mandar de volta pro cliente.

    Se a mensagem for um áudio, a gente transcreve primeiro e o texto
    segue o mesmo caminho de uma mensagem digitada.
    """
    if _eh_mensagem_de_audio(payload):
        return _receber_audio(payload, db)

    if not payload.mensagem or not payload.mensagem.strip():
        raise HTTPException(status_code=422, detail="Mensagem de texto vazia")

    resposta = processar_mensagem(
        telefone=payload.telefone,
        mensagem=payload.mensagem,
        db=db,
    )
    return RespostaWebhook(telefone=payload.telefone, resposta=resposta)


def _receber_audio(payload: MensagemRecebida, db: Session) -> RespostaWebhook:
    """Ramificação do áudio: transcreve e manda o texto pro fluxo normal."""
    logger.info(f"🎤 Mensagem de áudio recebida de {payload.telefone}")

    try:
        texto = processar_audio(
            audio_url=payload.audio_url,
            audio_base64=payload.audio_base64,
            formato=payload.audio_formato,
        )
    except ErroDownloadAudio:
        logger.warning(f"⬇️  Não foi possível obter o áudio de {payload.telefone}")
        return RespostaWebhook(
            telefone=payload.telefone,
            resposta="Não consegui baixar seu áudio. 😕 Tenta mandar de novo ou escreve por texto?",
        )
    except ErroTranscricaoNaoConfigurada:
        return RespostaWebhook(
            telefone=payload.telefone,
            resposta=(
                "Ainda não consigo ouvir áudios por aqui. 🙉 "
                "Me manda por texto que eu te respondo na hora!"
            ),
        )
    except ErroTranscricao:
        return RespostaWebhook(
            telefone=payload.telefone,
            resposta="Não consegui entender o áudio. 😅 Pode repetir ou mandar por texto?",
        )

    if len(texto) < TAMANHO_MINIMO_TRANSCRICAO:
        logger.info(f"🤏 Transcrição vazia/curta demais de {payload.telefone} — pedindo pra repetir")
        return RespostaWebhook(
            telefone=payload.telefone,
            resposta="Não consegui entender o áudio. 😅 Pode repetir falando um pouquinho mais alto?",
            transcricao=texto or None,
        )

    # Daqui pra frente é como se o cliente tivesse digitado a mensagem
    resposta = processar_mensagem(telefone=payload.telefone, mensagem=texto, db=db)
    return RespostaWebhook(telefone=payload.telefone, resposta=resposta, transcricao=texto)
