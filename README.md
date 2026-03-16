<div align="center">

<img src="frontend/public/xpay-logo.png" alt="XPAY CRM" width="180" />

# XPAY CRM

**Plataforma SaaS de CRM completa para equipes de vendas e atendimento no Brasil**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/Licença-MIT-green?style=flat-square)](LICENSE)

[Funcionalidades](#-funcionalidades) · [Stack](#-stack) · [Instalação](#-instalação) · [API](#-api-endpoints) · [Webhooks](#-webhooks) · [Screenshots](#-screenshots)

</div>

---

## 🚀 O que é o XPAY CRM?

O XPAY CRM é uma plataforma **full-stack multi-tenant** desenvolvida para PMEs brasileiras que precisam gerenciar vendas, atendimento via WhatsApp e logística em um único lugar — sem pagar por 4 ferramentas separadas.

### Problemas que resolve

| Antes | Com XPAY CRM |
|---|---|
| Pipeline de vendas no Excel | Kanban visual com drag & drop |
| WhatsApp manual sem histórico | Inbox unificado com filas e departamentos |
| Follow-up esquecido | Automações visuais com gatilhos |
| Rastreio de pedidos em outro sistema | Rastreio integrado (Correios, Jadlog, Loggi...) |
| Zero visibilidade sobre o funil | Dashboard com KPIs e gráficos em tempo real |

---

## ✨ Funcionalidades

### 📊 Dashboard
- KPIs de negócios, multiatendimento e atividades
- Gráficos de área, donut e rankings (Recharts)
- 3 abas: Negócios | Multiatendimento | Atividades
- Dados dos últimos 12 meses

### 🗂️ Pipeline Kanban
- Drag & drop entre etapas (@dnd-kit)
- Múltiplos pipelines por usuário/agente
- Modal de deal com valor, produto, responsável, notas
- Status: Aberto, Ganho, Perdido — com motivo de perda

### 💬 Multiatendimento (Inbox)
- Inbox unificado em tempo real via **Socket.IO**
- Fila de atendimento com posicionamento automático
- Departamentos com regras de distribuição (Round Robin)
- Atribuição manual ou automática de agentes
- Histórico completo de mensagens por lead
- Envio de texto, áudio, imagens e arquivos
- Integração com **WhatsApp via Evolution API**

### 👥 Leads
- Cadastro completo: nome, telefone, e-mail, empresa, endereço
- Campos personalizados (texto, número, data, select, checkbox)
- Tags coloridas com filtro
- Histórico de atividades e linha do tempo
- Score de risco
- Listas segmentadas

### ⚡ Automações (Visual Builder)
- Editor drag & drop baseado em **@xyflow/react**
- Nós: Gatilho, Ação, Condição (Se/Então), Temporizador, Grupo
- Gatilhos: Lead criado, Tag adicionada, Mensagem recebida, Negócio ganho
- Ações: Enviar mensagem, Adicionar/Remover tag, Atribuir agente, Mover pipeline, Criar negócio, Filtrar leads, Webhook HTTP
- Preview de mensagem com variáveis `{nome}`, `{produto}` em tempo real
- Construtor de conteúdo: texto, entrada do usuário, delay, áudio, anexo, URL dinâmica

### 🚚 Rastreio de Pedidos
- Integração com **API dos Correios** (chamada real com fallback)
- Suporte a: Correios, Jadlog, Loggi, Total Express, Melhor Envio, Custom
- Timeline visual de eventos por pedido
- Painel lateral de detalhe com barra de progresso
- **Webhook de entrada** para integrar Shopify, WooCommerce, Nuvemshop, Yampi
- Idempotência por `orderId` (sem duplicatas)
- Atualização individual ou em massa

### 📈 Análises
- Funil de conversão
- Desempenho por atendente
- Análise de objeções / motivos de perda
- Linha do tempo de atividades

### 📢 Disparos (Campanhas)
- Envio em massa para listas de leads
- Agendamento de campanhas
- Suporte a template de mensagem com variáveis

### 📋 Scripts de Atendimento
- Roteiros passo a passo para agentes
- Categorias e etapas configuráveis

### ⚙️ Configurações Completas
- Usuários e permissões (Admin / Agente)
- Departamentos com horários de trabalho e mensagem offline
- Tags, Produtos, Motivos de perda, Tipos de atividade
- Campos adicionais personalizados
- Conexões de canal (WhatsApp)
- **Chaves de API** com controle de permissões (para webhooks externos)
- Integrações externas

---

## 🛠 Stack

### Backend
| Tecnologia | Uso |
|---|---|
| **Node.js 18+** | Runtime |
| **Express** | Framework HTTP |
| **TypeScript** | Tipagem estática |
| **Prisma** | ORM multi-banco |
| **SQLite** (dev) / **PostgreSQL** (prod) | Banco de dados |
| **Socket.IO** | Chat e presença em tempo real |
| **JWT + bcryptjs** | Autenticação |
| **Multer** | Upload de arquivos |

### Frontend
| Tecnologia | Uso |
|---|---|
| **React 18** | UI |
| **TypeScript** | Tipagem |
| **Vite** | Build & dev server |
| **Tailwind CSS** | Estilização |
| **Zustand** | Estado global |
| **@xyflow/react** | Builder visual de automações |
| **@dnd-kit** | Drag & drop no Kanban |
| **Recharts** | Gráficos do dashboard |
| **Socket.IO Client** | Tempo real |
| **Lucide React** | Ícones |
| **date-fns** | Manipulação de datas |
| **Axios** | HTTP client |

---

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- npm ou yarn

### 1. Clone o repositório

```bash
git clone https://github.com/ryanlopesx2024/crm-xpay.git
cd crm-xpay
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edite o `.env` com suas configurações:

```env
DATABASE_URL="file:./src/prisma/dev.db"
JWT_SECRET="seu_segredo_aqui"
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3001"
PORT=3001
```

```bash
npx prisma db push
npx ts-node src/prisma/seed.ts   # opcional — cria dados de exemplo
npm run dev
```

Backend disponível em: `http://localhost:3001`

### 3. Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend disponível em: `http://localhost:5173`

---

## 🔑 Credenciais de acesso (seed)

| Usuário | E-mail | Senha | Perfil |
|---|---|---|---|
| Admin | admin@crmxpay.com | 123456 | Admin |
| Bruna | bruna@crmxpay.com | 123456 | Agente |
| Luan | luan@crmxpay.com | 123456 | Agente |
| Felipe | felipe@crmxpay.com | 123456 | Agente |

---

## 🔌 API Endpoints

### Autenticação
```
POST   /api/auth/register       Criar conta
POST   /api/auth/login          Login
GET    /api/auth/me             Dados do usuário logado
POST   /api/auth/refresh        Renovar token
POST   /api/auth/logout         Logout
```

### Leads
```
GET    /api/leads               Listar leads
POST   /api/leads               Criar lead
GET    /api/leads/:id           Buscar lead
PUT    /api/leads/:id           Atualizar lead
DELETE /api/leads/:id           Excluir lead
POST   /api/leads/:id/tags      Adicionar tag
DELETE /api/leads/:id/tags/:tagId  Remover tag
```

### Pipeline & Deals
```
GET    /api/pipelines           Listar pipelines
POST   /api/pipelines           Criar pipeline
GET    /api/deals               Listar deals
POST   /api/deals               Criar deal
PUT    /api/deals/:id           Atualizar deal
PUT    /api/deals/:id/stage     Mover de etapa
POST   /api/deals/:id/won       Marcar como ganho
POST   /api/deals/:id/lost      Marcar como perdido
```

### Rastreio
```
GET    /api/tracking            Listar rastreios
POST   /api/tracking            Criar rastreio
PUT    /api/tracking/:id        Editar rastreio
DELETE /api/tracking/:id        Excluir rastreio
POST   /api/tracking/:id/refresh  Consultar transportadora
POST   /api/tracking/bulk-refresh Atualizar todos
GET    /api/tracking/stats      KPIs de rastreio
```

### Dashboard
```
GET    /api/dashboard/stats          KPIs gerais
GET    /api/dashboard/negocios       Dados de negócios (12 meses)
GET    /api/dashboard/atendimentos   Dados de atendimento (12 meses)
```

---

## 📡 Webhooks

### WhatsApp — Meta API Oficial
```
GET  /webhooks/whatsapp   Verificação de token
POST /webhooks/whatsapp   Receber mensagens
```

### WhatsApp — Evolution API
```
POST /webhooks/evolution   Receber mensagens e eventos
```

### Rastreio de Pedidos (integração e-commerce)
```
POST /webhooks/tracking    Criar rastreio via API key
GET  /webhooks/tracking/test  Verificar autenticação
```

**Exemplo de payload para e-commerce:**
```json
{
  "apiKey": "SUA_API_KEY",
  "orderId": "12345",
  "customerName": "João Silva",
  "product": "Tênis Nike Air Max",
  "trackingCode": "AA123456789BR",
  "carrier": "CORREIOS"
}
```

> Autenticação via header `x-api-key` ou campo `apiKey` no body.
> Gere sua chave em **Configurações → Chaves de API**.

---

## 🗄️ Modelo de dados (Prisma)

O banco possui 20 modelos principais:

```
Company → User, Department, Lead, Pipeline, Tag, Product, Automation, Shipment...
Lead    → Conversation, Deal, Activity, LeadHistory, LeadTag, LeadListMember
Deal    → Stage, Pipeline, Product, LostReason, Activity
Conversation → Message, Department, ChannelInstance
Automation   → AutomationExecution, LeadHistory
Shipment     → Company (rastreio de pedidos)
```

---

## 🌐 Variáveis de ambiente

### Backend (`.env`)
```env
DATABASE_URL="file:./src/prisma/dev.db"
JWT_SECRET="troque_por_uma_chave_segura"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3001"
PORT=3001

# WhatsApp — Evolution API (opcional)
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_KEY="sua_chave"

# WhatsApp — Meta API Oficial (opcional)
WHATSAPP_TOKEN="seu_token"
WHATSAPP_VERIFY_TOKEN="seu_verify_token"
```

---

## 🏗️ Estrutura de pastas

```
crm-xpay/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Lógica de negócio
│   │   ├── middleware/      # Auth, error handler
│   │   ├── prisma/          # Schema, migrations, seed
│   │   ├── routes/          # 18 módulos de rota
│   │   ├── services/        # WhatsApp, automation, queue
│   │   ├── socket/          # Chat, queue, presence
│   │   └── webhooks/        # WhatsApp, Evolution, Tracking
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/      # Layout, chat, pipeline, automation
    │   ├── hooks/           # useSocket, usePipeline, etc.
    │   ├── pages/           # 25 páginas
    │   ├── services/        # API, socket, whatsapp
    │   ├── stores/          # Zustand (auth, theme, queue...)
    │   └── types/
    └── package.json
```

---

## 📄 Licença

Este projeto está licenciado sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

<div align="center">

Desenvolvido com ❤️ para o mercado brasileiro

**[⭐ Star no GitHub](https://github.com/ryanlopesx2024/crm-xpay)** · **[🐛 Reportar Bug](https://github.com/ryanlopesx2024/crm-xpay/issues)** · **[💡 Sugerir Feature](https://github.com/ryanlopesx2024/crm-xpay/issues)**

</div>
