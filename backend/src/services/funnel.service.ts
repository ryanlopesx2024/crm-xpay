import { prisma } from '../index';
import {
  sendEvolutionMessage,
  sendEvolutionMedia,
  sendEvolutionAudio,
  parseChannelConfig,
  getCredsFromConfig,
  EvolutionCreds,
} from './evolution.service';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FunnelBlock {
  id: string;
  type: string;
  sourceBlockId: string;
  options: any;
  presentation?: { x: number; y: number };
}

interface FunnelJson {
  id: string;
  name: string;
  blocks: FunnelBlock[];
  tenantId?: string;
}

// ── Variable interpolation ─────────────────────────────────────────────────

function interpolate(text: string, lead: any, collected: Record<string, string>): string {
  const vars: Record<string, string> = {
    leadName: lead.name || '',
    leadFirstName: (lead.name || '').split(' ')[0],
    leadPhone: lead.phone || '',
    leadEmail: lead.email || '',
    ...collected,
  };
  // Substitui {Label|varName} e {varName}
  return text
    .replace(/\{[^|{}]+\|(\w+)\}/g, (_, key) => vars[key] ?? '')
    .replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getBlock(blocks: FunnelBlock[], id: string): FunnelBlock | undefined {
  return blocks.find((b) => b.id === id);
}

// ── Save message to conversation ──────────────────────────────────────────

async function saveOutgoingMessage(
  leadId: string,
  channelId: string,
  content: string,
  type: string = 'TEXT',
  mediaUrl?: string,
): Promise<void> {
  try {
    const conv = await prisma.conversation.findFirst({
      where: { leadId, channelInstanceId: channelId, status: { notIn: ['RESOLVED', 'CLOSED'] } },
    });
    if (!conv) return;
    await prisma.message.create({
      data: {
        conversationId: conv.id,
        leadId,
        direction: 'OUT',
        type: type as any,
        content: content || null,
        mediaUrl: mediaUrl || null,
      },
    });
  } catch { /* non-critical */ }
}

// ── Send a single step from a chat block ──────────────────────────────────

async function sendStep(
  step: any,
  lead: any,
  instanceName: string,
  creds: EvolutionCreds,
  collected: Record<string, string>,
  leadId: string,
  channelId: string,
): Promise<void> {
  const phone = lead.phone;
  if (!phone) return;

  switch (step.name) {
    case 'send-text-message': {
      const text = interpolate(step.options?.text || '', lead, collected);
      if (!text.trim()) return;
      await sendEvolutionMessage(instanceName, phone, text, creds);
      await saveOutgoingMessage(leadId, channelId, text, 'TEXT');
      break;
    }

    case 'send-file-message': {
      const url: string = step.options?.url || '';
      const mime: string = step.options?.mimeType || '';
      const filename: string = step.options?.filename || 'file';
      const caption: string = interpolate(step.options?.text || '', lead, collected);

      if (!url) return;

      if (mime.startsWith('audio/')) {
        await sendEvolutionAudio(instanceName, phone, url, creds);
        await saveOutgoingMessage(leadId, channelId, filename, 'AUDIO', url);
      } else if (mime.startsWith('image/')) {
        await sendEvolutionMedia(instanceName, phone, url, 'image', filename, caption, creds);
        await saveOutgoingMessage(leadId, channelId, caption || filename, 'IMAGE', url);
      } else if (mime.startsWith('video/')) {
        await sendEvolutionMedia(instanceName, phone, url, 'video', filename, caption, creds);
        await saveOutgoingMessage(leadId, channelId, caption || filename, 'VIDEO', url);
      } else {
        await sendEvolutionMedia(instanceName, phone, url, 'document', filename, caption, creds);
        await saveOutgoingMessage(leadId, channelId, caption || filename, 'DOCUMENT', url);
      }
      break;
    }

    case 'delay-message': {
      const ms = (step.options?.seconds || 0) * 1000;
      // Cap at 30s in real execution to avoid hanging; real delays used between blocks
      if (ms > 0) await sleep(Math.min(ms, 30000));
      break;
    }

    default:
      break;
  }
}

// ── Execute a CHAT block (send messages, stop at text-input-message) ──────

async function executeChatBlock(
  block: FunnelBlock,
  lead: any,
  instanceName: string,
  creds: EvolutionCreds,
  execution: any,
  collected: Record<string, string>,
): Promise<{ waitingInput: boolean; timeoutAt?: Date; timeoutBlockId?: string }> {
  const messages: any[] = block.options?.messages || [];

  for (const step of messages) {
    if (step.name === 'text-input-message') {
      // Send the prompt text first if present
      const promptText = interpolate(step.options?.text || '', lead, collected);
      if (promptText.trim()) {
        await sendEvolutionMessage(instanceName, lead.phone, promptText, creds);
        await saveOutgoingMessage(lead.id, execution.channelId, promptText, 'TEXT');
      }

      // Calculate timeout
      const timeoutSec: number = step.options?.timeoutInSeconds || 600;
      const timeoutBlockId: string = step.options?.timeoutNextBlockId || '';
      const timeoutAt = new Date(Date.now() + timeoutSec * 1000);

      return {
        waitingInput: true,
        timeoutAt,
        timeoutBlockId: timeoutBlockId || undefined,
      };
    }

    await sendStep(step, lead, instanceName, creds, collected, lead.id, execution.channelId);
  }

  return { waitingInput: false };
}

// ── Execute ACTION block ───────────────────────────────────────────────────

async function executeActionBlock(
  block: FunnelBlock,
  lead: any,
  companyId: string,
): Promise<void> {
  const actions: any[] = block.options?.actions || [];

  for (const action of actions) {
    try {
      switch (action.name) {
        case 'add-tag-action': {
          const tagIds: string[] = (action.options?.tagIds || []).filter(Boolean);
          // Try to find matching tags by external ID stored in tag metadata or skip unknown
          for (const tagId of tagIds) {
            const tag = await prisma.tag.findFirst({ where: { id: tagId, companyId } });
            if (tag) {
              await prisma.leadTag.upsert({
                where: { leadId_tagId: { leadId: lead.id, tagId: tag.id } },
                create: { leadId: lead.id, tagId: tag.id },
                update: {},
              });
            }
          }
          break;
        }

        case 'remove-tag-action': {
          const tagIds: string[] = (action.options?.tagIds || []).filter(Boolean);
          for (const tagId of tagIds) {
            await prisma.leadTag.deleteMany({ where: { leadId: lead.id, tagId } }).catch(() => {});
          }
          break;
        }

        case 'move-business-action': {
          const stageId: string = action.options?.stageId || '';
          if (!stageId) break;
          const deal = await prisma.deal.findFirst({ where: { leadId: lead.id, status: 'OPEN' } });
          if (deal) {
            const stage = await prisma.stage.findUnique({ where: { id: stageId } });
            if (stage) await prisma.deal.update({ where: { id: deal.id }, data: { stageId } });
          }
          break;
        }

        case 'create-lead-action':
          // Lead already exists in our system
          break;

        case 'create-business-action': {
          const stageId: string = action.options?.stageId || '';
          const existingDeal = await prisma.deal.findFirst({ where: { leadId: lead.id, status: 'OPEN' } });
          if (!existingDeal) {
            const pipeline = await prisma.pipeline.findFirst({ where: { companyId } });
            if (pipeline) {
              const stage = stageId
                ? await prisma.stage.findUnique({ where: { id: stageId } })
                : await prisma.stage.findFirst({ where: { pipelineId: pipeline.id }, orderBy: { order: 'asc' } });
              if (stage) {
                await prisma.deal.create({
                  data: { leadId: lead.id, pipelineId: pipeline.id, stageId: stage.id },
                });
              }
            }
          }
          break;
        }

        case 'add-attendant-on-business-action': {
          const attendantId: string = action.options?.attendantId || '';
          if (!attendantId) break;
          const user = await prisma.user.findFirst({ where: { id: attendantId, companyId } });
          if (user) {
            const deal = await prisma.deal.findFirst({ where: { leadId: lead.id, status: 'OPEN' } });
            if (deal) await prisma.deal.update({ where: { id: deal.id }, data: { assignedUserId: user.id } });
          }
          break;
        }

        case 'change-conversation-attendant-action': {
          const attendantId: string = action.options?.attendantId || '';
          if (!attendantId) break;
          const user = await prisma.user.findFirst({ where: { id: attendantId, companyId } });
          if (user) {
            await prisma.conversation.updateMany({
              where: { leadId: lead.id, status: { notIn: ['RESOLVED', 'CLOSED'] } },
              data: { assignedUserId: user.id },
            });
          }
          break;
        }

        default:
          break;
      }
    } catch (err: any) {
      console.warn(`[Funnel] Action ${action.name} falhou:`, err?.message);
    }
  }
}

// ── Execute RANDOMIZER block ───────────────────────────────────────────────

function pickRandomizer(block: FunnelBlock): string | null {
  const options: any[] = block.options?.randomizers || [];
  const total = options.reduce((s: number, o: any) => s + (o.perc || 0), 0);
  let rand = Math.random() * total;
  for (const o of options) {
    rand -= o.perc || 0;
    if (rand <= 0) return o.nextBlockId || null;
  }
  return options[0]?.nextBlockId || null;
}

// ── Execute API block ──────────────────────────────────────────────────────

async function executeApiBlock(
  block: FunnelBlock,
  lead: any,
  collected: Record<string, string>,
): Promise<void> {
  const apis: any[] = block.options?.apis || [];
  const axios = (await import('axios')).default;

  for (const api of apis) {
    try {
      const url = interpolate(api.options?.url || '', lead, collected);
      if (!url) continue;

      const method = (api.options?.method || 'GET').toLowerCase();
      const params: Record<string, string> = {};
      for (const q of (api.options?.query || [])) {
        params[q.key] = interpolate(q.value || '', lead, collected);
      }
      const headers: Record<string, string> = {};
      for (const h of (api.options?.headers || [])) {
        headers[h.key] = interpolate(h.value || '', lead, collected);
      }

      await axios({ method, url, params, headers, timeout: 10000 });
      console.log(`[Funnel] API call OK → ${method.toUpperCase()} ${url}`);
    } catch (err: any) {
      console.warn(`[Funnel] API call falhou:`, err?.message);
    }
  }
}

// ── Execute CONDITION block ────────────────────────────────────────────────

async function evaluateConditionBlock(
  block: FunnelBlock,
  lead: any,
): Promise<string | null> {
  const conditions: any[] = block.options?.conditions || [];

  for (const cond of conditions) {
    if (cond.name === 'lead-exists-condition') {
      if (!lead?.id) return block.options?.falseNextBlockId || null;
    }
  }

  return block.options?.trueNextBlockId || null;
}

// ── Main executor: run from a block forward until waitingInput or end ──────

export async function executeFromBlock(
  funnelJson: FunnelJson,
  blockId: string,
  execution: any,
  lead: any,
  channel: any,
): Promise<void> {
  const blocks = funnelJson.blocks;
  const cfg = parseChannelConfig(channel.config);
  const creds = getCredsFromConfig(cfg);
  const instanceName = channel.identifier;

  let collected: Record<string, string> = {};
  try { collected = JSON.parse(execution.collectedData || '{}'); } catch { /* */ }

  let currentId: string | null = blockId;

  while (currentId) {
    const block = getBlock(blocks, currentId);
    if (!block) break;

    console.log(`[Funnel] exec block id=${block.id} type=${block.type}`);

    // Update current block in DB
    await prisma.funnelExecution.update({
      where: { id: execution.id },
      data: { currentBlockId: block.id, waitingInput: false },
    });

    let nextId: string | null = block.options?.nextBlockId || null;

    switch (block.type) {
      case 'trigger':
        nextId = block.options?.nextBlockId || null;
        break;

      case 'chat': {
        const result = await executeChatBlock(block, lead, instanceName, creds, execution, collected);
        if (result.waitingInput) {
          await prisma.funnelExecution.update({
            where: { id: execution.id },
            data: {
              waitingInput: true,
              timeoutAt: result.timeoutAt || null,
              timeoutBlockId: result.timeoutBlockId || null,
            },
          });
          return; // pause until user replies
        }
        break;
      }

      case 'action':
        await executeActionBlock(block, lead, channel.companyId);
        break;

      case 'randomizer':
        nextId = pickRandomizer(block);
        break;

      case 'delay': {
        const hours = block.options?.delay?.options?.hours || 0;
        const minutes = block.options?.delay?.options?.minutes || 0;
        const ms = (hours * 3600 + minutes * 60) * 1000;
        if (ms > 0) {
          // For long delays, schedule via timeout and pause execution
          const resumeAt = new Date(Date.now() + ms);
          await prisma.funnelExecution.update({
            where: { id: execution.id },
            data: {
              waitingInput: false,
              timeoutAt: resumeAt,
              timeoutBlockId: block.options?.nextBlockId || null,
              currentBlockId: block.id,
            },
          });
          // Schedule in-process (works for Node.js uptime window)
          setTimeout(async () => {
            try {
              const freshExec = await prisma.funnelExecution.findUnique({ where: { id: execution.id } });
              if (!freshExec || freshExec.status !== 'RUNNING') return;
              const freshLead = await prisma.lead.findUnique({ where: { id: lead.id } });
              const freshChannel = await prisma.channelInstance.findUnique({ where: { id: execution.channelId } });
              if (!freshLead || !freshChannel) return;
              const resumeBlockId = block.options?.nextBlockId;
              if (resumeBlockId) {
                await executeFromBlock(funnelJson, resumeBlockId, freshExec, freshLead, freshChannel);
              }
            } catch (e: any) {
              console.error('[Funnel] delay resume error:', e?.message);
            }
          }, Math.min(ms, 2 ** 31 - 1)); // JS max setTimeout
          return;
        }
        break;
      }

      case 'api':
        await executeApiBlock(block, lead, collected);
        break;

      case 'condition':
        nextId = await evaluateConditionBlock(block, lead);
        break;

      default:
        break;
    }

    currentId = nextId;
  }

  // Reached end of funnel
  await prisma.funnelExecution.update({
    where: { id: execution.id },
    data: { status: 'COMPLETED', completedAt: new Date(), waitingInput: false },
  });
  console.log(`[Funnel] Execution ${execution.id} COMPLETED`);
}

// ── Start a new funnel execution ──────────────────────────────────────────

export async function startFunnel(
  funnelId: string,
  lead: any,
  channel: any,
): Promise<void> {
  const funnel = await prisma.funnel.findUnique({ where: { id: funnelId } });
  if (!funnel || !funnel.active) return;

  // Abort any running execution for this lead+funnel
  await prisma.funnelExecution.updateMany({
    where: { funnelId, leadId: lead.id, status: 'RUNNING' },
    data: { status: 'ABORTED', completedAt: new Date() },
  });

  let funnelJson: FunnelJson;
  try { funnelJson = JSON.parse(funnel.jsonData); } catch { return; }

  // Find trigger block → first block to execute
  const triggerBlock = funnelJson.blocks.find((b) => b.type === 'trigger');
  const firstBlockId = triggerBlock?.options?.nextBlockId;
  if (!firstBlockId) return;

  const execution = await prisma.funnelExecution.create({
    data: {
      funnelId,
      leadId: lead.id,
      channelId: channel.id,
      currentBlockId: firstBlockId,
      status: 'RUNNING',
    },
  });

  // Run non-blocking
  executeFromBlock(funnelJson, firstBlockId, execution, lead, channel).catch((err) => {
    console.error('[Funnel] start error:', err?.message);
    prisma.funnelExecution.update({
      where: { id: execution.id },
      data: { status: 'FAILED', completedAt: new Date() },
    }).catch(() => {});
  });
}

// ── Handle incoming message for an active execution ───────────────────────

export async function handleFunnelMessage(
  lead: any,
  channel: any,
  messageContent: string,
): Promise<boolean> {
  const execution = await prisma.funnelExecution.findFirst({
    where: { leadId: lead.id, channelId: channel.id, status: 'RUNNING', waitingInput: true },
  });
  if (!execution) return false;

  const funnel = await prisma.funnel.findUnique({ where: { id: execution.funnelId } });
  if (!funnel) return false;

  let funnelJson: FunnelJson;
  try { funnelJson = JSON.parse(funnel.jsonData); } catch { return false; }

  // Store user response in collectedData
  let collected: Record<string, string> = {};
  try { collected = JSON.parse(execution.collectedData || '{}'); } catch { /* */ }
  collected['lastInput'] = messageContent;
  collected['lastMessage'] = messageContent;

  const currentBlock = getBlock(funnelJson.blocks, execution.currentBlockId);
  if (!currentBlock) return false;

  // Find the text-input-message step to get parameter name
  const messages: any[] = currentBlock.options?.messages || [];
  const inputStep = messages.find((m: any) => m.name === 'text-input-message');
  if (inputStep?.options?.parameter) {
    collected[inputStep.options.parameter] = messageContent;
  }

  await prisma.funnelExecution.update({
    where: { id: execution.id },
    data: {
      collectedData: JSON.stringify(collected),
      waitingInput: false,
      timeoutAt: null,
      timeoutBlockId: null,
    },
  });

  // Continue from the nextBlockId of the current chat block
  const nextBlockId: string = currentBlock.options?.nextBlockId || '';
  if (!nextBlockId) {
    await prisma.funnelExecution.update({
      where: { id: execution.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
    return true;
  }

  const freshExec = await prisma.funnelExecution.findUnique({ where: { id: execution.id } });
  if (freshExec) {
    executeFromBlock(funnelJson, nextBlockId, freshExec, lead, channel).catch((err) => {
      console.error('[Funnel] message handler error:', err?.message);
    });
  }

  return true;
}

// ── Periodic timeout checker (call every 60s) ─────────────────────────────

export async function checkFunnelTimeouts(): Promise<void> {
  const now = new Date();
  const timedOut = await prisma.funnelExecution.findMany({
    where: {
      status: 'RUNNING',
      waitingInput: true,
      timeoutAt: { lte: now },
      timeoutBlockId: { not: null },
    },
  });

  for (const exec of timedOut) {
    try {
      const funnel = await prisma.funnel.findUnique({ where: { id: exec.funnelId } });
      if (!funnel) continue;
      const funnelJson: FunnelJson = JSON.parse(funnel.jsonData);
      const lead = await prisma.lead.findUnique({ where: { id: exec.leadId } });
      const channel = await prisma.channelInstance.findUnique({ where: { id: exec.channelId } });
      if (!lead || !channel || !exec.timeoutBlockId) continue;

      await prisma.funnelExecution.update({
        where: { id: exec.id },
        data: { waitingInput: false, timeoutAt: null },
      });

      await executeFromBlock(funnelJson, exec.timeoutBlockId, exec, lead, channel);
    } catch (err: any) {
      console.error('[Funnel] timeout check error:', err?.message);
    }
  }
}
