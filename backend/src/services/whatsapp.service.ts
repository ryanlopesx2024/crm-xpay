import axios from 'axios';

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    console.warn('WhatsApp credentials not configured');
    return;
  }

  await axios.post(
    `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    },
    {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    }
  );
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  components: unknown[]
): Promise<void> {
  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) return;

  await axios.post(
    `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: 'pt_BR' },
        components,
      },
    },
    {
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` },
    }
  );
}
