const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.lead.findFirst({ select: { id: true, notes: true } })
  .then(r => console.log('OK:', JSON.stringify(r)))
  .catch(e => console.log('ERROR:', e.message))
  .finally(() => p.$disconnect());
