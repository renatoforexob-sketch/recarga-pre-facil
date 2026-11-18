
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Método não permitido.',
    });
  }

  const url = (process.env.KV_REST_API_URL || '').replace(/\/+$/, '');
  const token = process.env.KV_REST_API_TOKEN || '';

  if (!url || !token) {
    return res.status(500).json({
      success: false,
      message: 'Variáveis do Redis ausentes.',
    });
  }

  try {
    const response = await fetch(`${url}/ping`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.result !== 'PONG') {
      return res.status(502).json({
        success: false,
        message: 'Redis não confirmou a conexão.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Redis conectado e respondendo.',
    });
  } catch (error) {
    console.error('Erro no teste Redis:', error.message);

    return res.status(502).json({
      success: false,
      message: 'Falha ao conectar ao Redis.',
    });
  }
}
