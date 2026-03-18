import { prisma, io } from '../index';
import { sendEvolutionMessage, parseChannelConfig, getCredsFromConfig } from './evolution.service';
import axios from 'axios';

// ── Variable substitution ─────────────────────────────────────────────────────
function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function buildVars(lead: Record<string, any>): Record<string, string> {
  return {
    nome: lead.name || '',
    telefone: lead.phone || '',
    email: lead.email || '',
    empresa: lead.company || '',
    id: lead.id || '',
  };
}

// ── Walk the flow graph from a given node, depth-first ───────────────────────
async function walkFlow(
  nodes: any[],
  edges: any[],
  currentNodeId: string,
  lead: any,
  vars: Record<string, string>,
  executionId: string,
  log: any[],
  depth = 0,
): Promise<void> {
  if (depth > 50) return; // guard against loops

  const node = nodes.find((n) => n.id === currentNodeId);
  if (!node) return;

  const data = node.data || {};

  // ── Execute this node ────────────────────────────────────────────────────
  let branchLabel: string | null = null; // for condition nodes: 'yes' or 'no'

  if (node.type === 'action') {
    branchLabel = await executeAction(node, lead, vars, executionId, log);
  } else if (node.type === 'condition') {
    branchLabel = await evaluateCondition(data, lead);
    log.push({ step: log.length, nodeId: node.id, type: 'condition', result: branchLabel, ts: new Date().toISOString() });
  } else if (node.type === 'delay') {
    const qty = Number(data.quantity ?? 1);
    const unit: string = data.unit ?? 'MINUTES';
    const ms = unit === 'DAYS' ? qty * 86400000 : unit === 'HOURS' ? qty * 3600000 : qty * 60000;
    log.push({ step: log.length, nodeId: node.id, type: 'delay', ms, ts: new Date().toISOString() });
    if (ms <= 60000) await new Promise((r) => setTimeout(r, ms)); // wait only if ≤ 1 min
  }

  // ── Find next node(s) ────────────────────────────────────────────────────
  const outEdges = edges.filter((e) => e.source === currentNodeId);
  for (const edge of outEdges) {
    // For condition nodes, only follow the matching branch
    if (node.type === 'condition' && branchLabel) {
      const edgeLabel = (edge.sourceHandle || edge.label || '').toLowerCase();
      if (edgeLabel !== branchLabel) continue;
    }
    await walkFlow(nodes, edges, edge.target, lead, vars, executionId, log, depth + 1);
  }
}

