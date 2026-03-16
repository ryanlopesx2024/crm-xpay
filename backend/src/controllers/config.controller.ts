import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';
import { v4 as uuidv4 } from 'uuid';

// DEPARTMENTS
export const listDepartments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const departments = await prisma.department.findMany({
      where: { companyId: req.companyId },
      include: {
        agents: { include: { user: { select: { id: true, name: true, avatar: true, status: true } } } },
        _count: { select: { conversations: true } },
      },
    });
    res.json(departments);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const createDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dept = await prisma.department.create({ data: { companyId: req.companyId!, ...req.body } });
    res.status(201).json(dept);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const updateDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dept = await prisma.department.update({ where: { id: req.params.id }, data: req.body });
    res.json(dept);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const deleteDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.department.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deletado' });
  } catch { res.status(500).json({ error: 'Erro' }); }
};

// TAGS
export const listTags = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tags = await prisma.tag.findMany({
      where: { companyId: req.companyId },
      include: { _count: { select: { leads: true } } },
    });
    res.json(tags);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const createTag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tag = await prisma.tag.create({ data: { companyId: req.companyId!, ...req.body } });
    res.status(201).json(tag);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const updateTag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tag = await prisma.tag.update({ where: { id: req.params.id }, data: req.body });
    res.json(tag);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const deleteTag = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.leadTag.deleteMany({ where: { tagId: req.params.id } });
    await prisma.tag.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deletado' });
  } catch { res.status(500).json({ error: 'Erro' }); }
};

// PRODUCTS
export const listProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { search } = req.query as { search?: string };
    const products = await prisma.product.findMany({
      where: {
        companyId: req.companyId,
        ...(search ? { name: { contains: search } } : {}),
      },
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await prisma.product.create({ data: { companyId: req.companyId!, ...req.body } });
    res.status(201).json(product);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
    res.json(product);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deletado' });
  } catch { res.status(500).json({ error: 'Erro' }); }
};

// LOST REASONS
export const listLostReasons = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reasons = await prisma.lostReason.findMany({ where: { companyId: req.companyId } });
    res.json(reasons);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const createLostReason = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reason = await prisma.lostReason.create({ data: { companyId: req.companyId!, ...req.body } });
    res.status(201).json(reason);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const updateLostReason = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reason = await prisma.lostReason.update({ where: { id: req.params.id }, data: req.body });
    res.json(reason);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const deleteLostReason = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.lostReason.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deletado' });
  } catch { res.status(500).json({ error: 'Erro' }); }
};

// ACTIVITY TYPES
export const listActivityTypes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const types = await prisma.activityType.findMany({ where: { companyId: req.companyId } });
    res.json(types);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const createActivityType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const type = await prisma.activityType.create({ data: { companyId: req.companyId!, ...req.body } });
    res.status(201).json(type);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const updateActivityType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const type = await prisma.activityType.update({ where: { id: req.params.id }, data: req.body });
    res.json(type);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const deleteActivityType = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.activityType.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deletado' });
  } catch { res.status(500).json({ error: 'Erro' }); }
};

// CUSTOM FIELDS
export const listCustomFields = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const fields = await prisma.customField.findMany({ where: { companyId: req.companyId } });
    res.json(fields);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const createCustomField = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const field = await prisma.customField.create({ data: { companyId: req.companyId!, ...req.body } });
    res.status(201).json(field);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const updateCustomField = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const field = await prisma.customField.update({ where: { id: req.params.id }, data: req.body });
    res.json(field);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const deleteCustomField = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.customField.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deletado' });
  } catch { res.status(500).json({ error: 'Erro' }); }
};

// LISTS
export const listLeadLists = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lists = await prisma.leadList.findMany({
      where: { companyId: req.companyId },
      include: { _count: { select: { members: true } } },
    });
    res.json(lists);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const createLeadList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const list = await prisma.leadList.create({ data: { companyId: req.companyId!, ...req.body } });
    res.status(201).json(list);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const deleteLeadList = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.leadListMember.deleteMany({ where: { listId: req.params.id } });
    await prisma.leadList.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deletado' });
  } catch { res.status(500).json({ error: 'Erro' }); }
};

// CHANNEL INSTANCES
export const listChannels = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const channels = await prisma.channelInstance.findMany({ where: { companyId: req.companyId } });
    res.json(channels);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const createChannel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const channel = await prisma.channelInstance.create({ data: { companyId: req.companyId!, ...req.body } });
    res.status(201).json(channel);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const updateChannel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const channel = await prisma.channelInstance.update({ where: { id: req.params.id }, data: req.body });
    res.json(channel);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const deleteChannel = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.channelInstance.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deletado' });
  } catch { res.status(500).json({ error: 'Erro' }); }
};

// API KEYS
export const listApiKeys = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const keys = await prisma.apiKey.findMany({ where: { companyId: req.companyId } });
    res.json(keys.map(k => ({ ...k, key: `${k.key.substring(0, 12)}...` })));
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const createApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const key = `xpay_${uuidv4().replace(/-/g, '')}`;
    const apiKey = await prisma.apiKey.create({
      data: { companyId: req.companyId!, key, ...req.body },
    });
    res.status(201).json(apiKey);
  } catch { res.status(500).json({ error: 'Erro' }); }
};

export const deleteApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.apiKey.delete({ where: { id: req.params.id } });
    res.json({ message: 'Deletado' });
  } catch { res.status(500).json({ error: 'Erro' }); }
};
