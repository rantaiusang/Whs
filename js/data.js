/* ========================================
   DATA.JS — Fake Blockchain Data Generator
   Sumber data simulasi untuk seluruh aplikasi
======================================== */

/**
 * Menghasilkan angka acak dalam range
 */
function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Menghasilkan angka desimal acak dalam range
 */
function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

/**
 * Menghasilkan hex string acak
 */
function randomHex(length) {
  let result = '';
  const chars = '0123456789abcdef';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Menghasilkan alamat Ethereum palsu
 */
function randomAddress() {
  return '0x' + randomHex(40);
}

/**
 * Daftar nama token populer untuk simulasi
 */
const TOKEN_LIST = [
  { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  { symbol: 'USDT', name: 'Tether', decimals: 6 },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  { symbol: 'DAI', name: 'Dai', decimals: 18 },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },
  { symbol: 'LINK', name: 'Chainlink', decimals: 18 },
  { symbol: 'UNI', name: 'Uniswap', decimals: 18 },
  { symbol: 'AAVE', name: 'Aave', decimals: 18 },
  { symbol: 'CRV', name: 'Curve', decimals: 18 },
  { symbol: 'MKR', name: 'Maker', decimals: 18 },
  { symbol: 'COMP', name: 'Compound', decimals: 18 },
  { symbol: 'SNX', name: 'Synthetix', decimals: 18 },
];

/**
 * Menghasilkan timestamp acak dalam rentang waktu
 */
function randomTimestamp(daysAgoMin, daysAgoMax) {
  const now = Date.now();
  const minTime = now - (daysAgoMax * 24 * 60 * 60 * 1000);
  const maxTime = now - (daysAgoMin * 24 * 60 * 60 * 1000);
  return Math.floor(Math.random() * (maxTime - minTime) + minTime);
}

/**
 * Tipe transaksi yang mungkin
 */
const TX_TYPES = ['send', 'receive', 'swap', 'approve', 'stake', 'unstake', 'bridge', 'mint', 'burn'];

/**
 * Menghasilkan satu transaksi palsu
 */
function generateTransaction(walletAddress, index) {
  const type = TX_TYPES[Math.floor(Math.random() * TX_TYPES.length)];
  const token = TOKEN_LIST[Math.floor(Math.random() * TOKEN_LIST.length)];
  const amount = randomFloat(0.001, 50, 4);
  const timestamp = randomTimestamp(1, 730); // 1 hari sampai 2 tahun lalu
  const isSuccess = Math.random() > 0.08; // 92% success rate rata-rata
  const gasUsed = randomRange(21000, 350000);
  const gasPrice = randomFloat(5, 120, 2); // Gwei

  // Counterpart address: untuk send/approve/stake/bridge = penerima, lainnya = pengirim
  const isOutgoing = ['send', 'approve', 'stake', 'bridge', 'burn'].includes(type);
  const counterparty = randomAddress();

  return {
    txHash: '0x' + randomHex(64),
    type: type,
    token: token.symbol,
    tokenName: token.name,
    amount: amount,
    from: isOutgoing ? walletAddress : counterparty,
    to: isOutgoing ? counterparty : walletAddress,
    gasUsed: gasUsed,
    gasPrice: gasPrice,
    gasCostETH: parseFloat(((gasUsed * gasPrice) / 1e9).toFixed(6)),
    status: isSuccess ? 'success' : 'failed',
    timestamp: timestamp,
    blockNumber: randomRange(18000000, 19500000),
    nonce: index,
  };
}

/**
 * Menghasilkan array transaksi untuk sebuah wallet
 */
function generateTransactions(walletAddress, count) {
  const txs = [];
  for (let i = 0; i < count; i++) {
    txs.push(generateTransaction(walletAddress, i));
  }
  // Urutkan dari terbaru
  txs.sort((a, b) => b.timestamp - a.timestamp);
  // Re-assign nonce berdasarkan urutan waktu
  txs.forEach((tx, i) => tx.nonce = i);
  return txs;
}

/**
 * Risk flags yang mungkin muncul
 */
const POSSIBLE_RISK_FLAGS = [
  { id: 'rf_01', label: 'Interaksi dengan kontrak berisiko', severity: 'high', description: 'Wallet pernah berinteraksi dengan smart contract yang teridentifikasi berisiko oleh scanner keamanan.' },
  { id: 'rf_02', label: 'Transaksi besar dalam satu blok', severity: 'medium', description: 'Terdapat transaksi dengan nilai nominal jauh di atas rata-rata wallet.' },
  { id: 'rf_03', label: 'Pola transaksi tidak wajar', severity: 'high', description: 'Pola timing transaksi menunjukkan karakteristik bot atau automasi.' },
  { id: 'rf_04', label: 'Pertukaran dengan address terblacklist', severity: 'critical', description: 'Wallet pernah menerima atau mengirim aset ke address yang ada di blacklist.' },
  { id: 'rf_05', label: 'Umur wallet sangat baru', severity: 'low', description: 'Wallet pertama kali aktif dalam 30 hari terakhir.' },
  { id: 'rf_06', label: 'Frekuensi transaksi sporadis', severity: 'low', description: 'Aktivitas transaksi tidak konsisten — ada periode sangat padat dan sangat sepi.' },
  { id: 'rf_07', label: 'Multiple bridge dalam waktu singkat', severity: 'medium', description: 'Beberapa transaksi bridge ke chain berbeda dalam rentang waktu kurang dari 1 jam.' },
  { id: 'rf_08', label: 'Interaksi dengan mixer/tumbler', severity: 'critical', description: 'Wallet terdeteksi berinteraksi dengan kontrak mixer yang umum digunakan untuk money laundering.' },
  { id: 'rf_09', label: 'Gas price anomalously low', severity: 'low', description: 'Beberapa transaksi menggunakan gas price jauh di bawah rata-rata, mengindikasikan private mempool.' },
  { id: 'rf_10', label: 'Wallet funded dari satu sumber', severity: 'medium', description: 'Seluruh saldo awal berasal dari satu address tanpa transaksi lain.' },
];

/**
 * Menghasilkan risk flags untuk sebuah wallet berdasarkan skor
 */
function generateRiskFlags(score) {
  // Semakin rendah skor, semakin banyak flag
  let flagCount = 0;
  if (score < 200) flagCount = randomRange(4, 6);
  else if (score < 400) flagCount = randomRange(2, 4);
  else if (score < 600) flagCount = randomRange(1, 2);
  else if (score < 800) flagCount = randomRange(0, 1);
  else flagCount = 0;

  // Acak dan ambil sejumlah flag
  const shuffled = [...POSSIBLE_RISK_FLAGS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, flagCount);
}

/**
 * Menghitung credit score berdasarkan parameter
 * Mengembalikan objek lengkap dengan breakdown
 */
function calculateCreditScore(walletAddress) {
  // --- Parameter dasar (acak tapi deterministik per address) ---
  // Gunakan hash sederhana dari address untuk seed
  let seed = 0;
  for (let i = 0; i < walletAddress.length; i++) {
    seed = ((seed << 5) - seed) + walletAddress.charCodeAt(i);
    seed = seed & seed; // Convert to 32bit int
  }
  seed = Math.abs(seed);

  // Seeded pseudo-random
  function seededRandom() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  function seededRange(min, max) {
    return Math.floor(seededRandom() * (max - min + 1)) + min;
  }

  // --- Generate data wallet ---
  const totalTransactions = seededRange(12, 850);
  const successCount = Math.floor(totalTransactions * (0.7 + seededRandom() * 0.28)); // 70-98%
  const failCount = totalTransactions - successCount;
  const successRate = parseFloat(((successCount / totalTransactions) * 100).toFixed(1));

  // Umur wallet dalam hari (1 hari sampai ~3 tahun)
  const walletAgeDays = seededRange(1, 1100);
  const firstTxTimestamp = Date.now() - (walletAgeDays * 24 * 60 * 60 * 1000);

  // Generate transaksi
  const transactions = generateTransactions(walletAddress, totalTransactions);

  // --- Hitung skor per kategori (masing-masing 0-250, total max 1000) ---

  // 1. Success Rate Score (0-250)
  let successRateScore;
  if (successRate >= 98) successRateScore = 250;
  else if (successRate >= 95) successRateScore = Math.round(200 + (successRate - 95) * 10);
  else if (successRate >= 90) successRateScore = Math.round(150 + (successRate - 90) * 10);
  else if (successRate >= 80) successRateScore = Math.round(80 + (successRate - 80) * 7);
  else if (successRate >= 60) successRateScore = Math.round(30 + (successRate - 60) * 2.5);
  else successRateScore = Math.round((successRate / 60) * 30);

  // 2. Volume Score (0-250) — berdasarkan jumlah transaksi
  let volumeScore;
  if (totalTransactions >= 500) volumeScore = 250;
  else if (totalTransactions >= 200) volumeScore = Math.round(180 + (totalTransactions - 200) * 0.233);
  else if (totalTransactions >= 50) volumeScore = Math.round(100 + (totalTransactions - 50) * 0.8);
  else if (totalTransactions >= 20) volumeScore = Math.round(40 + (totalTransactions - 20) * 2);
  else volumeScore = Math.round((totalTransactions / 20) * 40);

  // 3. Wallet Age Score (0-250)
  let ageScore;
  if (walletAgeDays >= 730) ageScore = 250; // > 2 tahun
  else if (walletAgeDays >= 365) ageScore = Math.round(200 + (walletAgeDays - 365) * 0.137);
  else if (walletAgeDays >= 180) ageScore = Math.round(140 + (walletAgeDays - 180) * 0.333);
  else if (walletAgeDays >= 90) ageScore = Math.round(80 + (walletAgeDays - 90) * 0.667);
  else if (walletAgeDays >= 30) ageScore = Math.round(30 + (walletAgeDays - 30) * 0.833);
  else ageScore = Math.round((walletAgeDays / 30) * 30);

  // 4. Risk Penalty (0 = no penalty, -250 = max penalty)
  const riskFlags = generateRiskFlags(successRateScore + volumeScore + ageScore);
  let riskPenalty = 0;
  riskFlags.forEach(flag => {
    switch (flag.severity) {
      case 'critical': riskPenalty += 80; break;
      case 'high': riskPenalty += 50; break;
      case 'medium': riskPenalty += 30; break;
      case 'low': riskPenalty += 10; break;
    }
  });
  riskPenalty = Math.min(riskPenalty, 250);

  // Skor akhir
  let rawScore = successRateScore + volumeScore + ageScore - riskPenalty;
  let finalScore = Math.max(0, Math.min(1000, rawScore));

  // Round ke kelipatan 5 untuk tampilan lebih bersih
  finalScore = Math.round(finalScore / 5) * 5;

  // Status berdasarkan skor
  let status, statusColor, statusBg, statusIcon;
  if (finalScore >= 800) {
    status = 'Excellent'; statusColor = '#22c55e'; statusBg = 'rgba(34,197,94,0.12)'; statusIcon = 'fa-circle-check';
  } else if (finalScore >= 600) {
    status = 'Good'; statusColor = '#f59e0b'; statusBg = 'rgba(245,158,11,0.12)'; statusIcon = 'fa-circle-minus';
  } else if (finalScore >= 350) {
    status = 'Risky'; statusColor = '#f97316'; statusBg = 'rgba(249,115,22,0.12)'; statusIcon = 'fa-triangle-exclamation';
  } else {
    status = 'Dangerous'; statusColor = '#ef4444'; statusBg = 'rgba(239,68,68,0.12)'; statusIcon = 'fa-circle-xmark';
  }

  // Hitung total gas spent
  const totalGasETH = transactions
    .filter(t => t.status === 'success')
    .reduce((sum, t) => sum + t.gasCostETH, 0);

  // Hitung saldo estimasi (dummy)
  const estimatedBalance = randomFloat(0.01, 25, 4);

  // Hitung persentil (simulasi)
  const percentile = Math.min(99, Math.max(1, Math.round((finalScore / 1000) * 85 + seededRandom() * 14)));

  // Hitung skor rata-rata network (simulasi statis)
  const networkAvg = 620;

  // Activity dalam 7 hari terakhir
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const recentTxCount = transactions.filter(t => t.timestamp > sevenDaysAgo).length;

  // Skor tren (simulasi: apakah skor naik atau turun)
  const scoreChange = randomFloat(-30, 45, 1);

  return {
    // Data wallet
    walletAddress: walletAddress,
    walletAgeDays: walletAgeDays,
    firstTxTimestamp: firstTxTimestamp,
    estimatedBalance: estimatedBalance,

    // Skor utama
    score: finalScore,
    status: status,
    statusColor: statusColor,
    statusBg: statusBg,
    statusIcon: statusIcon,
    percentile: percentile,
    networkAvg: networkAvg,
    scoreChange: scoreChange,

    // Breakdown skor
    breakdown: {
      successRate: { score: successRateScore, max: 250, value: successRate, label: 'Success Rate' },
      volume: { score: volumeScore, max: 250, value: totalTransactions, label: 'Volume Transaksi' },
      age: { score: ageScore, max: 250, value: walletAgeDays, label: 'Umur Wallet' },
      risk: { score: Math.max(0, 250 - riskPenalty), max: 250, penalty: riskPenalty, label: 'Risk Assessment' },
    },

    // Statistik transaksi
    transactions: {
      total: totalTransactions,
      success: successCount,
      failed: failCount,
      successRate: successRate,
      recentWeek: recentTxCount,
      totalGasETH: parseFloat(totalGasETH.toFixed(4)),
      list: transactions,
    },

    // Risk flags
    riskFlags: riskFlags,

    // Metadata
    generatedAt: new Date().toISOString(),
    isSimulated: true,
  };
}

/**
 * Menghasilkan data tren skor harian (30 hari terakhir)
 */
function generateScoreTrend(currentScore) {
  const trend = [];
  const now = Date.now();
  let score = currentScore - randomRange(20, 60); // Mulai dari lebih rendah

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    // Sedikit fluktuasi acak
    const change = randomRange(-15, 18);
    score = Math.max(0, Math.min(1000, score + change));

    // Di hari terakhir, pakai skor sebenarnya
    if (i === 0) score = currentScore;

    trend.push({
      date: date.toISOString().split('T')[0],
      score: i === 0 ? currentScore : Math.round(score / 5) * 5,
      txCount: randomRange(0, 12),
    });
  }

  return trend;
}

/**
 * Menghasilkan data distribusi tipe transaksi
 */
function generateTxTypeDistribution(transactions) {
  const dist = {};
  transactions.forEach(tx => {
    dist[tx.type] = (dist[tx.type] || 0) + 1;
  });

  return Object.entries(dist)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Format timestamp ke string yang mudah dibaca
 */
function formatTimestamp(ts) {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} bulan lalu`;
  return `${Math.floor(diffDays / 365)} tahun lalu`;
}

/**
 * Format tanggal lengkap
 */
function formatDate(ts) {
  return new Date(ts).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format angka dengan pemisah ribuan
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format saldo ETH
 */
function formatETH(amount) {
  if (amount >= 1) return amount.toFixed(4) + ' ETH';
  if (amount >= 0.001) return amount.toFixed(6) + ' ETH';
  return amount.toFixed(8) + ' ETH';
}

/**
 * Singkatkan alamat
 */
function shortAddress(addr) {
  if (!addr || addr.length < 10) return addr || '—';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}
