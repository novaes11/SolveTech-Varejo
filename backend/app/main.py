import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.models import Produto, Cliente, Fiado  # noqa: F401 — garante que os models são registrados
from app.routers import estoque, fiado, whatsapp
from app.utils.logger import get_logger, configurar_loggers_externos

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configurar_loggers_externos()
    logger.info("🔧 Criando tabelas no banco (se não existirem)...")
    Base.metadata.create_all(bind=engine)
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} no ar!")
    logger.info(f"📂 Uploads em: {settings.UPLOAD_DIR}")
    logger.info("📄 Swagger disponível em: http://localhost:8000/docs")
    yield
    logger.info("👋 Servidor desligando... até a próxima!")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "API do SolveTech Varejo — sistema pra feirante que quer "
        "controlar estoque, fiado e vender pelo WhatsApp com IA. 🚀"
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requisicoes(request: Request, call_next):
    inicio = time.perf_counter()
    response = await call_next(request)
    duracao_ms = (time.perf_counter() - inicio) * 1000

    status = response.status_code
    metodo = request.method
    rota = request.url.path

    # Colore o status code conforme a faixa — bater o olho e já saber se deu bom ou ruim
    if status < 300:
        logger.info(f"✅ {metodo} {rota} → {status} ({duracao_ms:.1f}ms)")
    elif status < 400:
        logger.info(f"↪️  {metodo} {rota} → {status} ({duracao_ms:.1f}ms)")
    elif status < 500:
        logger.warning(f"⚠️  {metodo} {rota} → {status} ({duracao_ms:.1f}ms)")
    else:
        logger.error(f"💥 {metodo} {rota} → {status} ({duracao_ms:.1f}ms)")

    return response


app.include_router(estoque.router)
app.include_router(fiado.router)
app.include_router(whatsapp.router)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "online", "app": settings.APP_NAME, "version": settings.APP_VERSION}
