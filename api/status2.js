
const API_URL = (process.env.NEXFAY_API_URL || 'https://nexfay.com.br/api/public/v1').replace(/\/$/, '');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

  const id = String(req.query.id || '').trim();

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'Informe o ID da transação.',
    });
  }

  try {
    const response = await fetch(
      `${API_URL}/pix/charges/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: result.message || result.error || 'Não foi possível consultar o pagamento.',
        requestId: result.request_id || null,
      });
    }

    const charge = result.data || result;

    return res.status(200).json({
      success: true,
      data: {
        transactionId: charge.transaction_id || charge.id || id,
        orderId: charge.order_id || null,
        status: String(charge.status || 'pending').toLowerCase(),
        amount: charge.amount_cents ?? null,
        paidAt: charge.paid_at || null,
        createdAt: charge.created_at || null,
        expiresAt: charge.pix?.expires_at || null,
      },
    });
  } catch (error) {
    console.error('Erro ao consultar NexFay:', error);

    return res.status(502).json({
      success: false,
      message: 'Não foi possível conectar à NexFay para consultar o pagamento.',
    });
  }
}
