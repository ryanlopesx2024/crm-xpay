import axios from 'axios';

// ── per-channel credentials ────────────────────────────────────────────────
export interface EvolutionCreds {
  url: string;
  key: string;
}

function makeApi(creds: EvolutionCreds) {
  return axios.create({
    baseURL: creds.url.replace(/\/$/, ''),
    headers: { apikey: creds.key },
    timeout: 12000,
  });
}

// ── parse config JSON from ChannelInstance ────────────────────────────────
export function parseChannelConfig(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw); } catch { return {}; }
}

export function getCredsFromConfig(config: Record<string, unknown>): EvolutionCreds {
  return {
    url: (config.evolutionUrl as string) || process.env.EVOLUTION_API_URL || '',
    key: (config.evolutionKey as string) || process.env.EVOLUTION_API_KEY || '',
  };
}

// ── instance management ────────────────────────────────────────────────────
export async function createEvolutionInstance(
  instanceName: string,
  creds: EvolutionCreds,
  webhookUrl?: string,
): Promise<{ qrcode?: string }> {
  const api = makeApi(creds);
  const body: Record<string, unknown> = {
    instanceName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
  };
  if (webhookUrl) {
    body.webhook = { url: webhookUrl, byEvents: true, base64: true };
    body.webhookByEvents = true;
  }
  const { data } = await api.post('/instance/create', body);
  // Evolution v2: data.qrcode.base64 | Evolution v1: data.base64
  const qr: string = data?.qrcode?.base64 || data?.base64 || '';
  return { qrcode: qr };
}

export async function getEvolutionQRCode(instanceName: string, creds: EvolutionCreds): Promise<string> {
  const api = makeApi(creds);
  const { data } = await api.get(`/instance/connect/${instanceName}`);
  return data?.qrcode?.base64 || data?.base64 || '';
}

export async function getEvolutionStatus(instanceName: string, creds: EvolutionCreds): Promise<string> {
  try {
    const api = makeApi(creds);
    const { data } = await api.get(`/instance/connectionState/${instanceName}`);
    const state: string = data?.instance?.state || data?.state || 'DISCONNECTED';
    // Normalize
    if (state === 'open' || state === 'CONNECTED') return 'CONNECTED';
    if (state === 'close' || state === 'CLOSED') return 'DISCONNECTED';
    if (state === 'connecting') return 'CONNECTING';
    return state.toUpperCase();
  } catch {
    return 'DISCONNECTED';
  }
}

export async function disconnectEvolutionInstance(instanceName: string, creds: EvolutionCreds): Promise<void> {
  try {
    const api = makeApi(creds);
    await api.delete(`/instance/logout/${instanceName}`);
  } catch { /* ignore */ }
}

export async function deleteEvolutionInstance(instanceName: string, creds: EvolutionCreds): Promise<void> {
  try {
    const api = makeApi(creds);
    await api.delete(`/instance/delete/${instanceName}`);
  } catch { /* ignore */ }
}

export async function sendEvolutionMessage(
  instanceName: string,
  to: string,
  text: string,
  creds?: EvolutionCreds,
): Promise<void> {
  const effectiveCreds = creds || {
    url: process.env.EVOLUTION_API_URL || '',
    key: process.env.EVOLUTION_API_KEY || '',
  };
  if (!effectiveCreds.url || !effectiveCreds.key) {
    console.warn('[Evolution] URL/key not configured');
    return;
  }
  const api = makeApi(effectiveCreds);
  await api.post(`/message/sendText/${instanceName}`, {
    number: to,
    textMessage: { text },
  });
}
