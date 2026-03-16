import { prisma } from '../index';

export async function addLeadHistory(
  leadId: string,
  type: string,
  description: string,
  metadata: Record<string, unknown> = {},
  userId?: string,
  automationId?: string
): Promise<void> {
  try {
    await prisma.leadHistory.create({
      data: {
        leadId,
        type,
        description,
        metadata: JSON.stringify(metadata),
        userId,
        automationId,
      },
    });
  } catch (err) {
    console.error('Error adding lead history:', err);
  }
}
