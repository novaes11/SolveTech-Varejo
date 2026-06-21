# 🏪 SolveTech Varejo

Sistema de gestão para varejo popular — feito sob medida para feirantes, vendedores de barraquinha e pequenos comerciantes. O diferencial é uma **IA vendedora integrada ao WhatsApp** que gerencia estoque, atende clientes e controla a caderneta de fiado, tudo de forma simples e acessível.

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#-arquitetura)
- [Tech Stack](#-tech-stack)
- [Pré-requisitos](#-pré-requisitos)
- [Como Rodar](#-como-rodar)
  - [Backend (FastAPI)](#1-backend-fastapi)
  - [Frontend (React)](#2-frontend-react)
- [Endpoints da API](#-endpoints-da-api)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)

---

## 🎯 Visão Geral

O SolveTech Varejo é um MVP que resolve três dores do pequeno comerciante:

1. **Controle de Estoque** — saber o que tem, quanto custa e quando repor.
2. **Caderneta Digital (Fiado)** — acabou a caderneta de papel. Aqui o limite é controlado, o saldo é calculado automaticamente e o histórico fica salvo.
3. **IA Vendedora no WhatsApp** — um chatbot (mock por enquanto) que recebe mensagens, consulta o estoque e o fiado do cliente, e responde de forma inteligente.

---

## ✨ Funcionalidades

| Módulo | Descrição |
|--------|-----------|
| **Estoque** | CRUD completo de produtos (nome, preço, quantidade, foto) |
| **Caderneta** | Cadastro de clientes, limite de fiado, saldo devedor dinâmico, histórico de movimentações |
| **Webhook WhatsApp** | Endpoint para receber/verificar webhooks da Meta (GET + POST) |
| **IA Vendedora** | Serviço mock que reconhece intenções ("cardápio", "fiado") e responde com dados reais do banco |
| **Painel Admin** | Dashboard com gráficos, tela de estoque com busca e CRUD, caderneta com master-detail |
| **Logging Colorido** | Logger customizado com cores ANSI para monitorar requisições, banco e IA no terminal |

---

## 🏗 Arquitetura

```
┌──────────────────────┐     HTTP      ┌──────────────────────┐
│                      │ ◄──────────── │                      │
│   Frontend (React)   │               │   WhatsApp (Meta)    │
│   localhost:5173      │               │   Webhook            │
│                      │               │                      │
└──────────┬───────────┘               └──────────┬───────────┘
           │ Axios                                │ POST
           ▼                                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│                    localhost:8000                            │
│                                                             │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌────────────┐  │
│  │ Estoque │  │  Fiado   │  │ WhatsApp  │  │ IA Vendedora│  │
│  │ Router  │  │  Router  │  │  Router   │  │  Service    │  │
│  └────┬────┘  └────┬─────┘  └─────┬─────┘  └──────┬─────┘  │
│       │            │              │               │         │
│       └────────────┴──────────────┴───────────────┘         │
│                           │                                 │
│                    SQLAlchemy ORM                            │
│                           │                                 │
│                    ┌──────┴──────┐                           │
│                    │   SQLite    │                           │
│                    │ solvetech.db│                           │
│                    └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

### Backend
| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Python | 3.11+ | Linguagem principal |
| FastAPI | 0.115.6 | Framework web assíncrono |
| Uvicorn | 0.32.1 | Servidor ASGI |
| SQLAlchemy | 2.0.36 | ORM para banco de dados |
| Pydantic | 2.10.3 | Validação de dados e schemas |
| SQLite | — | Banco de dados (embutido) |

### Frontend
| Tecnologia | Propósito |
|------------|-----------|
| React 19 | UI declarativa |
| Vite | Build tool e dev server |
| Tailwind CSS 3 | Estilização utility-first |
| React Router DOM | Roteamento SPA |
| Axios | Requisições HTTP |
| Recharts | Gráficos e visualização |
| Lucide React | Biblioteca de ícones |

---

## 📦 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Python 3.11+** → [python.org/downloads](https://www.python.org/downloads/)
- **Node.js 18+** → [nodejs.org](https://nodejs.org/)
- **Git** → [git-scm.com](https://git-scm.com/)

Verifique se está tudo certo:

```powershell
python --version   # Python 3.11.x ou superior
node --version     # v18.x ou superior
npm --version      # 9.x ou superior
```

---

## 🚀 Como Rodar

### 1. Backend (FastAPI)

Abra um terminal na **raiz do projeto** e execute:

```powershell
# Entrar na pasta do backend
cd backend

# Criar o ambiente virtual
python -m venv venv

# Ativar o ambiente virtual (Windows PowerShell)
.\venv\Scripts\Activate

# Instalar as dependências
pip install -r requirements.txt

# Subir o servidor FastAPI
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Você verá algo assim no terminal (com cores!):

```
20:30:01 INFO     │ app.main                  │ 🔧 Criando tabelas no banco (se não existirem)...
20:30:01 INFO     │ app.main                  │ 🚀 SolveTech Varejo v0.1.0 no ar!
20:30:01 INFO     │ app.main                  │ 📄 Swagger disponível em: http://localhost:8000/docs
```

**Acessos do backend:**

| URL | Descrição |
|-----|-----------|
| http://localhost:8000 | Health check |
| http://localhost:8000/docs | Swagger UI (documentação interativa) |
| http://localhost:8000/redoc | ReDoc (documentação alternativa) |

> 💡 O banco SQLite (`solvetech.db`) e a pasta `uploads/` são criados automaticamente na primeira execução.

---

### 2. Frontend (React)

Abra **outro terminal** na raiz do projeto e execute:

```powershell
# Entrar na pasta do frontend
cd frontend

# Instalar as dependências
npm install

# Subir o servidor de desenvolvimento
npm run dev
```

O Vite vai iniciar e mostrar:

```
  VITE v8.x.x  ready in Xms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

**Acesse o painel em:** http://localhost:5173

> ⚠️ **Importante:** O backend precisa estar rodando na porta 8000 para que o frontend consiga buscar os dados. Rode os dois servidores simultaneamente em terminais separados.

---

### Resumo Rápido (dois terminais)

**Terminal 1 — Backend:**
```powershell
cd backend
.\venv\Scripts\Activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
```

---

## 📡 Endpoints da API

### Estoque (`/api/estoque`)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/estoque/` | Listar todos os produtos |
| `GET` | `/api/estoque/{id}` | Buscar produto por ID |
| `POST` | `/api/estoque/` | Cadastrar novo produto |
| `PATCH` | `/api/estoque/{id}` | Atualizar produto (parcial) |
| `DELETE` | `/api/estoque/{id}` | Remover produto |

### Caderneta / Fiado (`/api/fiado`)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/fiado/clientes` | Listar todos os clientes |
| `GET` | `/api/fiado/clientes/{id}` | Buscar cliente com saldo e histórico |
| `POST` | `/api/fiado/clientes` | Cadastrar novo cliente |
| `PATCH` | `/api/fiado/clientes/{id}` | Atualizar cliente |
| `DELETE` | `/api/fiado/clientes/{id}` | Remover cliente |
| `GET` | `/api/fiado/movimentacoes/{cliente_id}` | Histórico de movimentações |
| `POST` | `/api/fiado/movimentacoes` | Registrar compra ou pagamento |

### WhatsApp Webhook (`/api/whatsapp`)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/whatsapp/webhook` | Verificação do webhook (Meta) |
| `POST` | `/api/whatsapp/webhook` | Receber mensagem e processar com IA |

---

## 📁 Estrutura de Pastas

```
SolveTech-Varejo/
├── README.md
├── .gitignore
│
├── backend/
│   ├── requirements.txt
│   ├── solvetech.db              ← Criado automaticamente
│   ├── uploads/                  ← Criado automaticamente
│   └── app/
│       ├── main.py               ← Entrypoint FastAPI
│       ├── config.py             ← Configurações (pydantic-settings)
│       ├── database.py           ← Engine SQLite + sessão
│       ├── models/
│       │   ├── estoque.py        ← Model Produto
│       │   └── fiado.py          ← Models Cliente + Fiado
│       ├── schemas/
│       │   ├── estoque.py        ← Schemas Pydantic de produto
│       │   └── fiado.py          ← Schemas de cliente e fiado
│       ├── routers/
│       │   ├── estoque.py        ← CRUD de produtos
│       │   ├── fiado.py          ← CRUD de clientes + movimentações
│       │   └── whatsapp.py       ← Webhook WhatsApp
│       ├── services/
│       │   └── ia_vendedora.py   ← IA mock (reconhece intenções)
│       └── utils/
│           └── logger.py         ← Logger colorido ANSI
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx              ← Entry point React
        ├── App.jsx               ← Rotas da aplicação
        ├── index.css             ← Tailwind + estilos globais
        ├── assets/
        ├── components/
        │   ├── Layout.jsx        ← Sidebar + Topbar + Content
        │   └── Sidebar.jsx       ← Navegação com ícones Lucide
        ├── pages/
        │   ├── Dashboard.jsx     ← Cards de resumo + gráfico
        │   ├── Estoque.jsx       ← Tabela de produtos + CRUD
        │   └── Caderneta.jsx     ← Clientes + detalhes de fiado
        └── services/
            └── api.js            ← Axios → FastAPI
```

---

## ⚙️ Variáveis de Ambiente

O backend suporta configuração via arquivo `.env` na pasta `backend/`. Variáveis disponíveis:

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `DATABASE_URL` | `sqlite:///solvetech.db` | URL de conexão do banco |
| `WHATSAPP_VERIFY_TOKEN` | `solvetech-verify-token` | Token de verificação do webhook da Meta |

Exemplo de arquivo `backend/.env`:

```env
WHATSAPP_VERIFY_TOKEN=meu-token-secreto
```

---

## 📄 Licença

Este projeto é um MVP educacional / protótipo. Licença a ser definida.

---

<p align="center">
  Feito com 💚 para o pequeno comerciante brasileiro
</p>