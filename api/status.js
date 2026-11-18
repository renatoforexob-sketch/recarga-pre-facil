
const API_URL = (
  process.env.NEXFAY_API_URL ||
  'https://nexfay.com.br/api/public/v1'
).replace(/\/+$/, '');

const REDIS_URL = (
  process.env.KV_REST_API_URL || ''
).replace(/\/+$/, '');

const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || '';

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');

    return res.status(405).json({
      success: false,
      message: 'Método não permitido.',
    });
  }

  const apiKey = String(
    process.env.NEXFAY_API_KEY || ''
  ).trim();

  const id = String(req.query.id || '').trim();

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: 'NEXFAY_API_KEY não configurada.',
    });
  }

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Informe o ID da transação.',
    });
  }

  let savedOrder = null;

  // Primeiro tenta recuperar os dados do pedido no Redis.
  try {
    if (REDIS_URL && REDIS_TOKEN) {
      const stored = await redisCommand([
        'GET',
        `recarga:order:${id}`,
      ]);

      if (stored) {
        savedOrder = JSON.parse(stored);
      }
    }
  } catch (error) {
    console.error(
      'Erro ao consultar pedido no Redis:',
      error.message
    );
  }

  try {
    // Consulta o status diretamente na NexFay.
    const response = await fetch(
      `${API_URL}/pix/charges/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (savedOrder) {
        return res.status(200).json({
          success: true,
          data: {
            transactionId: id,
            orderId: savedOrder.orderId || null,
            status: savedOrder.status || 'pending',
            amount: savedOrder.amount
              ? savedOrder.amount * 100
              : null,
            paidAt: savedOrder.paidAt || null,
            createdAt: savedOrder.createdAt || null,
            phone: savedOrder.phone || null,
            operator: savedOrder.operator || null,
            operatorName: savedOrder.operatorName || null,
          },
        });
      }

      return res.status(response.status).json({
        success: false,
        message:
          result.message ||
          result.error ||
          'Não foi possível consultar o pagamento.',
        requestId: result.request_id || null,
      });
    }

    const charge = result.data || result;

    const gatewayStatus = String(
      charge.status || 'pending'
    ).toLowerCase();

    const paidStatuses = [
      'paid',
      'approved',
      'completed',
      'succeeded',
    ];

    const finalStatus = paidStatuses.includes(gatewayStatus)
      ? 'paid'
      : gatewayStatus;

    // Atualiza o pedido no Redis com o status consultado.
    if (savedOrder) {
      savedOrder.status = finalStatus;

      if (finalStatus === 'paid') {
        savedOrder.paidAt =
          charge.paid_at ||
          savedOrder.paidAt ||
          new Date().toISOString();
      }

      savedOrder.updatedAt = new Date().toISOString();

      await redisCommand([
        'SET',
        `recarga:order:${id}`,
        JSON.stringify(savedOrder),
        'EX',
        7776000,
      ]).catch(error => {
        console.error(
          'Erro ao atualizar Redis:',
          error.message
        );
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        transactionId:
          charge.transaction_id ||
          charge.id ||
          id,

        orderId:
          charge.order_id ||
          savedOrder?.orderId ||
          null,

        status: finalStatus,

        amount:
          charge.amount_cents ??
          (savedOrder?.amount
            ? savedOrder.amount * 100
            : null),

        paidAt:
          charge.paid_at ||
          savedOrder?.paidAt ||
          null,

        createdAt:
          charge.created_at ||
          savedOrder?.createdAt ||
          null,

        expiresAt:
          charge.pix?.expires_at ||
          null,

        phone: savedOrder?.phone || null,
        operator: savedOrder?.operator || null,
        operatorName: savedOrder?.operatorName || null,
      },
    });

  } catch (error) {
    console.error(
      'Erro ao consultar pagamento:',
      error.message
    );

    if (savedOrder) {
      return res.status(200).json({
        success: true,
        data: {
          transactionId: id,
          orderId: savedOrder.orderId || null,
          status: savedOrder.status || 'pending',
          amount: savedOrder.amount * 100,
          paidAt: savedOrder.paidAt || null,
          createdAt: savedOrder.createdAt || null,
          phone: savedOrder.phone || null,
          operator: savedOrder.operator || null,
          operatorName: savedOrder.operatorName || null,
        },
      });
    }

    return res.status(502).json({
      success: false,
      message:
        'Não foi possível conectar à NexFay para consultar o pagamento.',
    });
  }
}