// ── Execute a single action node ──────────────────────────────────────────────
async function executeAction(
  node: any,
  lead: any,
  vars: Record<string, string>,
  executionId: string,
  log: any[],
): Promise<null> {
  const data = node.data || {};
  const actionType: string = data.actionType || data.action || '';

  try {
    switch (actionType) {

      case 'SEND_MESSAGE': {
        const items: any[] = data.items || data.contents || data.content || [];
        const connectionId: string = data.connectionId || data.connection || '';

        // Find the channel to use
        let channel = connectionId
          ? await prisma.channelInstance.findUnique({ where: { id: connectionId } })
          : await prisma.channelInstance.findFirst({ where: { companyId: lead.companyId, status: 'CONNECTED', type: 'WHATSAPP_EVOLUTION' } });

        if (!channel || !lead.phone) {
          log.push({ step: log.length, nodeId: node.id, action: 'SEND_MESSAGE', error: 'Canal ou telefone não encontrado', ts: new Date().toISOString() });
          break;
        }

        // Find or create open conversation
        let conv = await prisma.conversation.findFirst({
          where: { leadId: lead.id, channelInstanceId: channel.id, status: { notIn: ['RESOLVED', 'CLOSED'] } },
        });
        if (!conv) {
          conv = await prisma.conversation.create({
            data: { leadId: lead.id, channelInstanceId: channel.id, status: 'OPEN', lastMessageAt: new Date() },
          });
        }

        const cfg = parseChannelConfig(channel.config);
        const creds = getCredsFromConfig(cfg);

        for (const item of items) {
          if (item.type === 'delay' && item.value) {
            const ms = Number(item.value) * 1000;
            if (ms <= 30000) await new Promise((r) => setTimeout(r, ms));
            continue;
          }
          if (item.type && item.type !== 'text') continue; // skip non-text items (delay handled above)
          const rawText: string = item.text || item.value || item.content || '';
          if (!rawText) continue;
          const text = interpolate(rawText, vars);

          // Send via Evolution
          if (creds.url && creds.key) {
            await sendEvolutionMessage(channel.identifier, lead.phone, text, creds);
          }

          // Save to DB and emit to chat
          const savedMsg = await prisma.message.create({
            data: {
              conversationId: conv.id,
              leadId: lead.id,
              direction: 'OUT',
              type: 'TEXT',
              content: text,
              automationId: null,
            },
          });
          // Emit to open chat window
          io.to(`conv_${conv.id}`).emit('new_message', savedMsg);
          io.to(lead.companyId).emit('conversation_updated', { conversationId: conv.id, lastMessage: savedMsg });
        }
        await prisma.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date() } });
        log.push({ step: log.length, nodeId: node.id, action: 'SEND_MESSAGE', to: lead.phone, ts: new Date().toISOString() });
        break;
      }

      case 'ADD_TAG': {
        const tagName: string = data.tagName || data.tag || '';
        if (!tagName) break;
        let tag = await prisma.tag.findFirst({ where: { companyId: lead.companyId, name: tagName } });
        if (!tag) tag = await prisma.tag.create({ data: { companyId: lead.companyId, name: tagName, color: '#6366f1' } });
        const exists = await prisma.leadTag.findUnique({ where: { leadId_tagId: { leadId: lead.id, tagId: tag.id } } });
        if (!exists) await prisma.leadTag.create({ data: { leadId: lead.id, tagId: tag.id } });
        log.push({ step: log.length, nodeId: node.id, action: 'ADD_TAG', tag: tagName, ts: new Date().toISOString() });
        break;
      }

      case 'REMOVE_TAG': {
        const tagName: string = data.tagName || data.tag || '';
        if (!tagName) break;
        const tag = await prisma.tag.findFirst({ where: { companyId: lead.companyId, name: tagName } });
        if (tag) await prisma.leadTag.deleteMany({ where: { leadId: lead.id, tagId: tag.id } });
        log.push({ step: log.length, nodeId: node.id, action: 'REMOVE_TAG', tag: tagName, ts: new Date().toISOString() });
        break;
      }

      case 'ASSIGN_AGENT': {
        const userId: string = data.userId || data.agentId || data.agent || '';
        if (!userId) break;
        // Assign to open conversation
        await prisma.conversation.updateMany({
          where: { leadId: lead.id, status: { notIn: ['RESOLVED', 'CLOSED'] } },
          data: { assignedUserId: userId },
        });
        log.push({ step: log.length, nodeId: node.id, action: 'ASSIGN_AGENT', userId, ts: new Date().toISOString() });
        break;
      }

      case 'MOVE_PIPELINE': {
        const stageId: string = data.stageId || data.stage || '';
        if (!stageId) break;
        await prisma.deal.updateMany({
          where: { leadId: lead.id, status: 'OPEN' },
          data: { stageId },
        });
        log.push({ step: log.length, nodeId: node.id, action: 'MOVE_PIPELINE', stageId, ts: new Date().toISOString() });
        break;
      }

      case 'CREATE_DEAL': {
        const pipelineId: string = data.pipelineId || '';
        const stageId: string = data.stageId || '';
        if (!pipelineId) break;
        // Get first stage of pipeline if no stageId
        const stage = stageId
          ? { id: stageId }
          : await prisma.stage.findFirst({ where: { pipelineId }, orderBy: { order: 'asc' } });
        if (!stage) break;
        await prisma.deal.create({
          data: {
            leadId: lead.id,
            pipelineId,
            stageId: stage.id,
            status: 'OPEN',
            value: Number(data.value || 0),
          },
        });
        log.push({ step: log.length, nodeId: node.id, action: 'CREATE_DEAL', ts: new Date().toISOString() });
        break;
      }

      case 'HTTP_REQUEST': {
        const url: string = interpolate(data.url || '', vars);
        const method: string = (data.method || 'POST').toUpperCase();
        const body = data.body ? JSON.parse(interpolate(JSON.stringify(data.body), vars)) : undefined;
        if (!url) break;
        await axios({ method, url, data: body, timeout: 10000 }).catch(() => {});
        log.push({ step: log.length, nodeId: node.id, action: 'HTTP_REQUEST', method, url, ts: new Date().toISOString() });
        break;
      }

      default:
        log.push({ step: log.length, nodeId: node.id, action: actionType, skipped: true, ts: new Date().toISOString() });
    }
  } catch (err: any) {
    log.push({ step: log.length, nodeId: node.id, action: actionType, error: err?.message, ts: new Date().toISOString() });
  }
  return null;
}

