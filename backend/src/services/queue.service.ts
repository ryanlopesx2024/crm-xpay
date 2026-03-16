import { prisma } from '../index';

export async function assignToAvailableAgent(
  conversationId: string,
  departmentId: string
): Promise<string | null> {
  try {
    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        agents: {
          include: {
            user: {
              select: {
                id: true,
                status: true,
                maxConversations: true,
                _count: { select: { conversations: true } },
              },
            },
          },
        },
      },
    });

    if (!department) return null;

    const availableAgents = department.agents
      .filter((a) => a.user.status === 'ONLINE')
      .sort((a, b) => {
        const aLoad = (a.user as { _count: { conversations: number } })._count.conversations / a.user.maxConversations;
        const bLoad = (b.user as { _count: { conversations: number } })._count.conversations / b.user.maxConversations;
        return aLoad - bLoad;
      });

    if (availableAgents.length === 0) return null;

    const selectedAgent = availableAgents[0];
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedUserId: selectedAgent.userId, status: 'OPEN' },
    });

    return selectedAgent.userId;
  } catch (err) {
    console.error('Error assigning agent:', err);
    return null;
  }
}
