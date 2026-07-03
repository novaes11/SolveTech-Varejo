# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Sobre o projeto

MVP de gestão para varejo popular (feirantes e pequenos comerciantes) com três módulos: controle de estoque, caderneta de fiado digital e uma IA vendedora via webhook do WhatsApp. Código, comentários, logs e mensagens são escritos em **português brasileiro** — mantenha esse padrão.

## Comandos

### Backend (FastAPI) — rodar a partir de `backend/`

```powershell
python -m venv venv                # primeira vez
.\venv\Scripts\Activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- Swagger em http://localhost:8000/docs
- O banco SQLite (`backend/solvetech.db`) e a pasta `backend/uploads/` são criados automaticamente no startup (`Base.metadata.create_all`). Não há migrações (sem Alembic) — mudanças de schema exigem recriar o banco ou migrar manualmente.

### Frontend (React + Vite) — rodar a partir de `frontend/`

```powershell
npm install
npm run dev        # dev server em http://localhost:5173
npm run build      # build de produção
npm run lint       # ESLint
```

O frontend depende do backend rodando na porta 8000 (URL hardcoded em `frontend/src/services/api.js`).

### Testes

Não há suíte de testes configurada (nem backend nem frontend).

## Arquitetura

Dois apps independentes no mesmo repositório, sem monorepo tooling:

- **`backend/`** — API FastAPI + SQLAlchemy + SQLite. Fluxo em camadas: `routers/` (endpoints) → `models/` (ORM) validados por `schemas/` (Pydantic v2). Configuração via `app/config.py` (pydantic-settings, lê `backend/.env` opcional).
- **`frontend/`** — SPA React 19 (Vite, Tailwind 3, React Router 7). Páginas em `src/pages/` (Dashboard, Estoque, Caderneta) dentro de um `Layout` com sidebar. **Todas** as chamadas HTTP passam por `src/services/api.js` (Axios) — adicione novas chamadas lá, não crie instâncias de Axios nas páginas.

### Domínio do fiado (regra central do negócio)

O saldo devedor **não é armazenado** — é sempre calculado dinamicamente somando movimentações `compra` e subtraindo `pagamento` (função `_calcular_saldo`, duplicada em `routers/fiado.py` e `services/ia_vendedora.py`). Ao registrar uma compra, o backend valida o limite de fiado do cliente (`limite_fiado`) e rejeita com 400 se estourar. O cliente é identificado unicamente pelo **telefone**.

### IA vendedora (mock intencional)

`app/services/ia_vendedora.py` é um mock por palavras-chave ("cardápio", "fiado") que consulta o banco real. O ponto de troca por um LLM de verdade é a função `processar_mensagem(telefone, mensagem, db) -> str` — o webhook em `routers/whatsapp.py` só delega para ela. O POST do webhook aceita um payload simplificado (`{telefone, mensagem}` para texto; `tipo: "audio"` + `audio_url`/`audio_base64` para voz), não o formato real da Meta; o GET implementa a verificação padrão da Meta com `WHATSAPP_VERIFY_TOKEN`.

### Transcrição de áudio

`app/services/transcricao.py` transcreve áudios do WhatsApp em pt-BR via OpenAI (`whisper-1`, configurável). Pipeline em `processar_audio()`: baixa (URL ou base64) → converte com FFmpeg só se o formato não for aceito pela OpenAI (`.ogg` do WhatsApp é aceito direto) → transcreve → apaga temporários. Erros viram exceções (`ErroDownloadAudio`, `ErroTranscricao`, `ErroTranscricaoNaoConfigurada`) que o webhook converte em respostas amigáveis — áudio nunca derruba o bot. O texto transcrito entra no mesmo `processar_mensagem` do fluxo de texto. Requer `OPENAI_API_KEY` no `.env`.

### Logging

Use `get_logger(__name__)` de `app/utils/logger.py` (logger colorido ANSI com emojis) em vez de `logging` direto ou `print`. Há um middleware em `app/main.py` que já loga toda requisição com status e duração.

## Convenções

- Nomes de rotas, models, schemas e variáveis em português (`Produto`, `Cliente`, `criar_produto`, `saldo_devedor`).
- Endpoints REST retornam schemas Pydantic (`response_model`); erros de negócio usam `HTTPException` com `detail` em português.
- O README.md documenta todos os endpoints e o setup — mantenha-o atualizado ao adicionar rotas.
