// /api/pi-chain.js (Vercel Serverless Function)
export default async function handler(req, res) {
  // Hanya izinkan GET
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const walletAddress = req.query.wallet;
  if (!walletAddress) return res.status(400).json({ error: 'Wallet address required' });

  try {
    // 1. AMBIL DATA DARI PI BLOCKCHAIN API
    // Pi Network punya internal API untuk cek riwayat transaksi wallet
    const piApiUrl = `https://api.minepi.com/v2/transactions?wallet=${walletAddress}&limit=100`;
    
    const piRes = await fetch(piApiUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });

    let txs = [];
    let isApiReachable = true;

    if (!piRes.ok) {
      // Fallback: Kalau Pi API gagal (misal di local dev), coba mock dulu
      // TAPI DI PRODUCTION, ini HARUS selalu success.
      console.error('Pi API Error:', piRes.status);
      isApiReachable = false;
    } else {
      const piData = await piRes.json();
      txs = piData.transactions || [];
    }

    // 2. NORMALIZE DATA ON-CHAIN
    let totalTx = txs.length;
    let successTx = 0;
    let failedTx = 0;
    let totalVolume = 0;
    let uniqueCounterparties = new Set();
    let firstTxDate = null;

    for (let i = 0; i < txs.length; i++) {
      let tx = txs[i];
      
      // Hitung volume (dalam Pi)
      let amount = parseFloat(tx.amount || 0);
      if (amount > 0) totalVolume += amount;

      // Hitung success/failed (Pi SDK biasanya pakai 'confirmed' atau status code)
      if (tx.status === 'confirmed' || tx.state === 'SUCCESS') {
        successTx++;
      } else if (tx.status === 'failed' || tx.state === 'FAILED') {
        failedTx++;
      }

      // Track counterparty untuk analisa risiko
      if (tx.counterparty && tx.counterparty !== walletAddress) {
        uniqueCounterparties.add(tx.counterparty);
      }

      // Cari transaksi paling awal (untuk wallet age on-chain)
      if (tx.created_at || tx.timestamp) {
        let txDate = new Date(tx.created_at || tx.timestamp);
        if (!firstTxDate || txDate < firstTxDate) {
          firstTxDate = txDate;
        }
      }
    }

    // 3. HITUNG METRIK REAL
    const successRate = totalTx > 0 ? Math.round((successTx / totalTx) * 100) : 0;
    const ageDaysOnChain = firstTxDate ? Math.floor((Date.now() - firstTxDate.getTime()) / 86400000) : 0;

    // 4. RISK ANALYSIS DASAR (ON-CHAIN)
    let riskFlags = [];
    let riskPenalty = 0;

    // Flag 1: Wallet terlalu baru tanpa transaksi
    if (totalTx === 0) {
      riskFlags.push({ severity: 'medium', label: 'Zero Transactions', description: 'Tidak ada aktivitas on-chain yang terdeteksi.' });
      riskPenalty += 30;
    }

    // Flag 2: Success rate rendah
    if (totalTx > 5 && successRate < 50) {
      riskFlags.push({ severity: 'high', label: 'High Failure Rate', description: `${100 - successRate}% transaksi gagal. Menunjukkan masalah likuiditas atau penolakan.` });
      riskPenalty += 50;
    }

    // Flag 3: Terlalu banyak transaksi ke diri sendiri (wash trading indicator)
    // (Logika sederhana, bisa dikembangkan)
    
    // Flag 4: Volume besar tapi counterparty sedikit (konsentrasi risiko)
    if (totalVolume > 100 && uniqueCounterparties.size < 3 && totalTx > 5) {
      riskFlags.push({ severity: 'medium', label: 'Concentrated Activity', description: 'Volume tinggi tapi hanya berinteraksi dengan sangat sedikit wallet.' });
      riskPenalty += 30;
    }

    // 5. RETURN DATA YANG SUDAH DICLEANING
    return res.status(200).json({
      source: isApiReachable ? 'pi_blockchain' : 'fallback',
      wallet: walletAddress,
      metrics: {
        tx_total: totalTx,
        tx_success: successTx,
        tx_failed: failedTx,
        success_rate: successRate,
        total_volume_pi: totalVolume,
        unique_counterparties: uniqueCounterparties.size,
        age_days_on_chain: ageDaysOnChain
      },
      risk: {
        flags: riskFlags,
        penalty: riskPenalty
      },
      raw_tx_count: txs.length
    });

  } catch (error) {
    console.error('Chain Error:', error);
    return res.status(500).json({ error: 'Failed to fetch on-chain data' });
  }
}
