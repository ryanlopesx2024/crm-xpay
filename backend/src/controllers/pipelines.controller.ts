import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

export const listPipelines = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pipelines = await prisma.pipeline.findMany({
      where: { companyId: req.companyId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        stages: { orderBy: { order: 'asc' } },
        _count: { select: { deals: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(pipelines);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar pipelines' });
  }
};

export const createPipeline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, userId } = req.body;
    const pipeline = await prisma.pipeline.create({
      data: {
        companyId: req.companyId!,
        userId: userId || req.userId!,
        name,
      },
      include: { stages: true, user: { select: { id: true, name: true } } },
    });
    res.status(201).json(pipeline);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar pipeline' });
  }
};

export const updatePipeline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const pipeline = await prisma.pipeline.update({
      where: { id },
      data: { name },
      include: { stages: true },
    });
    res.json(pipeline);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar pipeline' });
  }
};

export const deletePipeline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.deal.deleteMany({ where: { pipelineId: id } });
    await prisma.stage.deleteMany({ where: { pipelineId: id } });
    await prisma.pipeline.delete({ where: { id } });
    res.json({ message: 'Pipeline deletada' });
  } catch {
    res.status(500).json({ error: 'Erro ao deletar pipeline' });
  }
};

export const createStage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, color, order } = req.body;
    const stage = await prisma.stage.create({
      data: { pipelineId: id, name, color: color || '#3b82f6', order: order || 0 },
    });
    res.status(201).json(stage);
  } catch {
    res.status(500).json({ error: 'Erro ao criar etapa' });
  }
};

export const updateStage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { stageId } = req.params;
    const { name, color, order } = req.body;
    const stage = await prisma.stage.update({
      where: { id: stageId },
      data: { name, color, order },
    });
    res.json(stage);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar etapa' });
  }
};

export const deleteStage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { stageId } = req.params;
    await prisma.deal.deleteMany({ where: { stageId } });
    await prisma.stage.delete({ where: { id: stageId } });
    res.json({ message: 'Etapa deletada' });
  } catch {
    res.status(500).json({ error: 'Erro ao deletar etapa' });
  }
};
