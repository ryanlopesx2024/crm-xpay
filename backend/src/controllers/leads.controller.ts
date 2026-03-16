import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

function safeJsonParse(val: unknown): unknown {
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}

function parseLead(lead: Record<string, unknown>) {
  return {
    ...lead,
    address: safeJsonParse(lead.address),
    customFields: safeJsonParse(lead.customFields),
  };
}

export const listLeads = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search, page = '1', limit = '20', tagId } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: Record<string, unknown> = { companyId: req.companyId };
    if (search) {
      // SQLite does not support mode:'insensitive', use contains without mode
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } },
        { phone: { contains: search as string } },
        { company: { contains: search as string } },
        { document: { contains: search as string } },
      ];
    }
    if (tagId) {
      where.tags = { some: { tagId: tagId as string } };
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          tags: { include: { tag: true } },
          _count: { select: { deals: true, conversations: true } },
        },
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      leads: leads.map((l) => parseLead(l as unknown as Record<string, unknown>)),
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar leads' });
  }
};

export const getLead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        deals: {
          include: { stage: true, pipeline: true, product: true, assignedUser: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        conversations: {
          include: { assignedUser: { select: { id: true, name: true } }, department: true },
          orderBy: { lastMessageAt: 'desc' },
        },
        history: { orderBy: { createdAt: 'desc' }, take: 50 },
        activities: {
          include: { type: true, assignedUser: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        lists: { include: { list: true } },
      },
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }

    // Parse JSON string fields in history
    const parsed = parseLead(lead as unknown as Record<string, unknown>);
    if (Array.isArray((parsed as Record<string, unknown>).history)) {
      (parsed as Record<string, unknown>).history = ((parsed as Record<string, unknown>).history as Record<string, unknown>[]).map((h) => ({
        ...h,
        metadata: safeJsonParse(h.metadata),
      }));
    }

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar lead' });
  }
};

export const createLead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, countryCode, company, site, document, birthdate, address, customFields } = req.body;

    // If phone is provided, check for existing lead with same phone in this company
    if (phone) {
      const existing = await prisma.lead.findFirst({
        where: { companyId: req.companyId!, phone },
        include: { tags: { include: { tag: true } } },
      });
      if (existing) {
        res.status(200).json({ ...parseLead(existing as unknown as Record<string, unknown>), _existed: true });
        return;
      }
    }

    const lead = await prisma.lead.create({
      data: {
        companyId: req.companyId!,
        name,
        email,
        phone,
        countryCode: countryCode || '+55',
        company,
        site,
        document,
        birthdate: birthdate ? new Date(birthdate) : undefined,
        address: address ? JSON.stringify(address) : undefined,
        customFields: JSON.stringify(customFields || {}),
      },
      include: { tags: { include: { tag: true } } },
    });

    await prisma.leadHistory.create({
      data: {
        leadId: lead.id,
        type: 'LEAD_CREATED',
        description: 'Lead criado no sistema',
        metadata: JSON.stringify({}),
        userId: req.userId,
      },
    });

    res.status(201).json(parseLead(lead as unknown as Record<string, unknown>));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar lead' });
  }
};

export const updateLead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, phone, countryCode, company, site, document, birthdate, address, customFields, notes } = req.body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (countryCode !== undefined) data.countryCode = countryCode;
    if (company !== undefined) data.company = company;
    if (site !== undefined) data.site = site;
    if (document !== undefined) data.document = document;
    if (birthdate !== undefined) data.birthdate = birthdate ? new Date(birthdate) : null;
    if (address !== undefined) data.address = JSON.stringify(address);
    if (customFields !== undefined) data.customFields = JSON.stringify(customFields);
    if (notes !== undefined) data.notes = notes;

    const lead = await prisma.lead.update({
      where: { id },
      data,
      include: { tags: { include: { tag: true } } },
    });
    res.json(parseLead(lead as unknown as Record<string, unknown>));
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar lead' });
  }
};

export const addTag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { tagId } = req.body;
    await prisma.leadTag.create({ data: { leadId: id, tagId } });

    const tag = await prisma.tag.findUnique({ where: { id: tagId } });
    await prisma.leadHistory.create({
      data: {
        leadId: id,
        type: 'TAG_ADDED',
        description: `Tag "${tag?.name}" adicionada`,
        metadata: JSON.stringify({ tagId }),
        userId: req.userId,
      },
    });

    res.json({ message: 'Tag adicionada' });
  } catch {
    res.status(500).json({ error: 'Erro ao adicionar tag' });
  }
};

export const removeTag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, tagId } = req.params;
    await prisma.leadTag.delete({ where: { leadId_tagId: { leadId: id, tagId } } });
    res.json({ message: 'Tag removida' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover tag' });
  }
};

export const addToList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { listId } = req.body;
    await prisma.leadListMember.create({ data: { leadId: id, listId } });
    const list = await prisma.leadList.findUnique({ where: { id: listId } });
    await prisma.leadHistory.create({
      data: {
        leadId: id,
        type: 'LIST_ADDED',
        description: `Adicionado à lista "${list?.name}"`,
        metadata: JSON.stringify({ listId }),
        userId: req.userId,
      },
    });
    res.json({ message: 'Lead adicionado à lista' });
  } catch {
    res.status(500).json({ error: 'Erro ao adicionar à lista' });
  }
};

export const removeFromList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, listId } = req.params;
    await prisma.leadListMember.delete({ where: { leadId_listId: { leadId: id, listId } } });
    res.json({ message: 'Lead removido da lista' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover da lista' });
  }
};
