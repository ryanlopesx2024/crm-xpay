import axios from 'axios';

const GRAPH_URL = 'https://graph.facebook.com/v19.0';

export interface CloudCreds {
  phoneNumberId: string;
  accessToken: string;
}

export function getCloudCredsFromConfig(config: Record<string, unknown>): CloudCreds {
  return {
    phoneNumberId: (config.phoneNumberId as string) || '',
    accessToken:   (config.accessToken   as string) || process.env.WHATSAPP_CLOUD_TOKEN || '',
  };
}

function makeCloudApi(token: string) {
  return axios.create({
    baseURL: GRAPH_URL,
    headers: { Authorization: `Bearer ${token}` },
    timeout: 12000,
  });
}

// ── Enviar mensagem de texto ──────────────────────────────────────────────────
export async function sendCloudTextMessage(
  to: string,
  text: string,
  creds: CloudCreds,
): Promise<void> {
  const api = makeCloudApi(creds.accessToken);
  await api.post(`/${creds.phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to.replace(/\D/g, ''), // apenas dígitos
    type: 'text',
    text: { preview_url: false, body: text },
  });
}

// ── Marcar mensagem como lida ─────────────────────────────────────────────────
export async function markCloudMessageRead(
  messageId: string,
  creds: CloudCreds,
): Promise<void> {
  try {
    const api = makeCloudApi(creds.accessToken);
    await api.post(`/${creds.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
  } catch { /* ignorar erros de leitura */ }
}

// ── Buscar URL de mídia ───────────────────────────────────────────────────────
export async function getCloudMediaUrl(
  mediaId: string,
  token: string,
): Promise<string> {
  try {
    const api = makeCloudApi(token);
    const { data } = await api.get(`/${mediaId}`);
    return data?.url || '';
  } catch {
    return '';
  }
}

// ── Verificar credenciais ─────────────────────────────────────────────────────
export async function verifyCloudCredentials(creds: CloudCreds): Promise<{ ok: boolean; phone?: string; error?: string }> {
  try {
    const api = makeCloudApi(creds.accessToken);
    const { data } = await api.get(`/${creds.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`);
    return {
      ok: true,
      phone: data.display_phone_number,
    };
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message || err?.message || 'Credenciais inválidas';
    return { ok: false, error: msg };
  }
}
