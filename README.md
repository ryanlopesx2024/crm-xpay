# CRM xPay

CRM completo com pipeline de vendas, atendimento via WhatsApp, automações visuais e muito mais.

## Stack

**Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + @dnd-kit/core + @xyflow/react + Zustand + Lucide React + Axios + Socket.io-client

**Backend:** Node.js + Express + TypeScript + Prisma + PostgreSQL + Socket.io + Bull + Redis + bcryptjs + jsonwebtoken

**Infra:** Docker (PostgreSQL + Redis)

## Como executar

### 1. Subir banco de dados e Redis

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npx ts-node src/prisma/seed.ts
npm run dev
```

O backend inicia em: http://localhost:3001

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend inicia em: http://localhost:5173

## Credenciais de acesso

| Usuário   | Email                      | Senha  | Perfil |
|-----------|---------------------------|--------|--------|
| Admin     | admin@crmxpay.com         | 123456 | Admin  |
| Bruna     | bruna@crmxpay.com         | 123456 | Agente |
| Luan      | luan@crmxpay.com          | 123456 | Agente |
| Felipe    | felipe@crmxpay.com        | 123456 | Agente |
| Joao      | joao@crmxpay.com          | 123456 | Agente |
| Anderson  | anderson@crmxpay.com      | 123456 | Agente |
| Murilo    | murilo@crmxpay.com        | 123456 | Agente |

## Funcionalidades

- **Pipeline Kanban** com drag & drop
- **Atendimento** em tempo real via WebSocket
- **Leads** com histórico completo
- **Automações** com editor visual (React Flow)
- **Webhooks** WhatsApp (Meta API oficial e Evolution API)
- **Configurações** completas: departamentos, tags, produtos, motivos de perda, etc.

## Webhooks

### WhatsApp Meta (Oficial)
```
GET /webhooks/whatsapp  - Verificação Meta
POST /webhooks/whatsapp - Receber mensagens
```

### Evolution API
```
POST /webhooks/evolution - Receber mensagens
```
