import { prisma } from '../index';

export async function triggerAutomation(
  companyId: string,
  triggerType: string,
  leadId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    // SQLite stores trigger as string, so we fetch all active automations and filter in JS
    const automations = await prisma.automation.findMany({
      where: {
        companyId,
        isActive: true,
      },
    });

    const matching = automations.filter((a) => {
      try {
        const trigger = typeof a.trigger === 'string' ? JSON.parse(a.trigger) : a.trigger;
        return trigger?.type === triggerType;
      } catch {
        return false;
      }
    });

    for (const automation of matching) {
      await prisma.automationExecution.create({
        data: {
          automationId: automation.id,
          leadId,
          status: 'RUNNING',
          log: JSON.stringify([{ step: 0, action: 'STARTED', timestamp: new Date().toISOString() }]),
        },
      });

      await prisma.automation.update({
        where: { id: automation.id },
        data: { executionCount: { increment: 1 } },
      });

      await prisma.leadHistory.create({
        data: {
          leadId,
          type: 'AUTOMATION_TRIGGERED',
          description: `Automação "${automation.name}" iniciada`,
          metadata: JSON.stringify({ automationId: automation.id, triggerType, ...metadata }),
          automationId: automation.id,
        },
      });
    }
  } catch (err) {
    console.error('Error triggering automation:', err);
  }
}
