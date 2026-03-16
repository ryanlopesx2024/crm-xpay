import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed...');

  // Criar empresa
  const company = await prisma.company.create({
    data: {
      name: 'CRM xPay',
      slug: 'crm-xpay',
      plan: 'enterprise',
    },
  });

  // Hash de senha padrão
  const hashedPassword = await bcrypt.hash('123456', 10);

  // Criar admin
  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Admin',
      email: 'admin@crmxpay.com',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ONLINE',
    },
  });

  // Criar atendentes
  const agentNames = ['Bruna', 'Luan', 'Felipe', 'Joao', 'Anderson', 'Murilo'];
  const agents = await Promise.all(
    agentNames.map((name, i) =>
      prisma.user.create({
        data: {
          companyId: company.id,
          name,
          email: `${name.toLowerCase()}@crmxpay.com`,
          password: hashedPassword,
          role: 'AGENT',
          status: i < 3 ? 'ONLINE' : 'AWAY',
          maxConversations: 10,
        },
      })
    )
  );

  // Criar departamentos
  const [vendas, suporte, cobranca] = await Promise.all([
    prisma.department.create({
      data: {
        companyId: company.id,
        name: 'Vendas',
        color: '#3b82f6',
        distributionRule: 'ROUND_ROBIN',
      },
    }),
    prisma.department.create({
      data: {
        companyId: company.id,
        name: 'Suporte',
        color: '#22c55e',
        distributionRule: 'ROUND_ROBIN',
      },
    }),
    prisma.department.create({
      data: {
        companyId: company.id,
        name: 'Cobrança',
        color: '#ef4444',
        distributionRule: 'MANUAL',
      },
    }),
  ]);

  // Associar agentes aos departamentos
  await Promise.all([
    prisma.departmentAgent.create({ data: { departmentId: vendas.id, userId: agents[0].id } }),
    prisma.departmentAgent.create({ data: { departmentId: vendas.id, userId: agents[1].id } }),
    prisma.departmentAgent.create({ data: { departmentId: suporte.id, userId: agents[2].id } }),
    prisma.departmentAgent.create({ data: { departmentId: suporte.id, userId: agents[3].id } }),
    prisma.departmentAgent.create({ data: { departmentId: cobranca.id, userId: agents[4].id } }),
    prisma.departmentAgent.create({ data: { departmentId: cobranca.id, userId: agents[5].id } }),
  ]);

  // Criar tags
  const tagDefs = [
    { name: 'PT1', color: '#3b82f6' },
    { name: 'PT2', color: '#8b5cf6' },
    { name: 'PT3', color: '#f97316' },
    { name: 'PT4', color: '#ec4899' },
    { name: 'Cloud-8850', color: '#22c55e' },
    { name: 'Cloud-7691', color: '#14b8a6' },
    { name: 'NAO-RESP-PT1', color: '#f59e0b' },
    { name: 'NAO-RESP-PT2', color: '#ef4444' },
    { name: 'POS-TERMO', color: '#6366f1' },
    { name: 'SEM-CTWA', color: '#64748b' },
  ];
  const tags = await Promise.all(
    tagDefs.map((t) => prisma.tag.create({ data: { companyId: company.id, ...t } }))
  );

  // Criar produtos
  const products = await Promise.all([
    prisma.product.create({
      data: {
        companyId: company.id,
        name: 'Plano Basic',
        defaultValue: 97,
        category: 'Assinatura',
        description: 'Plano básico com funcionalidades essenciais',
      },
    }),
    prisma.product.create({
      data: {
        companyId: company.id,
        name: 'Plano Pro',
        defaultValue: 197,
        category: 'Assinatura',
        description: 'Plano profissional com automações e relatórios',
      },
    }),
    prisma.product.create({
      data: {
        companyId: company.id,
        name: 'Plano Enterprise',
        defaultValue: 497,
        category: 'Assinatura',
        description: 'Plano completo para grandes equipes',
      },
    }),
  ]);

  // Criar motivos de perda
  await Promise.all(
    ['Preço alto', 'Não respondeu', 'Comprou concorrente', 'Sem interesse', 'Sem orçamento'].map(
      (name) => prisma.lostReason.create({ data: { companyId: company.id, name } })
    )
  );

  // Criar tipos de atividade
  await Promise.all(
    [
      { name: 'Ligação', icon: 'phone', color: '#3b82f6' },
      { name: 'E-mail', icon: 'mail', color: '#8b5cf6' },
      { name: 'Reunião', icon: 'calendar', color: '#22c55e' },
      { name: 'Tarefa', icon: 'check-square', color: '#f97316' },
    ].map((a) => prisma.activityType.create({ data: { companyId: company.id, ...a } }))
  );

  // Criar pipelines (uma por atendente)
  const stageNames = [
    'Lead Novo',
    'Não respondeu parte 1',
    'Parte 2',
    'Não respondeu parte 2',
    'Fechamento',
  ];
  const stageColors = ['#64748b', '#f59e0b', '#3b82f6', '#ef4444', '#22c55e'];

  const pipelines = await Promise.all(
    agents.map(async (agent) => {
      const pipeline = await prisma.pipeline.create({
        data: {
          companyId: company.id,
          userId: agent.id,
          name: agent.name,
        },
      });
      const stages = await Promise.all(
        stageNames.map((name, i) =>
          prisma.stage.create({
            data: {
              pipelineId: pipeline.id,
              name,
              color: stageColors[i],
              order: i,
            },
          })
        )
      );
      return { pipeline, stages };
    })
  );

  // Criar canal WhatsApp simulado
  const channel = await prisma.channelInstance.create({
    data: {
      companyId: company.id,
      name: 'Cloud-8850',
      type: 'WHATSAPP_OFFICIAL',
      identifier: '5511999998850',
      status: 'CONNECTED',
      config: JSON.stringify({ phoneNumberId: '8850', token: 'demo-token' }),
    },
  });

  // Criar 50 leads com dados realistas
  const firstNames = [
    'Ana', 'Carlos', 'Maria', 'Pedro', 'Fernanda',
    'Lucas', 'Juliana', 'Roberto', 'Patricia', 'Diego',
    'Camila', 'Rodrigo', 'Beatriz', 'Eduardo', 'Mariana',
    'Felipe', 'Larissa', 'Thiago', 'Amanda', 'Bruno',
  ];
  const lastNames = [
    'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues',
    'Ferreira', 'Almeida', 'Costa', 'Carvalho', 'Gomes',
    'Martins', 'Araújo', 'Melo', 'Barbosa', 'Ribeiro',
    'Lima', 'Pereira', 'Moura', 'Castro', 'Freitas',
  ];
  const companyNames = [
    'TechBR Ltda', 'Inovação Digital', 'StartUp Brasil',
    'Comercio Rápido', 'Serviços Plus', 'Digital Solutions',
    'MegaVendas', 'SmartBusiness', null, null,
  ];

  const leads = [];
  for (let i = 0; i < 50; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const phone = `119${String(Math.floor(Math.random() * 90000000) + 10000000)}`;
    const lead = await prisma.lead.create({
      data: {
        companyId: company.id,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace('ã', 'a').replace('é', 'e').replace('ú', 'u')}${i}@email.com`,
        phone,
        countryCode: '+55',
        company: companyNames[i % companyNames.length] ?? undefined,
      },
    });

    // Adicionar 1-2 tags aleatórias
    const tagCount = Math.floor(Math.random() * 2) + 1;
    const shuffledTags = [...tags].sort(() => 0.5 - Math.random()).slice(0, tagCount);
    for (const tag of shuffledTags) {
      try {
        await prisma.leadTag.create({ data: { leadId: lead.id, tagId: tag.id } });
      } catch {}
    }

    leads.push(lead);
  }

  // Criar 20 deals
  for (let i = 0; i < 20; i++) {
    const { pipeline, stages } = pipelines[i % pipelines.length];
    const stage = stages[Math.floor(Math.random() * stages.length)];
    const values = [0, 97, 197, 497];
    await prisma.deal.create({
      data: {
        leadId: leads[i].id,
        pipelineId: pipeline.id,
        stageId: stage.id,
        productId: i % 3 === 0 ? products[i % 3].id : undefined,
        assignedUserId: agents[i % agents.length].id,
        value: values[Math.floor(Math.random() * values.length)],
        status: 'OPEN',
      },
    });
  }

  // Criar 10 conversas com mensagens
  const departments = [vendas, suporte, cobranca];
  for (let i = 0; i < 10; i++) {
    const conversation = await prisma.conversation.create({
      data: {
        leadId: leads[i].id,
        channelInstanceId: channel.id,
        departmentId: departments[i % 3].id,
        assignedUserId: i < 7 ? agents[i % agents.length].id : undefined,
        status: (['OPEN', 'PENDING', 'BOT', 'OPEN', 'PENDING', 'OPEN', 'RESOLVED', 'OPEN', 'PENDING', 'OPEN'] as const)[i],
        lastMessageAt: new Date(Date.now() - i * 3600000),
      },
    });

    const msgs = [
      { direction: 'IN' as const, content: 'Olá, tenho interesse no produto!', userId: undefined },
      {
        direction: 'OUT' as const,
        content: 'Olá! Que bom que entrou em contato. Como posso ajudar?',
        userId: agents[i % agents.length].id,
      },
      { direction: 'IN' as const, content: 'Quero saber mais sobre os planos e valores.', userId: undefined },
      {
        direction: 'OUT' as const,
        content: 'Claro! Temos 3 planos: Basic R$97, Pro R$197 e Enterprise R$497. Qual se encaixa melhor no seu perfil?',
        userId: agents[i % agents.length].id,
      },
    ];

    for (const msg of msgs) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          leadId: leads[i].id,
          direction: msg.direction,
          type: 'TEXT',
          content: msg.content,
          userId: msg.userId,
          isRead: msg.direction === 'OUT',
        },
      });
    }
  }

  // Criar 5 automações ativas
  const automationTemplates = [
    {
      name: 'Boas-vindas Lead Novo',
      trigger: { type: 'LEAD_CREATED' },
      flow: {
        nodes: [
          { id: '1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Lead Criado', type: 'LEAD_CREATED' } },
          { id: '2', type: 'action', position: { x: 250, y: 200 }, data: { label: 'Enviar Mensagem', action: 'SEND_MESSAGE', message: 'Olá {nome}, seja bem-vindo!' } },
        ],
        edges: [{ id: 'e1-2', source: '1', target: '2' }],
      },
    },
    {
      name: 'Follow-up 24h sem resposta',
      trigger: { type: 'TIME_ELAPSED', hours: 24 },
      flow: {
        nodes: [
          { id: '1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: '24h sem resposta', type: 'TIME_ELAPSED' } },
          { id: '2', type: 'action', position: { x: 250, y: 200 }, data: { label: 'Adicionar Tag', action: 'ADD_TAG', tag: 'NAO-RESP-PT1' } },
          { id: '3', type: 'action', position: { x: 250, y: 350 }, data: { label: 'Enviar Follow-up', action: 'SEND_MESSAGE', message: 'Olá {nome}, ainda tem interesse?' } },
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' },
        ],
      },
    },
    {
      name: 'Tag PT1 adicionada',
      trigger: { type: 'TAG_ADDED', tagName: 'PT1' },
      flow: {
        nodes: [
          { id: '1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Tag PT1 Adicionada', type: 'TAG_ADDED' } },
          { id: '2', type: 'condition', position: { x: 250, y: 200 }, data: { label: 'Tem empresa?', condition: 'HAS_COMPANY' } },
          { id: '3', type: 'action', position: { x: 100, y: 350 }, data: { label: 'Enviar proposta B2B', action: 'SEND_MESSAGE' } },
          { id: '4', type: 'action', position: { x: 400, y: 350 }, data: { label: 'Enviar proposta B2C', action: 'SEND_MESSAGE' } },
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3', label: 'Sim' },
          { id: 'e2-4', source: '2', target: '4', label: 'Não' },
        ],
      },
    },
    {
      name: 'Cobrança pós-venda',
      trigger: { type: 'DEAL_WON' },
      flow: {
        nodes: [
          { id: '1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Negócio Ganho', type: 'DEAL_WON' } },
          { id: '2', type: 'delay', position: { x: 250, y: 200 }, data: { label: 'Aguardar 7 dias', delay: 7, unit: 'DAYS' } },
          { id: '3', type: 'action', position: { x: 250, y: 350 }, data: { label: 'Enviar NPS', action: 'SEND_MESSAGE', message: 'Como está sendo sua experiência?' } },
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' },
        ],
      },
    },
    {
      name: 'Reativação clientes frios',
      trigger: { type: 'SCHEDULED', cron: '0 9 * * 1' },
      flow: {
        nodes: [
          { id: '1', type: 'trigger', position: { x: 250, y: 50 }, data: { label: 'Todo Monday 9h', type: 'SCHEDULED' } },
          { id: '2', type: 'action', position: { x: 250, y: 200 }, data: { label: 'Buscar leads frios', action: 'FILTER_LEADS' } },
          { id: '3', type: 'action', position: { x: 250, y: 350 }, data: { label: 'Enviar reativação', action: 'SEND_MESSAGE', message: 'Oi {nome}, temos novidades para você!' } },
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' },
        ],
      },
    },
  ];

  await Promise.all(
    automationTemplates.map((a) =>
      prisma.automation.create({
        data: {
          companyId: company.id,
          name: a.name,
          isActive: true,
          trigger: JSON.stringify(a.trigger),
          flow: JSON.stringify(a.flow),
        },
      })
    )
  );

  // Criar histórico de leads
  for (let i = 0; i < 10; i++) {
    await prisma.leadHistory.create({
      data: {
        leadId: leads[i].id,
        type: 'LEAD_CREATED',
        description: 'Lead criado no sistema',
        metadata: JSON.stringify({ source: 'whatsapp' }),
      },
    });
    if (i < 5) {
      await prisma.leadHistory.create({
        data: {
          leadId: leads[i].id,
          type: 'CONVERSATION_STARTED',
          description: 'Conversa iniciada via WhatsApp',
          metadata: JSON.stringify({ channel: 'Cloud-8850' }),
        },
      });
    }
  }

  // Criar API Key de exemplo
  await prisma.apiKey.create({
    data: {
      companyId: company.id,
      name: 'Integração Principal',
      key: `xpay_${Math.random().toString(36).substring(2, 34)}`,
      permissions: JSON.stringify(['leads:read', 'leads:write', 'conversations:read']),
    },
  });

  console.log('Seed concluido com sucesso!');
  console.log('Admin: admin@crmxpay.com | Senha: 123456');
  console.log('Atendentes: bruna@, luan@, felipe@, joao@, anderson@, murilo@crmxpay.com | Senha: 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