// ── Evaluate a condition node ─────────────────────────────────────────────────
async function evaluateCondition(data: any, lead: any): Promise<'yes' | 'no'> {
  const field: string = data.field || '';
  const operator: string = data.operator || 'exists';
  const value: string = String(data.value ?? '');

  try {
    if (field === 'tag') {
      const tags = await prisma.leadTag.findMany({ where: { leadId: lead.id }, include: { tag: true } });
      const tagNames = tags.map((t: any) => t.tag?.name?.toLowerCase());
      const result = operator === 'exists' ? tagNames.length > 0 : tagNames.includes(value.toLowerCase());
      return result ? 'yes' : 'no';
    }
    if (field === 'deal_value') {
      const deals = await prisma.deal.findMany({ where: { leadId: lead.id, status: 'OPEN' } });
      const maxVal = deals.reduce((s: number, d: any) => Math.max(s, d.value || 0), 0);
      if (operator === 'greater_than') return maxVal > Number(value) ? 'yes' : 'no';
      if (operator === 'less_than') return maxVal < Number(value) ? 'yes' : 'no';
      return maxVal === Number(value) ? 'yes' : 'no';
    }
    // Generic field on lead
    const fieldVal = String((lead as any)[field] ?? '').toLowerCase();
    if (operator === 'exists') return fieldVal ? 'yes' : 'no';
    if (operator === 'equals') return fieldVal === value.toLowerCase() ? 'yes' : 'no';
    if (operator === 'contains') return fieldVal.includes(value.toLowerCase()) ? 'yes' : 'no';
    return 'no';
  } catch {
    return 'no';
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────
export async function triggerAutomation(
  companyId: string,
  triggerType: string,
  leadId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const automations = await prisma.automation.findMany({ where: { companyId, isActive: true } });

    const matching = automations.filter((a) => {
      try {
        const trigger = typeof a.trigger === 'string' ? JSON.parse(a.trigger) : a.trigger;
        if (trigger?.type !== triggerType) return false;
        // TAG_ADDED: only fire if no specific tag filter, or tag name matches
        if (triggerType === 'TAG_ADDED' && trigger.tagName && metadata.tagName) {
          return String(trigger.tagName).toLowerCase() === String(metadata.tagName).toLowerCase();
        }
        return true;
      } catch { return false; }
    });

    if (matching.length === 0) return;

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;

    const vars = buildVars(lead as any);

    for (const automation of matching) {
      const execution = await prisma.automationExecution.create({
        data: { automationId: automation.id, leadId, status: 'RUNNING', log: '[]' },
      });
      await prisma.automation.update({ where: { id: automation.id }, data: { executionCount: { increment: 1 } } });
      await prisma.leadHistory.create({
        data: {
          leadId,
          type: 'AUTOMATION_TRIGGERED',
          description: `Automação "${automation.name}" iniciada`,
          metadata: JSON.stringify({ automationId: automation.id, triggerType, ...metadata }),
          automationId: automation.id,
        },
      });

      // Run execution asynchronously (non-blocking)
      runExecution(execution.id, automation, lead as any, vars).catch((err) =>
        console.error(`[Automation] Execution ${execution.id} failed:`, err?.message)
      );
    }
  } catch (err) {
    console.error('[Automation] triggerAutomation error:', err);
  }
}

async function runExecution(
  executionId: string,
  automation: any,
  lead: any,
  vars: Record<string, string>,
): Promise<void> {
  const log: any[] = [{ step: 0, action: 'STARTED', ts: new Date().toISOString() }];
  try {
    const flow = typeof automation.flow === 'string' ? JSON.parse(automation.flow) : automation.flow;
    const nodes: any[] = flow?.nodes ?? [];
    const edges: any[] = flow?.edges ?? [];

    // Find trigger node to start from
    const triggerNode = nodes.find((n) => n.type === 'trigger');
    if (!triggerNode) {
      log.push({ action: 'NO_TRIGGER_NODE', ts: new Date().toISOString() });
    } else {
      await walkFlow(nodes, edges, triggerNode.id, lead, vars, executionId, log);
    }

    await prisma.automationExecution.update({
      where: { id: executionId },
      data: { status: 'COMPLETED', completedAt: new Date(), log: JSON.stringify(log) },
    });
    console.log(`[Automation] "${automation.name}" completed for lead ${lead.id}. Steps: ${log.length}`);
  } catch (err: any) {
    log.push({ action: 'ERROR', error: err?.message, ts: new Date().toISOString() });
    await prisma.automationExecution.update({
      where: { id: executionId },
      data: { status: 'FAILED', completedAt: new Date(), log: JSON.stringify(log) },
    }).catch(() => {});
    throw err;
  }
}
