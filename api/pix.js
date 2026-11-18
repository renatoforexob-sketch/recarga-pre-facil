
const API_URL = (
  process.env.NEXFAY_API_URL ||
  'https://nexfay.com.br/api/public/v1'
).replace(/\/+$/, '');

const REDIS_URL = (process.env.KV_REST_API_URL || '').replace(/\/+$/, '');
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || '';

const OFFERS = {
  20: process.env.NEXFAY_OFFER_20,
  25: process.env.NEXFAY_OFFER_25,
  30: process.env.NEXFAY_OFFER_30,
  35: process.env.NEXFAY_OFFER_35,
  40: process.env.NEXFAY_OFFER_40,
  50: process.env.NEXFAY_OFFER_50,
  60: process.env.NEXFAY_OFFER_60,
  70: process.env.NEXFAY_OFFER_70,
  100: process.env.NEXFAY_OFFER_100,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function redisCommand(parts) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    throw new Error('Redis não configurado.');
  }

  const path = parts.map(v => encodeURIComponent(String(v))).join('/');

  const response = await fetch(`${REDIS_URL}/${path}`, {
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
    },
    signal: AbortSignal.timeout(10000),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.error) {
    throw new Error(data.error || `Redis HTTP ${response.status}`);
  }

  return data.result;
}

function sendError(res, status, message, extra = {}) {
  return res.status(status).json({
    success: false,
    message,
    ...extra,
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'Método não permitido.');
  }

  const apiKey = String(process.env.NEXFAY_API_KEY || '').trim();

  if (!apiKey) {
    return sendError(res, 500, 'NEXFAY_API_KEY não configurada.');
  }

  if (!REDIS_URL || !REDIS_TOKEN) {
    return sendError(res, 500, 'Redis não configurado.');
  }

  if (!API_URL.startsWith('https://')) {
    return sendError(res, 500, 'NEXFAY_API_URL inválida.');
  }

  const input = req.body || {};
  const customer = input.customer || {};
  const recharge = input.recharge || {};

  const amount = Number(input.amount);
  const name = String(customer.name || '').trim();
  const email = String(customer.email || '').trim().toLowerCase();
  const customerPhone = String(customer.phone || '').replace(/\D/g, '');

  const targetPhone = String(recharge.phone || '').replace(/\D/g, '');
  const operator = String(recharge.operator || '').trim().toLowerCase();
  const operatorName = String(recharge.operatorName || '').trim();
  const bonus = String(recharge.bonus || '').trim();

  const idempotencyKey = String(
    req.headers['idempotency-key'] ||
    input.idempotencyKey ||
    ''
  ).trim();

  if (!Number.isInteger(amount) || !Object.hasOwn(OFFERS, amount)) {
    return sendError(res, 400, 'Valor de recarga inválido.');
  }

  const offerId = String(OFFERS[amount] || '').trim();

  if (!UUID_REGEX.test(offerId)) {
    return sendError(
      res,
      400,
      `ID da oferta de R$ ${amount} inválido.`
    );
  }

  if (name.length < 2 || name.length > 200) {
    return sendError(res, 400, 'Nome inválido.');
  }

  if (!EMAIL_REGEX.test(email)) {
    return sendError(res, 400, 'E-mail inválido.');
  }

  if (targetPhone.length < 10 || targetPhone.length > 11) {
    return sendError(res, 400, 'Número de recarga inválido.');
  }

  if (!/^[a-z0-9-]{2,40}$/.test(operator)) {
    return sendError(res, 400, 'Operadora inválida.');
  }

  if (
    idempotencyKey.length < 16 ||
    idempotencyKey.length > 128 ||
    !/^[a-zA-Z0-9_-]+$/.test(idempotencyKey)
  ) {
    return sendError(res, 400, 'Chave de idempotência inválida.');
  }

  const payload = {
    offer_id: offerId,
    customer: {
      name,
      email,
      ...(customerPhone ? { phone: customerPhone } : {}),
    },
    quantity: 1,
  };

  try {
    const response = await fetch(`${API_URL}/pix/charges`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000),
    });

    const result = await response.json().catch(() => ({}));
    const charge = result.data || result;

    if (!response.ok) {
      return sendError(
        res,
        response.status,
        result.message || result.error || 'Erro ao criar Pix.',
        {
          retryWithSameKey: [202, 503].includes(response.status),
        }
      );
    }

    const transactionId = charge.transaction_id || charge.id || null;
    const pix = charge.pix || {};

    const copyPaste =
      typeof pix.copy_paste === 'string' ? pix.copy_paste : '';

    const qrCode =
      typeof pix.qr_code === 'string' ? pix.qr_code : '';

    if (!transactionId) {
      return sendError(
        res,
        502,
        'A NexFay não retornou o ID da cobrança.',
        { retryWithSameKey: true }
      );
    }

    const order = {
      transactionId: String(transactionId),
      orderId: charge.order_id || null,
      idempotencyKey,
      amount,
      phone: targetPhone,
      operator,
      operatorName,
      bonus,
      status: String(charge.status || 'pending').toLowerCase(),
      createdAt: new Date().toISOString(),
      paidAt: charge.paid_at || null,
    };

    await redisCommand([
      'SET',
      `recarga:order:${transactionId}`,
      JSON.stringify(order),
      'EX',
      7776000,
    ]);

    await redisCommand([
      'SET',
      `recarga:idempotency:${idempotencyKey}`,
      String(transactionId),
      'EX',
      7776000,
    ]);

    if (!copyPaste && !qrCode) {
      return sendError(
        res,
        502,
        'Cobrança criada, mas os dados Pix não foram retornados.',
        {
          transactionId,
          retryWithSameKey: true,
        }
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        transactionId,
        orderId: charge.order_id || null,
        status: order.status,
        amount: charge.amount_cents ?? null,
        fee: charge.fee_cents ?? null,
        paymentData: {
          copyPaste,
          qrCode,
          qrCodeBase64: qrCode || null,
        },
        expiresAt: pix.expires_at || null,
        createdAt: charge.created_at || null,
        paidAt: charge.paid_at || null,
      },
    });

  } catch (error) {
    console.error('Erro ao criar Pix:', error.message);

    return sendError(
      res,
      502,
      'Não foi possível criar ou registrar o Pix. Consulte antes de tentar novamente.',
      { retryWithSameKey: true }
    );
  }
}
