
const API_URL = (
  process.env.NEXFAY_API_URL ||
  'https://nexfay.com.br/api/public/v1'
).replace(/\/$/, '');

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
    req.headers['idempotency-key'] ||
    input.idempotencyKey ||
    ''
  ).trim();

  // Validar valor e oferta
  if (!Number.isInteger(amount) || !OFFERS[amount]) {
    return res.status(400).json({
      success: false,
      message: 'Valor inválido ou oferta não configurada na Vercel.',
    });
  }

  const offerId = String(OFFERS[amount]).trim();

  if (!offerId) {
    return res.status(400).json({
      success: false,
      message: `A oferta de R$ ${amount} não está configurada na Vercel.`,
    });
  }

  // Validar nome
  if (name.length < 2 || name.length > 200) {
    return res.status(400).json({
      success: false,
      message: 'Nome do cliente inválido.',
    });
  }

  // Validar e-mail
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'E-mail inválido.',
    });
  }

  // Validar chave de idempotência
  if (
    idempotencyKey.length < 16 ||
    idempotencyKey.length > 128 ||
    !/^[a-zA-Z0-9_-]+$/.test(idempotencyKey)
  ) {
    return res.status(400).json({
      success: false,
      message: 'Chave de idempotência inválida. Atualize a página e tente novamente.',
    });
  }

  const payload = {
    offer_id: offerId,
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

    // Tratamento de erros da NexFay
    if (!response.ok) {
      const messages = {
        400: 'Dados inválidos enviados para a NexFay.',
        401: 'Credencial NexFay inválida. Confira a NEXFAY_API_KEY.',
        403: 'A conta NexFay não está autorizada a criar cobranças.',
        404: 'Oferta não encontrada. Confira o ID da oferta na Vercel.',
        409: 'Esta chave já foi utilizada com dados diferentes. Não gere outra cobrança.',
        413: 'A solicitação enviada excedeu o limite permitido.',
        422: 'A NexFay recusou os dados da cobrança.',
        429: 'Limite de requisições atingido. Aguarde antes de tentar novamente.',
        503: 'NexFay temporariamente indisponível. Tente novamente mantendo a mesma chave.',
      };

      return res.status(response.status).json({
        success: false,
        message:
          result.message ||
          result.error ||
          messages[response.status] ||
          'Não foi possível criar a cobrança Pix.',
        requestId: result.request_id || null,
        retryWithSameKey: [202, 503].includes(response.status),
      });
    }

    const charge = result.data || result;
    const pix = charge.pix || {};

    // A NexFay ainda está processando a cobrança.
    // Não informar que o Pix está pronto enquanto não houver confirmação.
    if (response.status === 202) {
      return res.status(202).json({
        success: false,
        processing: true,
        message:
          result.message ||
          'Sua cobrança está em processamento. Consulte novamente usando a mesma chave.',
        data: {
          transactionId: charge.transaction_id || charge.id || null,
          orderId: charge.order_id || null,
          status: charge.status || 'processing',
          requestId: charge.request_id || null,
        },
        retryWithSameKey: true,
      });
    }

    const transactionId =
      charge.transaction_id ||
      charge.id ||
      null;

    const copyPaste =
      typeof pix.copy_paste === 'string'
        ? pix.copy_paste
        : '';

    const qrCode =
      typeof pix.qr_code === 'string'
        ? pix.qr_code
        : '';

    // Não retornar sucesso se a cobrança não trouxe dados essenciais.
    if (!transactionId || (!copyPaste && !qrCode)) {
      console.error('Resposta NexFay sem dados completos:', {
        status: response.status,
        requestId: charge.request_id || null,
        transactionId,
        hasCopyPaste: Boolean(copyPaste),
        hasQrCode: Boolean(qrCode),
      });

      return res.status(502).json({
        success: false,
        message: 'A NexFay não retornou os dados completos do Pix. Consulte a cobrança antes de tentar novamente.',
        requestId: charge.request_id || null,
        retryWithSameKey: true,
      });
    }

    return res.status(response.status === 201 ? 201 : 200).json({
      success: true,
      data: {
        transactionId,
        orderId: charge.order_id || null,
        status: charge.status || 'pending',
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
        requestId: charge.request_id || null,
      },
    });
  } catch (error) {
    console.error('Erro de comunicação com a NexFay:', error);

    return res.status(502).json({
      success: false,
      message: 'Não foi possível conectar à NexFay. Consulte a cobrança antes de tentar novamente.',
      retryWithSameKey: true,
    });
  }
}
