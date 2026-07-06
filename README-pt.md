# 🛒 SolveTech Varejo

🌎 *[Read this in English](README.md)*

## 📖 Visão Geral do Projeto
O **SolveTech Varejo** é um MVP (Produto Mínimo Viável) desenvolvido para pequenos comerciantes, feirantes e lojistas populares. O objetivo é ajudar esses empreendedores a saírem das anotações em papel e cadernos, oferecendo uma gestão digital simplificada. A proposta é um painel web fácil de usar para controle de estoque, caderneta de fiado, vendas, gastos, relatórios e um assistente inteligente via WhatsApp.

## 💡 Proposta de Valor
Muitos pequenos lojistas têm pouca familiaridade com sistemas complexos e acabam dependendo de anotações soltas, o que gera perda de informações, calotes no fiado e descontrole do estoque. O SolveTech Varejo resolve esse problema digitalizando as tarefas comuns do comércio de forma acessível. Com ele, o comerciante sabe exatamente o que tem em estoque, quem está devendo, qual é o lucro estimado e pode até usar o microfone/texto para registrar movimentações de forma simples.

## ✨ Funcionalidades Principais
* **📊 Dashboard:** Visão geral com métricas e indicadores do negócio.
* **📦 Gestão de Estoque:** Controle de produtos (quantidade, preço, custo e valor parado em estoque), com cadastro, edição, exclusão e movimentações manuais. Conta também com leitura de código de barras pela câmera.
* **📒 Caderneta de Clientes (Fiado):** Cadastro de clientes, registro de compras fiadas, pagamentos parciais e cálculo automático do saldo devedor.
* **💰 Vendas e Gastos:** Registro de vendas à vista ou a prazo, e acompanhamento de gastos operacionais.
* **🤖 Assistente WhatsApp (Inteligência Artificial):** Interface de chat simulada no sistema onde o lojista pode enviar comandos de texto ou áudio (ex: "vendi 2 refrigerantes para o João"). O assistente interpreta a mensagem e atualiza o banco de dados automaticamente. O histórico de mensagens e ações fica registrado.
* **📈 Relatórios:** Telas detalhadas de vendas, gastos, fiado e lucro estimado.
* **🔒 Autenticação e Segurança (Multiusuário):** O sistema isola os dados por usuário/lojista. Cada lojista tem acesso apenas aos seus produtos, clientes, vendas, fiados, gastos e eventos do assistente.

## 📱 Telas do Sistema
* **Dashboard:** Resumo do negócio com gráficos e cards de acesso rápido.
* **Estoque:** Tabela e gerenciamento completo dos produtos, com opção de bipar código de barras.
* **Caderneta:** Gestão de clientes e saldo devedor (fiado).
* **Assistente:** Tela de chat interativo onde comandos de voz ou texto automatizam registros.
* **Relatórios:** Visualização de desempenho, entradas e saídas.
* **Login/Registro:** Controle de acesso dos lojistas ao sistema.

## 🛠️ Ferramentas e Tecnologias
O projeto foi construído utilizando ferramentas e bibliotecas modernas do ecossistema JavaScript:
* **⚛️ React e Vite:** Base do frontend, garantindo uma aplicação rápida e responsiva durante o desenvolvimento.
* **🎨 Tailwind CSS:** Para estilização e design moderno (trabalhando em conjunto com componentes baseados no Radix UI e lucide-react para ícones).
* **☁️ Base44 e @base44/sdk:** Plataforma de backend (BaaS) responsável pelo banco de dados em tempo real, autenticação de usuários e invocações de inteligência artificial (LLM) que dão vida ao Assistente.
* **📊 Recharts:** Biblioteca utilizada para a renderização de gráficos visuais no Dashboard e Relatórios.
* **📷 html5-qrcode:** Integração para uso da câmera em leituras de código de barras.
* **🧹 ESLint:** Ferramenta de linting para checar a qualidade e o padrão do código fonte.

## 📂 Estrutura de Pastas
A base de código segue uma organização modular:
* `base44/entities/`: Contém as definições de schema (.jsonc) das entidades do banco de dados no Base44.
* `src/api/`: Configuração e instâncias do SDK do Base44 para realizar conexões com o backend.
* `src/components/`: Componentes React reutilizáveis.
  * `ui/`: Componentes básicos de interface genéricos (botões, inputs, dialogs).
  * `estoque/`: Modais e componentes específicos para gerenciar produtos.
  * `caderneta/`: Componentes específicos para clientes e fiado.
* `src/pages/`: Representam as rotas e telas principais da aplicação (Dashboard, Estoque, Relatórios, etc).
* `src/hooks/`: Hooks customizados (ex: abstração de estados de carregamento `useAsync`).
* `src/lib/` e `src/utils/`: Funções auxiliares, formatação de dados (data, moeda) e lógicas complementares.
* Arquivos na raiz (`vite.config.js`, `package.json`, `tailwind.config.js`, etc.): Responsáveis pela configuração das bibliotecas e ambiente do projeto.

