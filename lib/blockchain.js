// lib/blockchain.js
// PURE BLOCKCHAIN DATA LAYER & SCORING ENGINE
// Tidak ada UI, tidak ada DB. Hanya matematika dan jaringan.

const BSC_API = 'https://api.bscscan.com/api';
const BSC_API_KEY = 'YOUR_BSCSCAN_API_KEY'; // Ambil gratis di bscscan.com

/**
 * 1. AMBIL DATA ASLI DARI BLOCKCHAIN EXPLORER
 * Mengembalikan array transaksi mentah lengkap dengan txHash, blockNumber, dll
 */
export async function fetchRealOnChainData(walletAddress) {
  const url = `${BSC_API}?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${BSC_API_KEY}`;
  
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== '1' || !Array.isArray(data.result)) {
    throw new Error('Gagal mengambil data dari BSC Scan');
  }

  return data.result; // Array of raw transactions
}

/**
 * 2. SCORING ENGINE (Dihitung dari pola on-chain, bukan angka asal-asalan)
 */
export function analyzeWallet(realTxs) {
  // FILTER HANYA TX YANG SUKSES (isError = "0" di BSC)
  const successTxs = realTxs.filter(tx => tx.isError === "0");
  const failedTxs = realTxs.filter(tx => tx.isError === "1");
  
  const totalTx = realTxs.length;
  const successRate = totalTx > 0 ? (successTxs.length / totalTx) * 100 : 0;

  // 3. ON-CHAIN AGE REAL (Dari timestamp block pertama)
  let ageDays = 0;
  let firstTxTime = 0;
  if (realTxs.length > 0) {
    // BSC timestamp dalam detik, bukan milidetik
    const sortedTxs = [...realTxs].sort((a, b) => parseInt(a.timeStamp) - parseInt(b.timeStamp));
    firstTxTime = parseInt(sortedTxs[0].timeStamp);
    ageDays = Math.floor((Math.floor(Date.now() / 1000) - firstTxTime) / 86400);
  }

  // 4. NETWORK DIVERSITY (Berapa banyak address unik yang berinteraksi)
  const addresses = new Set();
  realTxs.forEach(tx => {
    addresses.add(tx.to.toLowerCase());
    addresses.add(tx.from.toLowerCase());
  });
  addresses.delete(walletAddress.toLowerCase()); // Buang address sendiri
  const uniqueInteractions = addresses.size;

  // 5. VOLUME (Total nilai yang ditransfer dalam Wei, lalu konversi ke BNB)
  let totalVolumeWei = 0;
  successTxs.forEach(tx => { totalVolumeWei += parseInt(tx.value); });
  const totalVolumeBNB = totalVolumeWei / 1e18;

  // ==========================================
  // 6. REAL RISK ENGINE (Pattern Analysis)
  // ==========================================
  let riskFlags = [];
  let riskPenalty = 0;

  // Rule 1: Zero Transactions
  if (totalTx === 0) {
    riskFlags.push({ severity: 'medium', label: 'Zero Transactions', description: 'Wallet ini belum pernah berinteraksi di blockchain. Tidak ada riwayat on-chain.' });
    riskPenalty += 30;
  }

  // Rule 2: High Failure Rate
  if (totalTx > 5 && successRate < 50) {
    riskFlags.push({ severity: 'high', label: 'High Failure Rate', description: `${Math.round(100 - successRate)}% transaksi gagal (Out of Gas / Reverted).` });
    riskPenalty += 50;
  }

  // Rule 3: Wash Trading Indicator (Banyak tx ke diri sendiri)
  const selfTxs = realTxs.filter(tx => tx.from.toLowerCase() === tx.to.toLowerCase());
  if (selfTxs.length > 3) {
    riskFlags.push({ severity: 'critical', label: 'Wash Trading Indicator', description: `Ditemukan ${selfTxs.length} transaksi ke address sendiri.` });
    riskPenalty += 80;
  }

  // Rule 4: Dormant Wallet (Pernah aktif tapi sudah lama mati)
  if (totalTx > 0) {
    const lastTxTime = parseInt([...realTxs].sort((a, b) => parseInt(b.timeStamp) - parseInt(a.timeStamp))[0].timeStamp);
    const daysSinceLastTx = Math.floor((Math.floor(Date.now() / 1000) - lastTxTime) / 86400);
    if (daysSinceLastTx > 180 && totalTx < 10) {
      riskFlags.push({ severity: 'low', label: 'Dormant Wallet', description: `Tidak ada aktivitas selama ${daysSinceLastTx} hari.` });
      riskPenalty += 10;
    }
  }

  // Rule 5: Burst Activity (Spamming tx dalam waktu sangat singkat)
  if (successTxs.length > 10) {
    let burstCount = 0;
    for (let i = 1; i < successTxs.length; i++) {
      const timeDiff = parseInt(successTxs[i].timeStamp) - parseInt(successTxs[i-1].timeStamp);
      if (timeDiff <= 60) burstCount++; // < 1 menit
    }
    if (burstCount > 5) {
      riskFlags.push({ severity: 'high', label: 'Burst Activity', description: `Ditemukan ${burstCount} transaksi beruntun dalam waktu < 1 menit.` });
      riskPenalty += 50;
    }
  }

  // ==========================================
  // 7. HITUNG SKOR FINAL (Matematika terbuka)
  // ==========================================
  
  // Success Rate Score (0-250)
  const srScore = Math.min(250, Math.round((successRate / 100) * 250));

  // Volume Score (0-250) - Skala logaritmik agar tidak bias terhadap whale
  let volScore = 0;
  if (totalVolumeBNB > 0) {
    volScore = Math.min(250, Math.round(Math.log10(totalVolumeBNB + 1) * 100)); 
  }

  // Age Score (0-250)
  let ageScore = 0;
  if (ageDays >= 365) ageScore = 250;
  else if (ageDays >= 180) ageScore = 220;
  else if (ageDays >= 90) ageScore = 150;
  else if (ageDays >= 30) ageScore = 80;
  else if (ageDays > 0) ageScore = 40;

  // Risk Score (0-250)
  const riskScore = Math.max(0, 250 - riskPenalty);

  const totalScore = srScore + volScore + ageScore + riskScore;

  return {
    score: totalScore,
    breakdown: { srScore, volScore, ageScore, riskScore, riskPenalty },
    onChainMetrics: {
      totalTx, successTxs: successTxs.length, failedTxs: failedTxs.length, successRate: Math.round(successRate),
      ageDays, firstTxTime, uniqueInteractions, totalVolumeBNB
    },
    riskFlags,
    // Kembalikan 5 tx terakhir untuk ditampilkan di UI sebagai bukti on-chain
    proofTxs: realTxs.slice(-5).reverse().map(tx => ({
      hash: tx.hash,
      block: parseInt(tx.blockNumber),
      time: new Date(parseInt(tx.timeStamp) * 1000).toLocaleString(),
      from: tx.from,
      to: tx.to,
      value: (parseInt(tx.value) / 1e18).toFixed(5),
      status: tx.isError === "0" ? 'SUCCESS' : 'FAILED'
    }))
  };
}
