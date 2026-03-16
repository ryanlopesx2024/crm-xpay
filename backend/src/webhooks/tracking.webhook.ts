/**
 * Tracking Webhook — receives orders from external platforms
 * (Shopify, WooCommerce, Nuvemshop, Yampi, custom systems)
 *
 * Auth: pass your API key in the header  →  x-api-key: <key>
 *        OR in the body                  →  { "apiKey": "<key>", ... }
 *
 * POST /webhooks/tracking
 * Body:
 * {
 *   "orderId":      "12345",            // your order ID (used to avoid duplicates)
 *   "customerName": "João Silva",
 *   "product":      "Tênis Nike",
 *   "trackingCode": "AA123456789BR",
 *   "carrier":      "CORREIOS",         // CORREIOS | JADLOG | LOGGI | TOTAL_EXPRESS | MELHOR_ENVIO | CUSTOM
 *   "notes":        "Pedido urgente"    // optional
 * }
 *
 * Response 200: { "id": "...", "status": "...", "created": true/false }
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../index';

const router = Router();
const db = (prisma as any);

// ── API key auth (no session required) ───────────────────────────────────────
async function resolveCompany(req: Request): Promise<string | null> {
  const key = (req.headers['x-api-key'] as string) || req.body?.apiKey;
  if (!key) return null;
  const apiKey = await prisma.apiKey.findUnique({ where: { key } });
  if (!apiKey) return null;
  // Update last used
  await prisma.apiKey.update({ where: { key }, data: { lastUsedAt: new Date() } });
  return apiKey.companyId;
}

// ── POST /webhooks/tracking ───────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const companyId = await resolveCompany(req);
    if (!companyId) {
      res.status(401).json({ error: 'API key inválida ou ausente. Passe em x-api-key header ou body.apiKey' });
      return;
    }

    const { orderId, customerName, product, trackingCode, carrier = 'CORREIOS', notes } = req.body;

    if (!trackingCode) {
      res.status(400).json({ error: 'trackingCode é obrigatório' });
      return;
    }

    const code = String(trackingCode).trim().toUpperCase();

    // Idempotency — skip if same orderId already registered
    if (orderId) {
      const existing = await db.shipment.findFirst({
        where: { companyId, externalOrderId: String(orderId) },
      });
      if (existing) {
        res.json({
          id: existing.id,
          status: existing.status,
          created: false,
          message: 'Pedido já registrado (idempotente)',
        });
        return;
      }
    }

    // Query carrier for initial status (best-effort, 5s timeout)
    let status = 'POSTED';
    let events: object[] = [];
    let estimatedDelivery: string | null = null;

    try {
      const queryFn = await import('./tracking-query').catch(() => null);
      if (queryFn) {
        const result = await queryFn.queryCarrierPublic(code, carrier);
        status = result.status;
        events = result.events;
        estimatedDelivery = result.estimatedDelivery;
      }
    } catch { /* leave defaults */ }

    const shipment = await db.shipment.create({
      data: {
        companyId,
        leadName: customerName || '',
        product: product || '',
        trackingCode: code,
        carrier,
        status,
        events: JSON.stringify(events),
        estimatedDelivery,
        notes: notes || null,
        externalOrderId: orderId ? String(orderId) : null,
      },
    });

    res.status(201).json({
      id: shipment.id,
      status: shipment.status,
      trackingCode: shipment.trackingCode,
      created: true,
    });
  } catch (err) {
    console.error('[tracking webhook]', err);
    res.status(500).json({ error: 'Erro interno ao processar webhook' });
  }
});

// ── GET /webhooks/tracking/test ───────────────────────────────────────────────
// Quick endpoint to verify the API key works
router.get('/test', async (req: Request, res: Response): Promise<void> => {
  const companyId = await resolveCompany(req);
  if (!companyId) {
    res.status(401).json({ ok: false, error: 'API key inválida' });
    return;
  }
  res.json({ ok: true, companyId, message: 'Webhook de rastreio configurado corretamente' });
});

export default router;
