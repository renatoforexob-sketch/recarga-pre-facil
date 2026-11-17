
const API_BASE =
  process.env.NEXFAY_API_URL ||
  'https://nexfay.com.br/api/public/v1';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido.'
    });
  }

  const apiKey = process.env.NEXFAY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: 'NEXFAY_API_KEY não configurada.'
    });
  }

  const transactionId = String(
    req.query?.id || req.query?.transactionId || ''
  );

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      transactionId
    )
  ) {
    return res.status(400).json({
      success: false,
      message: 'ID de transação inválido.'
    });
  }

  try {
    const response = await fetch(
      `${API_BASE}/pix/charges/${encodeURIComponent(transactionId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message:
          data.message ||
          data.error ||
          'Não foi possível consultar o pagamento.'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        transactionId: data.transaction_id,
        orderId: data.order_id || null,
        status: data.status,
        amount: data.amount_cents,
        paidAt: data.paid_at || null,
        createdAt: data.created_at || null
      }
    });
  } catch (error) {
    console.error('Erro consulta NexFay:', error.message);

    return res.status(502).json({
      success: false,
      message: 'Falha ao consultar a NexFay.'
    });
  }
}
