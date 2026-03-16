import axios from 'axios';

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || '';

const evolutionApi = axios.create({
  baseURL: EVOLUTION_URL,
  headers: { apikey: EVOLUTION_KEY },
});

export async function sendEvolutionMessage(instance: string, to: string, text: string): Promise<void> {
  if (!EVOLUTION_KEY) {
    console.warn('Evolution API key not configured');
    return;
  }

  await evolutionApi.post(`/message/sendText/${instance}`, {
    number: to,
    textMessage: { text },
  });
}

export async function getEvolutionQRCode(instance: string): Promise<string> {
  const { data } = await evolutionApi.get(`/instance/connect/${instance}`);
  return data.base64 || '';
}

export async function getEvolutionStatus(instance: string): Promise<string> {
  const { data } = await evolutionApi.get(`/instance/connectionState/${instance}`);
  return data.instance?.state || 'DISCONNECTED';
}

export async function createEvolutionInstance(instanceName: string): Promise<void> {
  await evolutionApi.post('/instance/create', {
    instanceName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
  });
}
