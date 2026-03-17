import axios from 'axios';
import QRCode from 'qrcode';

// ── per-channel credentials ────────────────────────────────────────────────
export interface EvolutionCreds {
  url: string;
  key: string;
}

function makeApi(creds: EvolutionCreds) {
  return axios.create({
    baseURL: creds.url.replace(/\/$/, ''),
    headers: { apikey: creds.key },
    timeout: 15000,
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

// ── converte raw QR code string → data URL base64 ─────────────────────────
async function rawCodeToBase64(code: string): Promise<string> {
  try {
    return await QRCode.toDataURL(code, { width: 300, margin: 2 });
  } catch {
    return '';
  }
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
    body.webhook = {
      url: webhookUrl,
      byEvents: true,
      base64: true,
      events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT', 'SEND_MESSAGE'],
    };
  }

  const { data } = await api.post('/instance/create', body);

  // v1: data.qrcode.base64 or data.base64 (already a data URL or base64 string)
  const v1Base64: string = data?.qrcode?.base64 || data?.base64 || '';
  if (v1Base64) return { qrcode: v1Base64 };

  // v2: create doesn't return QR → fetch it via connect endpoint
  const qr = await getEvolutionQRCode(instanceName, creds);
  return { qrcode: qr };
}

export async function getEvolutionQRCode(instanceName: string, creds: EvolutionCreds): Promise<string> {
  const api = makeApi(creds);
  const { data } = await api.get(`/instance/connect/${instanceName}`);

  // v1 format
  const v1Base64: string = data?.qrcode?.base64 || data?.base64 || '';
  if (v1Base64) return v1Base64;

  // v2 format: { pairingCode, code, count }
  const rawCode: string = data?.code || '';
  if (rawCode) return rawCodeToBase64(rawCode);

  return '';
}

export async function getEvolutionStatus(instanceName: string, creds: EvolutionCreds): Promise<string> {
  try {
    const api = makeApi(creds);
    const { data } = await api.get(`/instance/connectionState/${instanceName}`);
    const state: string = data?.instance?.state || data?.state || 'DISCONNECTED';
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
