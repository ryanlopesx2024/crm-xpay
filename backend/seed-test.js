const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) { console.log('No company found'); return; }
  console.log('Company:', company.id, company.name);

  const instance = await prisma.channelInstance.findFirst({ where: { companyId: company.id } });
  console.log('Instance:', instance ? instance.id + ' ' + instance.name : 'none');

  const user = await prisma.user.findFirst({ where: { companyId: company.id } });
  console.log('User:', user ? user.id + ' ' + user.name : 'none');

  const tag = await prisma.tag.findFirst({ where: { companyId: company.id } });
  const deal = await prisma.deal.findFirst({
    where: { lead: { companyId: company.id } },
    include: { stage: true, pipeline: true, product: true }
  });

  const lead = await prisma.lead.create({
    data: {
      companyId: company.id,
      name: 'Maria Silva Teste',
      phone: '+55 (43) 99772-1234',
      email: 'maria.silva@nutrapharma.com',
      company: 'NutraPharma LTDA',
      site: 'www.nutrapharma.com.br',
      document: '123.456.789-00',
      countryCode: 'BR',
    },
  });
  console.log('Lead created:', lead.id);

  if (tag) {
    await prisma.leadTag.create({ data: { leadId: lead.id, tagId: tag.id } });
    console.log('Tag added:', tag.name);
  }

  const conv = await prisma.conversation.create({
    data: {
      leadId: lead.id,
      channelInstanceId: instance ? instance.id : null,
      assignedUserId: user ? user.id : null,
      status: 'OPEN',
      lastMessageAt: new Date(),
    },
  });
  console.log('Conversation created:', conv.id);

  await prisma.message.createMany({
    data: [
      {
        conversationId: conv.id,
        leadId: lead.id,
        direction: 'IN',
        type: 'TEXT',
        content: 'Olá! Tenho interesse e queria mais informações, por favor.',
        isRead: true,
        createdAt: new Date(Date.now() - 60000 * 5),
      },
      {
        conversationId: conv.id,
        leadId: lead.id,
        direction: 'OUT',
        type: 'TEXT',
        content: '*Olá, me chamo Dra. Mariene*\n_Assessoria Médica - NutraPharma_',
        userId: user ? user.id : null,
        isRead: true,
        createdAt: new Date(Date.now() - 60000 * 4),
      },
      {
        conversationId: conv.id,
        leadId: lead.id,
        direction: 'OUT',
        type: 'TEXT',
        content: 'Quanto tempo você sofre com a diabetes e impotência?',
        userId: user ? user.id : null,
        isRead: false,
        createdAt: new Date(Date.now() - 60000 * 2),
      },
    ],
  });
  console.log('Messages created');

  await prisma.leadHistory.createMany({
    data: [
      {
        leadId: lead.id,
        type: 'LEAD_CREATED',
        description: 'Lead criada via WhatsApp',
        metadata: JSON.stringify({ source: 'whatsapp' }),
      },
      {
        leadId: lead.id,
        type: 'CONVERSATION_STARTED',
        description: 'Conversa iniciada via WhatsApp',
        metadata: JSON.stringify({ channel: 'WHATSAPP' }),
      },
      {
        leadId: lead.id,
        type: 'TAG_ADDED',
        description: tag ? 'Tag ' + tag.name + ' adicionada ao lead' : 'Tag adicionada ao lead',
        metadata: JSON.stringify({ tagName: tag ? tag.name : '' }),
        userId: user ? user.id : null,
      },
    ],
  });
  console.log('History created');
  console.log('Done! Conversation ID:', conv.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
