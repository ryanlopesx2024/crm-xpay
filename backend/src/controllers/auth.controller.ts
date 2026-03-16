import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret';

function generateTokens(userId: string, companyId: string, role: string) {
  const token = jwt.sign({ userId, companyId, role }, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { token, refreshToken };
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyName, name, email, phone, password } = req.body;
    if (!companyName || !name || !email || !password) {
      res.status(400).json({ error: 'Campos obrigatorios: companyName, name, email, password' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'E-mail ja cadastrado' });
      return;
    }

    const slug = companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    const hashedPassword = await bcrypt.hash(password, 10);

    const company = await prisma.company.create({
      data: { name: companyName, slug, plan: 'basic', settings: JSON.stringify({ onboarded: false }) },
    });

    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        name,
        email,
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ONLINE',
      },
    });

    // Create default departments
    await Promise.all([
      prisma.department.create({ data: { companyId: company.id, name: 'Vendas', color: '#6366f1', distributionRule: 'ROUND_ROBIN' } }),
      prisma.department.create({ data: { companyId: company.id, name: 'Suporte', color: '#22c55e', distributionRule: 'ROUND_ROBIN' } }),
      prisma.department.create({ data: { companyId: company.id, name: 'Cobranca', color: '#ef4444', distributionRule: 'MANUAL' } }),
    ]);

    // Create default pipeline
    const pipeline = await prisma.pipeline.create({
      data: { companyId: company.id, userId: user.id, name: 'Vendas X1' },
    });
    const stageData = [
      { name: 'Lead Novo', color: '#64748b', order: 0 },
      { name: 'Abordagem', color: '#6366f1', order: 1 },
      { name: 'Proposta', color: '#f59e0b', order: 2 },
      { name: 'Fechamento', color: '#22c55e', order: 3 },
    ];
    await Promise.all(stageData.map(s => prisma.stage.create({ data: { pipelineId: pipeline.id, ...s } })));

    // Create default tags
    const defaultTags = [
      { name: 'Quente', color: '#ef4444' },
      { name: 'Frio', color: '#64748b' },
      { name: 'Qualificado', color: '#22c55e' },
      { name: 'Nao respondeu', color: '#f59e0b' },
    ];
    await Promise.all(defaultTags.map(t => prisma.tag.create({ data: { companyId: company.id, ...t } })));

    // Create default lost reasons
    await Promise.all([
      'Preco alto', 'Nao respondeu', 'Comprou do concorrente', 'Sem interesse', 'Sem orcamento'
    ].map(name => prisma.lostReason.create({ data: { companyId: company.id, name } })));

    const { token, refreshToken } = generateTokens(user.id, company.id, user.role);
    res.status(201).json({
      token,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: company.id, avatar: null, status: 'ONLINE', company: { id: company.id, name: company.name, slug: company.slug, plan: company.plan } },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email e senha são obrigatórios' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Credenciais inválidas' });
      return;
    }

    const { token, refreshToken } = generateTokens(user.id, user.companyId, user.role);

    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ONLINE' },
    });

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        avatar: user.avatar,
        status: 'ONLINE',
        company: {
          id: user.company.id,
          name: user.company.name,
          slug: user.company.slug,
          plan: user.company.plan,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token não fornecido' });
      return;
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado' });
      return;
    }

    const tokens = generateTokens(user.id, user.companyId, user.role);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Refresh token inválido' });
  }
};

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        company: true,
        departments: {
          include: { department: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      status: user.status,
      companyId: user.companyId,
      maxConversations: user.maxConversations,
      company: user.company,
      departments: user.departments.map((d) => d.department),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: { status: 'OFFLINE' },
    });
    res.json({ message: 'Logout realizado com sucesso' });
  } catch {
    res.status(500).json({ error: 'Erro ao fazer logout' });
  }
};
