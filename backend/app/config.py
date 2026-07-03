from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    APP_NAME: str = "SolveTech Varejo"
    APP_VERSION: str = "0.1.0"
    DATABASE_URL: str = f"sqlite:///{Path(__file__).resolve().parent.parent / 'solvetech.db'}"
    UPLOAD_DIR: str = str(Path(__file__).resolve().parent.parent / "uploads")

    # O token do WhatsApp vai vir de variável de ambiente quando integrar de verdade
    WHATSAPP_VERIFY_TOKEN: str = "solvetech-verify-token"

    # Transcrição de áudio (OpenAI) — sem a chave no .env, áudio responde
    # com mensagem amigável avisando que o recurso não está habilitado
    OPENAI_API_KEY: str = ""
    TRANSCRICAO_MODELO: str = "whisper-1"

    class Config:
        env_file = ".env"


settings = Settings()
