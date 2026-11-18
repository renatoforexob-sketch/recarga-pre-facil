
import { createHmac, timingSafeEqual } from 'node:crypto';

const REDIS_URL = (
  process.env.KV_REST_API_URL || ''
).replace(/\/+$/, '');

const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || '';

const WEBHOOK_SECRET =
  process.env.NEXFAY_WEBHOOK_SECRET || '';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk)
    );
  }

  return Buffer.concat(chunks);
}

async function redisCommand(parts) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Redis não configurado.');
  }

  const path = parts
    .map(value => encodeURIComponent(String(value)))
    .join('/');

  const response = await fetch(`${REDIS_URL}/${path}`, {
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
    },
    signal: AbortSignal.timeout(10000),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.error) {
    throw new Error(
      data.error || `Redis HTTP ${response.status}`
    );
  }

  return data.result;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));

  return (
    left.length === right.length &&
    timingSafeEqual(left, right)
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');

    return res.status(405).json({
      success: false,
      message: 'Método não permitido.',
    });
  }

  if (!WEBHOOK_SECRET || !REDIS_URL || !REDIS_TOKEN) {
    return res.status(500).json({
      success: false,
      message: 'Webhook ou Redis não configurado.',
    });
  }

  try {
    const rawBody = await readRawBody(req);

    const eventId = String(
      req.headers['x-nexfay-event-id'] || ''
    );

    const timestamp = String(
      req.headers['x-nexfay-timestamp'] || ''
    );

    const signature = String(
      req.headers['x-nexfay-signature'] || ''
    );

    const timestampNumber = Number(timestamp);

    if (
      !eventId ||
      !/^\d+$/.test(timestamp) ||
      !signature.startsWith('v1=')
    ) {
      return res.status(400).json({
        success: false,
        message: 'Cabeçalhos do webhook inválidos.',
      });
    }

    // Aceita apenas eventos com até 5 minutos de diferença.
    if (
      !Number.isFinite(timestampNumber) ||
      Math.abs(Date.now() / 1000 - timestampNumber) > 300
    ) {
      return res.status(401).json({
        success: false,
        message: 'Timestamp do webhook inválido ou expirado.',
      });
    }

    // Validação HMAC-SHA256.
    const signedPayload =
      `${timestamp}.${eventId}.${rawBody.toString('utf8')}`;

    const expectedSignature =
      'v1=' +
      createHmac('sha256', WEBHOOK_SECRET)
        .update(signedPayload)
        .digest('hex');

    if (!safeEqual(signature, expectedSignature)) {
      return res.status(401).json({
        success: false,
        message: 'Assinatura do webhook inválida.',
      });
    }

    const event = JSON.parse(rawBody.toString('utf8'));

    const transactionId = String(
      event?.data?.transaction_id ||
      event?.data?.id ||
      ''
    );

    const eventName = String(
      event?.event || ''
    ).toLowerCase();

    const incomingStatus = String(
      event?.data?.status ||
      eventName.replace(/^payment\./, '') ||
      ''
    ).toLowerCase();

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'ID da transação ausente.',
      });
    }

    // Evita processar o mesmo evento mais de uma vez.
    const dedupe = await redisCommand([
      'SET',
      `recarga:event:${eventId}`,
      '1',
      'NX',
      'EX',
      2592000,
    ]);

    if (dedupe !== 'OK') {
      return res.status(200).json({
        success: true,
        duplicate: true,
      });
    }

    const orderKey = `recarga:order:${transactionId}`;

    const stored = await redisCommand([
      'GET',
      orderKey,
    ]);

    if (!stored) {
      // Permite que a NexFay tente entregar o evento novamente.
      await redisCommand([
        'DEL',
        `recarga:event:${eventId}`,
      ]);

      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado no Redis.',
      });
    }

    const order = JSON.parse(stored);

    const statusMap = {
      'payment.created': 'pending',
      'payment.pending': 'pending',
      'payment.approved': 'paid',
      'payment.failed': 'failed',
      'payment.cancelled': 'cancelled',
      'payment.expired': 'expired',
      'payment.refunded': 'refunded',
    };

    const status =
      statusMap[eventName] ||
      incomingStatus ||
      order.status;

    order.status = status;
    order.lastEventId = eventId;
    order.updatedAt = new Date().toISOString();

    if (status === 'paid' || status === 'approved') {
      order.status = 'paid';

      order.paidAt =
        event?.data?.paid_at ||
        event?.created_at ||
        order.updatedAt;
    }

    await redisCommand([
      'SET',
      orderKey,
      JSON.stringify(order),
      'EX',
      7776000,
    ]);

    return res.status(200).json({
      success: true,
      received: true,
    });

  } catch (error) {
    console.error(
      'Erro no webhook NexFay:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message: 'Falha ao processar webhook.',
    });
  }
}
