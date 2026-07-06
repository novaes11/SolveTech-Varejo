# 🛒 SolveTech Varejo

🌎 *[Leia em Português](README-pt.md)*

## 📖 Project Overview
**SolveTech Varejo** is an MVP (Minimum Viable Product) developed for small merchants, market vendors, and local shopkeepers. The goal is to help these entrepreneurs transition from paper notes to a simplified digital management system. The proposal is an easy-to-use web dashboard for inventory control, credit ledger (fiado), sales, expenses, reports, and a smart WhatsApp assistant.

## 💡 Value Proposition
Many small retailers have little familiarity with complex systems and end up relying on loose notes, leading to lost information, unpaid debts, and inventory mismanagement. SolveTech Varejo solves this problem by digitalizing common commerce tasks in an accessible way. With it, merchants know exactly what is in stock, who owes them money, their estimated profit, and they can even use voice/text commands to easily record transactions.

## ✨ Key Features
* **📊 Dashboard:** An overview with business metrics and indicators.
* **📦 Inventory Management:** Product control (quantity, price, cost, and tied-up capital), featuring registration, editing, deletion, and manual stock movements. It also includes barcode scanning via camera.
* **📒 Customer Ledger (Fiado):** Customer registration, record of credit purchases, partial payments, and automatic calculation of outstanding balances.
* **💰 Sales and Expenses:** Registration of cash or credit sales, and tracking of operational expenses.
* **🤖 WhatsApp Assistant (Artificial Intelligence):** A simulated chat interface within the system where merchants can send text or voice commands (e.g., "I sold 2 sodas to João"). The assistant interprets the message and updates the database automatically. The history of messages and actions is recorded.
* **📈 Reports:** Detailed screens for sales, expenses, credit ledger, and estimated profit.
* **🔒 Authentication and Security (Multi-user):** The system isolates data per user/merchant. Each merchant only has access to their own products, customers, sales, ledgers, expenses, and assistant events.

## 📱 System Screens
* **Dashboard:** Business summary with charts and quick access cards.
* **Inventory:** Table and complete product management, with barcode scanning options.
* **Ledger:** Customer management and outstanding balance tracking.
* **Assistant:** Interactive chat screen where voice or text commands automate data entry.
* **Reports:** Visualization of performance, cash inflows, and outflows.
* **Login/Registration:** Access control for merchants.

## 🛠️ Tools and Technologies
The project was built using modern JavaScript ecosystem tools and libraries:
* **⚛️ React and Vite:** The foundation of the frontend, ensuring a fast and responsive application during development.
* **🎨 Tailwind CSS:** For styling and modern design (working alongside Radix UI based components and lucide-react for icons).
* **☁️ Base44 and @base44/sdk:** A backend-as-a-service (BaaS) platform responsible for the real-time database, user authentication, and artificial intelligence (LLM) invocations that power the Assistant.
* **📊 Recharts:** Library used for rendering visual charts in the Dashboard and Reports.
* **📷 html5-qrcode:** Integration for camera usage in barcode scanning.
* **🧹 ESLint:** Linting tool to check source code quality and standards.

## 📂 Folder Structure
The codebase follows a modular organization:
* `base44/entities/`: Contains the schema definitions (.jsonc) for the database entities in Base44.
* `src/api/`: Configuration and Base44 SDK instances for connecting to the backend.
* `src/components/`: Reusable React components.
  * `ui/`: Generic basic UI components (buttons, inputs, dialogs).
  * `estoque/`: Modals and specific components to manage products.
  * `caderneta/`: Specific components for customers and credit ledgers.
* `src/pages/`: Represent the main routes and screens of the application (Dashboard, Inventory, Reports, etc.).
* `src/hooks/`: Custom hooks (e.g., loading state abstractions `useAsync`).
* `src/lib/` and `src/utils/`: Helper functions, data formatting (date, currency), and complementary logic.
* Root files (`vite.config.js`, `package.json`, `tailwind.config.js`, etc.): Responsible for configuring libraries and the project environment.

## 💾 Entities and Data
The database hosted on Base44 operates with the following main entities:
* **👤 User:** Represents the merchant's account in the system (data owner).
* **🏷️ Produto:** Information about what is sold (name, price, cost, quantity in stock, barcode).
* **🧑‍🤝‍🧑 Cliente:** Contact information and limits of registered consumers.
* **📦 MovimentacaoEstoque:** History of manual changes in inventory (inflow and outflow).
* **🛒 Venda:** Consolidation of a completed purchase (deducts stock, registers value, cost, and optionally links to a customer/ledger).
* **💳 MovimentacaoFiado:** History of debts generated (purchases) and amounts settled (payments) by a customer.
* **💸 Gasto:** Record of operational outflows from the store's cash register.
* **🤖 EventoAssistente:** Audit log that saves the history of commands sent by the user to the assistant and the response given by the AI.

## 🛡️ Security and Multi-user
All registered data (from Products to Assistant Events) is saved with isolation (Basic multi-tenancy tied to the authenticated user). This ensures that a logged-in merchant will not have access to or stumble upon another store's customers and cash flow.

## 🚀 MVP Status
The current project reflects a **Prototype / MVP (Minimum Viable Product)** in constant evolution. Several integrations that work in a demonstrative way on the dashboard (such as sending/receiving messages in a WhatsApp-like interface) pave the way for a future connection with the official WhatsApp APIs.

---

## ⚙️ How to Run the Project (Base44 Instructions)

Use this repository to run and edit the app locally, and then publish the changes through Base44. Any changes pushed to the repository will be reflected in the Base44 Builder.

### 📋 Prerequisites
1. Clone the repository using the project's Git URL.
2. Navigate to the project directory.
3. Install dependencies: `npm install`.
4. Install the Base44 CLI: `npm install -g base44@latest`.

See the [Base44 CLI docs](https://docs.base44.com/developers/references/cli/get-started/overview) if you want to run Base44 commands directly.

### 💻 Run Locally (Full Environment)
Start the full local environment from the root directory:
```bash
base44 dev
```
`base44 dev` starts the local development backend and (if configured) also spins up the frontend development server (Vite) on the port indicated in the terminal.

*(The automatic startup of the frontend via Base44 is tied to the existence of the `"serveCommand": "npm run dev"` command in the `base44/config.jsonc` file).*

### 🖥️ Run Only the Frontend
If you want to test only visual modifications of the frontend and test it pointing to the remotely hosted database, run:
```bash
npm run dev
```

### ☁️ Use the Hosted Backend
To ensure that `npm run dev` connects to the correct remote database, create or update the `.env.local` file in the root:
```bash
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
```
`VITE_BASE44_APP_ID` identifies your app in the ecosystem and `VITE_BASE44_APP_BASE_URL` tells the Vite Plugin where to process local requests (e.g., routing API calls).

*(Important: When you use `base44 dev`, it already injects provisional variables for your machine, making `.env.local` necessary mainly in the flow of running only the Frontend).*

### ✅ Build and Quality
* To inspect and fix issues in the React code: `npm run lint` or `npm run lint:fix`
* To check typing/files: `npm run typecheck`
* To generate the final frontend build (ready for Netlify, etc.): `npm run build`

### 📤 Publish Changes
After saving (commit/push) your changes in git, access the Base44 dashboard to update the remote platform:
```bash
base44 dashboard open
```

### 📚 Documentation & Support
- Using GitHub with Base44: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)
- CLI and Commands: [https://docs.base44.com/developers/references/cli/commands/introduction](https://docs.base44.com/developers/references/cli/commands/introduction)
- General Support: [https://app.base44.com/support](https://app.base44.com/support)
