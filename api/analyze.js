// api/analyze.js
import { fetchRealOnChainData, analyzeWallet } from '../lib/blockchain';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const wallet = req.query.wallet;
  if (!wallet || !wallet.startsWith('0x')) {
    return res.status(400).json({ error: 'Valid EVM wallet address required' });
  }

  try {
    // 1. HUBUNGI BLOCKCHAIN EXPLORER (BSC Scan)
    const rawTxs = await fetchRealOnChainData(wallet);

    // 2. JALANKAN SCORING ENGINE
    const analysis = analyzeWallet(rawTxs);

    // 3. KIRIM KE FRONTEND
    res.status(200).json({
      source: 'bsc_blockchain_real', // Bukti ini bukan fallback
      wallet: wallet,
      analyzedAt: new Date().toISOString(),
      ...analysis
    });

  } catch (error) {
    console.error('[API Error]', error.message);
    res.status(500).json({ error: 'Gagal menganalisis on-chain data: ' + error.message });
  }
}
