from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.services.ia_vendedora import processar_mensagem

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp Webhook"])


class MensagemRecebida(BaseModel):
    telefone: str
    mensagem: str


class RespostaWebhook(BaseModel):
    telefone: str
    resposta: str


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
    """
    resposta = processar_mensagem(
        telefone=payload.telefone,
        mensagem=payload.mensagem,
        db=db,
    )
    return RespostaWebhook(telefone=payload.telefone, resposta=resposta)
