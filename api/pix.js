
const API_URL =
  `${process.env.NEXFAY_API_URL || 'https://nexfay.com.br/api/public/v1'}/pix/charges`;

function json(res, status, body) {
  return res.status(status).json(body);
}

function makeIdempotencyKey() {
  return `RTH-${crypto.randomUUID()}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, {
      success: false,
      message: 'Método não permitido.'
    });
  }

  const apiKey = process.env.NEXFAY_API_KEY;

  if (!apiKey) {
    return json(res, 500, {
      success: false,
      message: 'NEXFAY_API_KEY não configurada na Vercel.'
    });
  }

  const input = req.body || {};
  const metadata =
    input.metadata && typeof input.metadata === 'object'
      ? input.metadata
      : {};

  const amount = Number(input.amount);

  if (!Number.isFinite(amount) || amount < 0.01 || amount > 1000) {
    return json(res, 400, {
      success: false,
      message: 'Valor de recarga inválido.'
    });
  }

  // Mapeamento das ofertas cadastradas na NexFay.
  const offers = {
    '10.00': process.env.NEXFAY_OFFER_10,
    '20.00': process.env.NEXFAY_OFFER_20,
    '30.00': process.env.NEXFAY_OFFER_30,
    '50.00': process.env.NEXFAY_OFFER_50,
    '100.00': process.env.NEXFAY_OFFER_100
  };

  const offerId = offers[amount.toFixed(2)];

  if (!offerId) {
    return json(res, 422, {
      success: false,
      message: 'Não existe uma oferta NexFay configurada para este valor.'
    });
  }

  const customerName = String(input.customer?.name || input.name || '').trim();
  const customerEmail = String(input.customer?.email || input.email || '').trim();
  const customerPhone = String(
    input.customer?.phone || metadata.telefone || ''
  ).trim();

  if (customerName.length < 2 || customerName.length > 200) {
    return json(res, 400, {
      success: false,
      message: 'Nome do cliente inválido.'
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return json(res, 400, {
      success: false,
      message: 'E-mail do cliente inválido.'
    });
  }

  const idempotencyKey = makeIdempotencyKey();

  const payload = {
    offer_id: offerId,
    customer: {
      name: customerName,
      email: customerEmail,
      ...(customerPhone ? { phone: customerPhone } : {})
    },
    quantity: 1
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (![200, 201, 202].includes(response.status)) {
      return json(res, response.status, {
        success: false,
        message:
          data.message ||
          data.error ||
          'Não foi possível gerar o PIX NexFay.',
        requestId: data.request_id || null
      });
    }

    const pix = data.pix || {};

    if (!data.transaction_id) {
      return json(res, 502, {
        success: false,
        message: 'A NexFay não retornou o identificador da transação.',
        requestId: data.request_id || null
      });
    }

    return json(res, response.status, {
      success: true,
      data: {
        transactionId: data.transaction_id,
        orderId: data.order_id || null,
        status: data.status || 'pending',
        amount: data.amount_cents,
        amountDisplay:
          typeof data.amount_cents === 'number'
            ? (data.amount_cents / 100).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })
            : null,
        paymentData: {
          copyPaste: pix.copy_paste || '',
          qrCodeBase64: null,
          qrCode: pix.qr_code || ''
        },
        expiresAt: pix.expires_at || null,
        requestId: data.request_id || null
      }
    });
  } catch (error) {
    console.error('Erro NexFay:', error.message);

    return json(res, 502, {
      success: false,
      message: 'Falha de comunicação com a NexFay.'
    });
  }
}
