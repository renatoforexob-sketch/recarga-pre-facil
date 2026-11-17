
const API_URL = (process.env.NEXFAY_API_URL || 'https://nexfay.com.br/api/public/v1').replace(/\/$/, '');

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido.',
    });
  }

  const apiKey = process.env.NEXFAY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: 'NEXFAY_API_KEY não está configurada na Vercel.',
    });
  }

  const input = req.body || {};
  const amount = Number(input.amount);
  const customer = input.customer || {};
  const name = String(customer.name || '').trim();
  const email = String(customer.email || '').trim().toLowerCase();
  const phone = String(customer.phone || '').replace(/\D/g, '');
  const idempotencyKey = String(
    req.headers['idempotency-key'] || input.idempotencyKey || ''
  ).trim();

  if (!Number.isInteger(amount) || !OFFERS[amount]) {
    return res.status(400).json({
      success: false,
      message: 'Valor de recarga inválido ou oferta não configurada.',
    });
  }

  if (!OFFERS[amount]) {
    return res.status(400).json({
      success: false,
      message: `A oferta de R$ ${amount} não está configurada na Vercel.`,
    });
  }

  if (name.length < 2 || name.length > 200) {
    return res.status(400).json({
      success: false,
      message: 'Informe o nome do cliente com pelo menos 2 caracteres.',
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Informe um e-mail válido.',
    });
  }

  if (idempotencyKey.length < 16 || idempotencyKey.length > 128) {
    return res.status(400).json({
      success: false,
      message: 'Chave de idempotência inválida. Atualize a página e tente novamente.',
    });
  }

  const payload = {
    offer_id: OFFERS[amount],
    customer: {
      name,
      email,
      ...(phone ? { phone } : {}),
    },
    quantity: 1,
  };

  try {
    const response = await fetch(`${API_URL}/pix/charges`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    const charge = result.data || result;

    if (!response.ok) {
      const messages = {
        401: 'Credencial NexFay inválida. Confira a NEXFAY_API_KEY.',
        403: 'A conta NexFay não está autorizada a criar cobranças.',
        404: 'Oferta não encontrada. Confira o ID da oferta na Vercel.',
        409: 'Esta chave já foi usada com dados diferentes. Não gere outra cobrança automaticamente.',
        422: 'A NexFay recusou os dados da cobrança.',
        429: 'Limite de requisições atingido. Aguarde e tente novamente.',
        503: 'NexFay temporariamente indisponível. Tente novamente mantendo a mesma chave.',
      };

      return res.status(response.status).json({
        success: false,
        message: result.message || result.error || messages[response.status] || 'Não foi possível criar a cobrança Pix.',
        requestId: result.request_id || null,
        retryWithSameKey: [202, 503].includes(response.status),
      });
    }

    const pix = charge.pix || {};

    return res.status(response.status === 201 ? 201 : 200).json({
      success: true,
      data: {
        transactionId: charge.transaction_id || charge.id || null,
        orderId: charge.order_id || null,
        status: charge.status || 'pending',
        amount: charge.amount_cents ?? null,
        fee: charge.fee_cents ?? null,
        paymentData: {
          copyPaste: pix.copy_paste || '',
          qrCode: pix.qr_code || '',
          qrCodeBase64: pix.qr_code || null,
        },
        expiresAt: pix.expires_at || null,
        createdAt: charge.created_at || null,
        requestId: charge.request_id || null,
      },
    });
  } catch (error) {
    console.error('Erro NexFay:', error);

    return res.status(502).json({
      success: false,
      message: 'Não foi possível conectar à NexFay. Tente novamente usando a mesma cobrança.',
      retryWithSameKey: true,
    });
  }
}
