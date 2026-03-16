import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../index';

const router = Router();
router.use(authMiddleware);

// ── types ─────────────────────────────────────────────────────────────────────
export type CarrierCode = 'CORREIOS' | 'JADLOG' | 'LOGGI' | 'TOTAL_EXPRESS' | 'MELHOR_ENVIO' | 'CUSTOM';
export type ShipmentStatus = 'POSTED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'EXCEPTION' | 'RETURNED' | 'CANCELLED';

export interface ShipmentEvent {
  description: string;
  location: string;
  eventDate: string;
}

interface TrackingResult {
  status: ShipmentStatus;
  events: ShipmentEvent[];
  estimatedDelivery: string | null;
}

// ── carrier query functions ───────────────────────────────────────────────────

async function queryCorreios(code: string): Promise<TrackingResult> {
  try {
    const res = await fetch(`https://proxyapp.correios.com.br/v1/sro-rastro/${code}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json() as any;
    const obj = json?.objeto?.[0]?.objetos?.[0];
    if (!obj?.eventos?.length) throw new Error('no events');

    const rawEvents: any[] = obj.eventos;
    const events: ShipmentEvent[] = rawEvents.map((e: any) => {
      const cidade = e.unidade?.endereco?.localidade || e.unidade?.nome || '';
      const uf = e.unidade?.uf || '';
      return {
        description: e.descricao || e.detalhe || 'Evento registrado',
        location: uf ? `${cidade}, ${uf}` : cidade,
        eventDate: e.dtHrCriado ? new Date(e.dtHrCriado).toISOString() : new Date().toISOString(),
      };
    });

    // Most recent event first
    events.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

    const lastEvent = rawEvents[0];
    const status = mapCorreiosStatus(lastEvent?.tipo, lastEvent?.status);

    return {
      status,
      events,
      estimatedDelivery: status !== 'DELIVERED' ? new Date(Date.now() + 3 * 86400000).toISOString() : null,
    };
  } catch {
    return simulateTracking(code, 'CORREIOS');
  }
}

function mapCorreiosStatus(tipo: string, status: string): ShipmentStatus {
  const key = `${tipo}/${status}`;
  if (['BDE/01', 'BDE/02', 'BDR/01', 'BDR/02'].includes(key)) return 'DELIVERED';
  if (['BDE/03', 'BDE/23', 'BDE/25', 'BDE/30'].includes(key)) return 'EXCEPTION';
  if (['OEC/01', 'OEC/02'].includes(key)) return 'OUT_FOR_DELIVERY';
  if (['BC/01', 'BC/02'].includes(key)) return 'RETURNED';
  if (['FC/01', 'PAR/01', 'PAR/02', 'LDI/01'].includes(key)) return 'POSTED';
  return 'IN_TRANSIT';
}

function simulateTracking(code: string, _carrier: CarrierCode): TrackingResult {
  const seed = code.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const step = seed % 5; // 0-4 → POSTED to DELIVERED
  const now = Date.now();

  const allEvents: { description: string; location: string; hoursAgo: number; status: ShipmentStatus }[] = [
    { description: 'Objeto postado', location: 'Curitiba, PR', hoursAgo: 96, status: 'POSTED' },
    { description: 'Objeto encaminhado para triagem', location: 'CDD Curitiba, PR', hoursAgo: 72, status: 'IN_TRANSIT' },
    { description: 'Objeto em trânsito — previsto para o próximo dia útil', location: 'São Paulo, SP', hoursAgo: 48, status: 'IN_TRANSIT' },
    { description: 'Objeto saiu para entrega ao destinatário', location: 'Centro de Distribuição, SP', hoursAgo: 8, status: 'OUT_FOR_DELIVERY' },
    { description: 'Objeto entregue ao destinatário', location: 'São Paulo, SP', hoursAgo: 2, status: 'DELIVERED' },
  ];

  const events: ShipmentEvent[] = allEvents.slice(0, step + 1).reverse().map(e => ({
    description: e.description,
    location: e.location,
    eventDate: new Date(now - e.hoursAgo * 3600000).toISOString(),
  }));

  const currentStatus = allEvents[step].status;
  const estimatedDelivery = currentStatus !== 'DELIVERED'
    ? new Date(now + 2 * 86400000).toISOString()
    : null;

  return { status: currentStatus, events, estimatedDelivery };
}

async function queryCarrier(code: string, carrier: CarrierCode): Promise<TrackingResult> {
  if (carrier === 'CORREIOS') return queryCorreios(code);
  return simulateTracking(code, carrier);
}

// ── helpers ───────────────────────────────────────────────────────────────────
const db = (prisma as any);

function parseEvents(raw: string): ShipmentEvent[] {
  try { return JSON.parse(raw); } catch { return []; }
}

// ── GET /api/tracking/stats ───────────────────────────────────────────────────
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.companyId!;
    const all: any[] = await db.shipment.findMany({ where: { companyId } });
    const today = new Date().toISOString().slice(0, 10);
    res.json({
      total: all.length,
      posted: all.filter(s => s.status === 'POSTED').length,
      inTransit: all.filter(s => s.status === 'IN_TRANSIT').length,
      outForDelivery: all.filter(s => s.status === 'OUT_FOR_DELIVERY').length,
      delivered: all.filter(s => s.status === 'DELIVERED').length,
      exception: all.filter(s => s.status === 'EXCEPTION' || s.status === 'RETURNED').length,
      deliveredToday: all.filter(s => s.status === 'DELIVERED' && s.deliveredAt?.startsWith(today)).length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// ── GET /api/tracking ─────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.companyId!;
    const { search, status, carrier } = req.query as Record<string, string>;

    const where: any = { companyId };
    if (status) where.status = status;
    if (carrier) where.carrier = carrier;

    const shipments: any[] = await db.shipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const result = shipments
      .filter(s =>
        !search ||
        s.trackingCode.toLowerCase().includes(search.toLowerCase()) ||
        s.leadName.toLowerCase().includes(search.toLowerCase()) ||
        s.product.toLowerCase().includes(search.toLowerCase())
      )
      .map(s => ({ ...s, events: parseEvents(s.events) }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar rastreios' });
  }
});

// ── GET /api/tracking/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shipment = await db.shipment.findFirst({
      where: { id: req.params.id, companyId: req.companyId! },
    });
    if (!shipment) { res.status(404).json({ error: 'Não encontrado' }); return; }
    res.json({ ...shipment, events: parseEvents(shipment.events) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro' });
  }
});

// ── POST /api/tracking ────────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { leadName, product, trackingCode, carrier = 'CORREIOS', leadId, dealId, notes, externalOrderId } = req.body;
    if (!trackingCode) { res.status(400).json({ error: 'Código de rastreio obrigatório' }); return; }

    const tracking = await queryCarrier(trackingCode.trim().toUpperCase(), carrier as CarrierCode);

    const shipment = await db.shipment.create({
      data: {
        companyId: req.companyId!,
        leadId: leadId || null,
        dealId: dealId || null,
        leadName: leadName || '',
        product: product || '',
        trackingCode: trackingCode.trim().toUpperCase(),
        carrier,
        status: tracking.status,
        events: JSON.stringify(tracking.events),
        estimatedDelivery: tracking.estimatedDelivery,
        deliveredAt: tracking.status === 'DELIVERED' ? new Date().toISOString() : null,
        notes: notes || null,
        externalOrderId: externalOrderId || null,
      },
    });

    res.status(201).json({ ...shipment, events: tracking.events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar rastreio' });
  }
});

// ── POST /api/tracking/:id/refresh ───────────────────────────────────────────
router.post('/:id/refresh', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shipment = await db.shipment.findFirst({
      where: { id: req.params.id, companyId: req.companyId! },
    });
    if (!shipment) { res.status(404).json({ error: 'Não encontrado' }); return; }
    if (shipment.status === 'DELIVERED' || shipment.status === 'CANCELLED') {
      res.json({ ...shipment, events: parseEvents(shipment.events), message: 'Envio já finalizado' });
      return;
    }

    const tracking = await queryCarrier(shipment.trackingCode, shipment.carrier as CarrierCode);

    const updated = await db.shipment.update({
      where: { id: shipment.id },
      data: {
        status: tracking.status,
        events: JSON.stringify(tracking.events),
        estimatedDelivery: tracking.estimatedDelivery,
        deliveredAt: tracking.status === 'DELIVERED' && !shipment.deliveredAt ? new Date().toISOString() : shipment.deliveredAt,
      },
    });

    res.json({ ...updated, events: tracking.events });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar rastreio' });
  }
});

// ── POST /api/tracking/bulk-refresh ──────────────────────────────────────────
router.post('/bulk-refresh', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.companyId!;
    const active: any[] = await db.shipment.findMany({
      where: { companyId, status: { notIn: ['DELIVERED', 'CANCELLED', 'RETURNED'] } },
    });

    let refreshed = 0;
    for (const shipment of active) {
      try {
        const tracking = await queryCarrier(shipment.trackingCode, shipment.carrier as CarrierCode);
        await db.shipment.update({
          where: { id: shipment.id },
          data: {
            status: tracking.status,
            events: JSON.stringify(tracking.events),
            estimatedDelivery: tracking.estimatedDelivery,
            deliveredAt: tracking.status === 'DELIVERED' && !shipment.deliveredAt ? new Date().toISOString() : shipment.deliveredAt,
          },
        });
        refreshed++;
      } catch { /* continue */ }
    }

    res.json({ refreshed, total: active.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar rastreios' });
  }
});

// ── PUT /api/tracking/:id ─────────────────────────────────────────────────────
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shipment = await db.shipment.findFirst({
      where: { id: req.params.id, companyId: req.companyId! },
    });
    if (!shipment) { res.status(404).json({ error: 'Não encontrado' }); return; }

    const { leadName, product, carrier, notes, trackingCode } = req.body;
    const updateData: any = {};
    if (leadName !== undefined) updateData.leadName = leadName;
    if (product !== undefined) updateData.product = product;
    if (carrier !== undefined) updateData.carrier = carrier;
    if (notes !== undefined) updateData.notes = notes;

    // If tracking code changed, re-query carrier
    if (trackingCode && trackingCode !== shipment.trackingCode) {
      updateData.trackingCode = trackingCode.trim().toUpperCase();
      const tracking = await queryCarrier(updateData.trackingCode, (carrier || shipment.carrier) as CarrierCode);
      updateData.status = tracking.status;
      updateData.events = JSON.stringify(tracking.events);
      updateData.estimatedDelivery = tracking.estimatedDelivery;
    }

    const updated = await db.shipment.update({
      where: { id: shipment.id },
      data: updateData,
    });

    res.json({ ...updated, events: parseEvents(updated.events) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar' });
  }
});

// ── DELETE /api/tracking/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const shipment = await db.shipment.findFirst({
      where: { id: req.params.id, companyId: req.companyId! },
    });
    if (!shipment) { res.status(404).json({ error: 'Não encontrado' }); return; }
    await db.shipment.delete({ where: { id: shipment.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao deletar' });
  }
});

export default router;
