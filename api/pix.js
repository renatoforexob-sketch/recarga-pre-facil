
const API_URL = (
  process.env.NEXFAY_API_URL ||
  'https://nexfay.com.br/api/public/v1'
).replace(/\/+$/, '');

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

    return sendError(
      res,
      405,
      'Método não permitido.'
    );
  }

  // Verificar configuração da API
  const apiKey = String(
    process.env.NEXFAY_API_KEY || ''
  ).trim();

  if (!apiKey) {
    console.error(
      'NexFay: NEXFAY_API_KEY ausente no ambiente.'
    );

    return sendError(
      res,
      500,
      'NEXFAY_API_KEY não está configurada na Vercel.'
    );
  }

  if (!API_URL.startsWith('https://')) {
    return sendError(
      res,
      500,
      'NEXFAY_API_URL inválida. Utilize a URL HTTPS oficial.'
    );
  }

  // Receber dados do frontend
  const input = req.body || {};
  const amount = Number(input.amount);
  const customer = input.customer || {};

  const name = String(
    customer.name || ''
  ).trim();

  const email = String(
    customer.email || ''
  ).trim().toLowerCase();

  const phone = String(
    customer.phone || ''
  ).replace(/\D/g, '');

  const idempotencyKey = String(
    req.headers['idempotency-key'] ||
    input.idempotencyKey ||
    ''
  ).trim();

  // Validar valor
  if (!Number.isInteger(amount) || !Object.hasOwn(OFFERS, amount)) {
    return sendError(
      res,
      400,
      'Valor de recarga inválido.'
    );
  }

  // Validar oferta
  const offerId = String(
    OFFERS[amount] || ''
  ).trim();

  if (!offerId) {
    return sendError(
      res,
      400,
      `A oferta de R$ ${amount} não está configurada na Vercel.`,
      {
        missingVariable: `NEXFAY_OFFER_${amount}`,
      }
    );
  }

  if (!UUID_REGEX.test(offerId)) {
    console.error('NexFay: ID de oferta inválido.', {
      amount,
      offerLooksLikeUUID: false,
    });

    return sendError(
      res,
      400,
      `O ID da oferta de R$ ${amount} não possui formato UUID válido. Confira o painel NexFay.`,
      {
        invalidOffer: true,
      }
    );
  }

  // Validar nome
  if (name.length < 2 || name.length > 200) {
    return sendError(
      res,
      400,
      'Nome do cliente inválido.'
    );
  }

  // Validar e-mail
  if (
    email.length > 254 ||
    !EMAIL_REGEX.test(email)
  ) {
    return sendError(
      res,
      400,
      'E-mail do cliente inválido.'
    );
  }

  // Validar telefone, quando informado
  if (phone && (phone.length < 10 || phone.length > 13)) {
    return sendError(
      res,
      400,
      'Telefone do cliente inválido.'
    );
  }

  // Validar idempotência
  if (
    idempotencyKey.length < 16 ||
    idempotencyKey.length > 128 ||
    !/^[a-zA-Z0-9_-]+$/.test(idempotencyKey)
  ) {
    return sendError(
      res,
      400,
      'Chave de idempotência inválida. Atualize a página e tente novamente.'
    );
  }

  // Payload conforme a documentação NexFay
  const payload = {
    offer_id: offerId,
    customer: {
      name,
      email,
      ...(phone ? { phone } : {}),
    },
    quantity: 1,
  };

  // Diagnóstico sem expor credenciais ou dados pessoais
  console.log('Diagnóstico de criação NexFay:', {
    apiKeyConfigured: Boolean(apiKey),
    apiUrlConfigured: Boolean(API_URL),
    amount,
    offerConfigured: Boolean(offerId),
    offerLooksLikeUUID: UUID_REGEX.test(offerId),
    nameValid: name.length >= 2 && name.length <= 200,
    emailValid: EMAIL_REGEX.test(email),
    phoneProvided: Boolean(phone),
    idempotencyKeyValid: true,
  });

  try {
    const response = await fetch(
      `${API_URL}/pix/charges`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(25000),
      }
    );

    const result = await response.json().catch(() => ({}));

    // Tratar respostas da NexFay
    if (!response.ok) {
      const messages = {
        400: 'A NexFay recusou os dados enviados. Confira offer_id, customer.name e customer.email.',
        401: 'Credencial NexFay inválida. Confira NEXFAY_API_KEY.',
        403: 'Sua conta NexFay não está autorizada a criar cobranças.',
        404: 'Oferta não encontrada. Confira o ID da oferta no painel NexFay.',
        409: 'A chave de idempotência já foi utilizada com dados diferentes. Não crie outra cobrança.',
        413: 'A solicitação excedeu o limite permitido.',
        422: 'A NexFay recusou os dados da cobrança.',
        429: 'Limite de requisições atingido. Aguarde antes de tentar novamente.',
        503: 'NexFay temporariamente indisponível. Consulte a cobrança usando a mesma chave.',
      };

      console.error('Erro retornado pela NexFay:', {
        httpStatus: response.status,
        requestId: result.request_id || null,
        error: result.error || null,
        message: result.message || null,
      });

      return sendError(
        res,
        response.status,
        result.message ||
          result.error ||
          messages[response.status] ||
          'Não foi possível criar a cobrança Pix.',
        {
          requestId: result.request_id || null,
          retryWithSameKey: [202, 503].includes(response.status),
        }
      );
    }

    const charge = result.data || result;
    const pix = charge.pix || {};

    // HTTP 202: cobrança ainda em processamento
    if (response.status === 202) {
      return res.status(202).json({
        success: false,
        processing: true,
        message:
          result.message ||
          'Cobrança em processamento. Consulte novamente usando a mesma chave.',
        data: {
          transactionId:
            charge.transaction_id ||
            charge.id ||
            null,
          orderId: charge.order_id || null,
          status: charge.status || 'processing',
          requestId: charge.request_id || null,
        },
        retryWithSameKey: true,
      });
    }

    // Normalizar dados retornados
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

    // Verificar se a resposta possui dados suficientes
    if (!transactionId || (!copyPaste && !qrCode)) {
      console.error(
        'NexFay retornou cobrança sem dados Pix completos:',
        {
          httpStatus: response.status,
          transactionIdExists: Boolean(transactionId),
          copyPasteExists: Boolean(copyPaste),
          qrCodeExists: Boolean(qrCode),
          requestId: charge.request_id || null,
        }
      );

      return sendError(
        res,
        502,
        'A NexFay não retornou os dados completos do Pix. Consulte a cobrança antes de tentar novamente.',
        {
          requestId: charge.request_id || null,
          retryWithSameKey: true,
        }
      );
    }

    // Resposta de sucesso
    return res.status(response.status === 201 ? 201 : 200).json({
      success: true,
      data: {
        transactionId,
        orderId: charge.order_id || null,
        status: String(
          charge.status || 'pending'
        ).toLowerCase(),

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
    console.error('Falha na comunicação NexFay:', {
      name: error.name,
      message: error.message,
    });

    return sendError(
      res,
      502,
      error.name === 'TimeoutError' || error.name === 'AbortError'
        ? 'A NexFay demorou para responder. Consulte a cobrança antes de tentar novamente.'
        : 'Não foi possível conectar à NexFay. Consulte a cobrança antes de tentar novamente.',
      {
        retryWithSameKey: true,
      }
    );
  }
}