## 💾 Entidades e Dados
O banco de dados hospedado no Base44 opera com as seguintes entidades principais:
* **👤 User:** Representa a conta do lojista no sistema (dono dos dados).
* **🏷️ Produto:** Informações do que é vendido (nome, preço, custo, quantidade em estoque, código de barras).
* **🧑‍🤝‍🧑 Cliente:** Informações de contato e limites dos consumidores cadastrados.
* **📦 MovimentacaoEstoque:** Histórico de alterações manuais no estoque (entrada e saída).
* **🛒 Venda:** Consolidação de uma compra finalizada (abate do estoque, registra valor, custo e possível ligação a um cliente/fiado).
* **💳 MovimentacaoFiado:** Histórico de dívidas geradas (compras) e valores quitados (pagamentos) por um cliente.
* **💸 Gasto:** Registro de saídas operacionais do caixa da loja.
* **🤖 EventoAssistente:** Log de auditoria que salva o histórico de comandos que o usuário enviou ao assistente e a resposta dada pela Inteligência Artificial.

## 🛡️ Segurança e Multiusuário
Todos os dados cadastrados (desde Produtos até Eventos do Assistente) são salvos com isolamento (Multitenancy básico amarrado ao usuário autenticado). Isso garante que um lojista logado não terá acesso e nem esbarrará nos clientes e no caixa de outra loja.

## 🚀 Status do MVP
O projeto atual reflete um **Protótipo / MVP (Produto Mínimo Viável)** em constante evolução. Diversas integrações que funcionam de modo demonstrativo no painel (como o envio/recebimento de mensagens em uma interface parecida com WhatsApp) preparam o terreno para uma futura conexão com as APIs oficiais do próprio WhatsApp.

---

## ⚙️ Como Rodar o Projeto (Instruções Base44)

Use este repositório para rodar e editar o app localmente, e depois publique as mudanças através do Base44. Qualquer mudança enviada ao repositório será refletida no Base44 Builder.

### 📋 Pré-requisitos
1. Clone o repositório usando a URL do Git do projeto.
2. Navegue até o diretório do projeto.
3. Instale as dependências: `npm install`.
4. Instale o CLI do Base44: `npm install -g base44@latest`.

Veja a [documentação do CLI do Base44](https://docs.base44.com/developers/references/cli/get-started/overview) se você quiser rodar os comandos do Base44 diretamente.

### 💻 Rodar Localmente (Ambiente Completo)
Inicie o ambiente local completo pelo diretório raiz:
```bash
base44 dev
```
O `base44 dev` inicia o backend de desenvolvimento local e (se configurado) também sobe o servidor de desenvolvimento do frontend (Vite) na porta indicada no terminal. 

*(A inicialização automática do frontend via Base44 está atrelada à existência do comando `"serveCommand": "npm run dev"` no arquivo `base44/config.jsonc`).*

### 🖥️ Rodar Apenas o Frontend
Se você deseja testar apenas modificações visuais do frontend e testá-lo apontando para a base de dados hospedada remotamente, rode:
```bash
npm run dev
```

### ☁️ Usar o Backend Hospedado
Para garantir que o `npm run dev` se conecte ao banco remoto correto, crie ou atualize o arquivo `.env.local` na raiz:
```bash
VITE_BASE44_APP_ID=seu_app_id
VITE_BASE44_APP_BASE_URL=https://seu-app.base44.app
```
O `VITE_BASE44_APP_ID` identifica seu app no ecossistema e o `VITE_BASE44_APP_BASE_URL` informa ao Vite Plugin onde processar requisições locais (ex: roteamento das chamadas da API).

*(Importante: Quando você utiliza `base44 dev`, ele já injeta variáveis provisórias para a sua máquina, tornando o `.env.local` necessário principalmente no fluxo de rodar só o Frontend).*

### ✅ Build e Qualidade
* Para inspecionar e corrigir problemas no código React: `npm run lint` ou `npm run lint:fix`
* Para checar tipagem/arquivos: `npm run typecheck`
* Para gerar a pasta definitiva do frontend (pronto para Netlify, etc.): `npm run build`

### 📤 Publicar Alterações
Após salvar (commit/push) as alterações no git, acesse o painel do Base44 para atualizar a plataforma remota:
```bash
base44 dashboard open
```

### 📚 Documentação & Suporte
- Usando GitHub com Base44: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)
- CLI e Comandos: [https://docs.base44.com/developers/references/cli/commands/introduction](https://docs.base44.com/developers/references/cli/commands/introduction)
- Suporte Geral: [https://app.base44.com/support](https://app.base44.com/support)
