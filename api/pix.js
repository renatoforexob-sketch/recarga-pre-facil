const API_URL = process.env.BLACKCAT_API_URL || 'https://api.blackcatoficial.com/api/sales/create-sale';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Método não permitido' });
  if (!process.env.BLACKCAT_API_KEY) return res.status(500).json({ success: false, message: 'BLACKCAT_API_KEY não configurada no ambiente da Vercel.' });
  const input = req.body || {};
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < 0.01 || amount > 1000) return res.status(400).json({ success: false, message: 'amount deve ser um número entre 0,01 e 1.000.' });
  const metadata = input.metadata && typeof input.metadata === 'object' ? input.metadata : {};
  const payload = {
    amount: Math.round(amount * 100), currency: 'BRL', paymentMethod: 'pix',
    items: [{ title: input.product_name || 'Recarga de Celular - Recarga Fácil', quantity: 1, tangible: false }],
    customer: { name: process.env.BLACKCAT_CLIENT_NAME || 'Recarga Fácil', email: process.env.BLACKCAT_CLIENT_EMAIL || 'contato@recargatodahora.online', phone: String(metadata.telefone || '11999999999'), document: { number: process.env.BLACKCAT_CLIENT_DOCUMENT || '', type: 'cpf' } },
    pix: { expiresInDays: 1 }, metadata,
    ...(process.env.BLACKCAT_POSTBACK_URL ? { postbackUrl: process.env.BLACKCAT_POSTBACK_URL } : {}),
    externalRef: `RTH-${new Date().toISOString().slice(0,10).replaceAll('-', '')}-${crypto.randomUUID().slice(0,8)}`
  };
  try {
    const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.BLACKCAT_API_KEY }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok || !data?.data?.paymentData) return res.status(response.status || 502).json({ success: false, message: data?.message || data?.error || 'A API de pagamento não retornou um Pix válido.' });
    return res.status(200).json({ success: true, data: { paymentData: { copyPaste: data.data.paymentData.copyPaste || '', qrCodeBase64: data.data.paymentData.qrCodeBase64 || null, qrCode: data.data.paymentData.qrCode || '' }, transactionId: data.data.transactionId || null, status: data.data.status || 'PENDING', amount: data.data.amount || Math.round(amount * 100), amountDisplay: amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), invoiceUrl: data.data.invoiceUrl || null } });
  } catch (error) { return res.status(502).json({ success: false, message: 'Não foi possível conectar ao gateway de pagamento.' }); }
}
