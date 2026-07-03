"""
Serviço de transcrição de áudio — pega o áudio que o cliente mandou no
WhatsApp e transforma em texto pt-BR usando a API de transcrição da OpenAI.

O fluxo é: baixar (URL ou base64) → converter se o formato não for aceito →
transcrever → limpar os arquivos temporários. Quem orquestra tudo é a
função processar_audio(); o webhook só chama ela e trata os erros.
"""
import base64
import binascii
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import httpx
from openai import OpenAI

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Formatos que a API de transcrição da OpenAI aceita direto, sem conversão.
# Áudio de voz do WhatsApp chega como .ogg (codec opus), que já tá na lista.
FORMATOS_ACEITOS = {".flac", ".m4a", ".mp3", ".mp4", ".mpeg", ".mpga", ".oga", ".ogg", ".wav", ".webm"}

# Transcrição com menos caracteres que isso é ruído, não frase
TAMANHO_MINIMO_TRANSCRICAO = 2


class ErroDownloadAudio(Exception):
    """Não conseguimos obter o arquivo de áudio da mensagem."""


class ErroTranscricao(Exception):
    """O áudio chegou, mas a transcrição falhou."""


class ErroTranscricaoNaoConfigurada(ErroTranscricao):
    """Falta a OPENAI_API_KEY — o recurso de áudio não está habilitado."""


def baixar_audio(
    audio_url: str | None = None,
    audio_base64: str | None = None,
    formato: str | None = None,
) -> Path:
    """
    Materializa o áudio da mensagem num arquivo temporário e devolve o caminho.
    Aceita URL (fluxo real da Meta, depois de resolver o media ID) ou base64
    (útil pra testes e integrações mock).
    """
    sufixo = f".{(formato or 'ogg').lstrip('.').lower()}"
    fd, caminho_str = tempfile.mkstemp(prefix="wpp_audio_", suffix=sufixo)
    caminho = Path(caminho_str)

    try:
        if audio_base64:
            try:
                dados = base64.b64decode(audio_base64, validate=True)
            except (binascii.Error, ValueError) as exc:
                raise ErroDownloadAudio("audio_base64 inválido") from exc
        elif audio_url:
            logger.info("⬇️  Baixando áudio da mensagem...")
            try:
                resposta = httpx.get(audio_url, timeout=30, follow_redirects=True)
                resposta.raise_for_status()
            except httpx.HTTPError as exc:
                raise ErroDownloadAudio(f"Falha ao baixar áudio: {exc}") from exc
            dados = resposta.content
        else:
            raise ErroDownloadAudio("Mensagem de áudio sem audio_url nem audio_base64")

        if not dados:
            raise ErroDownloadAudio("Arquivo de áudio veio vazio")

        os.write(fd, dados)
    except Exception:
        os.close(fd)
        caminho.unlink(missing_ok=True)
        raise
    else:
        os.close(fd)

    logger.debug(f"🎧 Áudio salvo em temporário ({len(dados)} bytes, {sufixo})")
    return caminho


def converter_audio_se_necessario(caminho: Path) -> Path:
    """
    Se o formato já é aceito pela OpenAI, devolve o próprio arquivo.
    Senão, converte pra .mp3 com FFmpeg. Sem FFmpeg instalado, a gente
    tenta a sorte com o arquivo original mesmo — melhor do que desistir.
    """
    if caminho.suffix.lower() in FORMATOS_ACEITOS:
        return caminho

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        logger.warning(
            f"🔧 FFmpeg não encontrado — enviando '{caminho.suffix}' sem converter (pode falhar)"
        )
        return caminho

    destino = caminho.with_suffix(".mp3")
    logger.info(f"🔄 Convertendo áudio {caminho.suffix} → .mp3 com FFmpeg...")
    resultado = subprocess.run(
        [ffmpeg, "-y", "-i", str(caminho), str(destino)],
        capture_output=True,
        timeout=60,
    )
    if resultado.returncode != 0 or not destino.exists():
        logger.error(f"💥 FFmpeg falhou (código {resultado.returncode})")
        raise ErroTranscricao("Falha ao converter o áudio")
    return destino


def transcrever_audio(caminho: Path) -> str:
    """Manda o arquivo pra API da OpenAI e devolve só o texto, em pt-BR."""
    if not settings.OPENAI_API_KEY:
        logger.error("🔑 OPENAI_API_KEY não configurada — transcrição de áudio desabilitada")
        raise ErroTranscricaoNaoConfigurada()

    cliente = OpenAI(api_key=settings.OPENAI_API_KEY)
    try:
        with caminho.open("rb") as arquivo:
            resultado = cliente.audio.transcriptions.create(
                model=settings.TRANSCRICAO_MODELO,
                file=arquivo,
                language="pt",
            )
    except Exception as exc:
        logger.error(f"💥 Erro na API de transcrição: {type(exc).__name__}")
        raise ErroTranscricao("Falha ao transcrever o áudio") from exc

    texto = (resultado.text or "").strip()
    # Loga só o tamanho — o conteúdo da mensagem do cliente não vai pro log
    logger.info(f"📝 Transcrição concluída ({len(texto)} caracteres)")
    return texto


def limpar_temporarios(*caminhos: Path | None) -> None:
    """Apaga os arquivos temporários do áudio, sem drama se algum já sumiu."""
    for caminho in caminhos:
        if caminho is not None:
            caminho.unlink(missing_ok=True)


def processar_audio(
    audio_url: str | None = None,
    audio_base64: str | None = None,
    formato: str | None = None,
) -> str:
    """
    Pipeline completo: baixa, converte se precisar, transcreve e limpa tudo.
    Devolve o texto transcrito; levanta ErroDownloadAudio ou ErroTranscricao
    pra quem chamou decidir a resposta amigável.
    """
    caminho = baixar_audio(audio_url=audio_url, audio_base64=audio_base64, formato=formato)
    convertido = None
    try:
        convertido = converter_audio_se_necessario(caminho)
        return transcrever_audio(convertido)
    finally:
        limpar_temporarios(caminho, convertido if convertido != caminho else None)
