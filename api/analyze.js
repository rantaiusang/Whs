export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wallet = req.query.wallet;

  if (!wallet || !wallet.startsWith('0x') || wallet.length !== 42) {
    return res.status(400).json({ error: 'Alamat EVM tidak valid' });
  }

  const BSC_API_KEY = process.env.BSC_API_KEY;

  if (!BSC_API_KEY) {
    return res.status(500).json({ error: "API key belum diset di Vercel" });
  }

  try {
    const safeWallet = encodeURIComponent(wallet);

    const url = `https://api.bscscan.com/api?module=account&action=txlist&address=${safeWallet}&startblock=0&endblock=99999999&sort=asc&apikey=${BSC_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === '0' && data.message === 'No transactions found') {
      return res.status(200).json({ txs: [] });
    }

    if (!data || data.status !== '1') {
      return res.status(500).json({
        error: "BscScan error",
        detail: data
      });
    }

    return res.status(200).json({ txs: data.result });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
