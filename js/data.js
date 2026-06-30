/* ========================================
   DATA.JS — Fake Blockchain Data Generator
   Sumber data simulasi untuk seluruh aplikasi
   (Diperbarui: Fix Error Blank pada Alamat 0x)
======================================== */

function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals) {
  if (typeof decimals === 'undefined') decimals = 2;
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomHex(length) {
  let result = '';
  const chars = '0123456789abcdef';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function randomAddress() {
  return '0x' + randomHex(40);
}

function isPiWallet(address) {
  if (!address) return false;
  if (localStorage.getItem('whs_auth_type') === 'pi_network') return true;
  return !address.startsWith('0x');
}

const TOKEN_LIST_ETH = [
  { symbol: 'ETH', name: 'Ethereum', decimals: 18 },
  { symbol: 'USDT', name: 'Tether', decimals: 6 },
  { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  { symbol: 'DAI', name: 'Dai', decimals: 18 },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },
  { symbol: 'LINK', name: 'Chainlink', decimals: 18 },
  { symbol: 'UNI', name: 'Uniswap', decimals: 18 },
];

const TOKEN_LIST_PI = [
  { symbol: 'Pi', name: 'Pi Network', decimals: 18 },
  { symbol: 'USDT', name: 'Tether on Pi', decimals: 6 },
  { symbol: 'PiBridge', name: 'Pi Bridge Token', decimals: 18 },
];

function randomTimestamp(daysAgoMin, daysAgoMax) {
  const now = Date.now();
  const minTime = now - (daysAgoMax * 24 * 60 * 60 * 1000);
  const maxTime = now - (daysAgoMin * 24 * 60 * 60 * 1000);
  return Math.floor(Math.random() * (maxTime - minTime) + minTime);
}

const TX_TYPES = ['send', 'receive', 'swap', 'approve', 'stake', 'unstake', 'bridge', 'mint', 'burn'];

function generateTransaction(walletAddress, index, isPi) {
  const type = TX_TYPES[Math.floor(Math.random() * TX_TYPES.length)];
  const tokenList = isPi ? TOKEN_LIST_PI : TOKEN_LIST_ETH;
  const token = tokenList[Math.floor(Math.random() * tokenList.length)];
  const amount = isPi ? randomFloat(0.5, 500, 4) : randomFloat(0.001, 50, 4);
  const timestamp = randomTimestamp(1, 730);
  const isSuccess = Math.random() > 0.08;
  const gasUsed = isPi ? randomRange(1, 1000) : randomRange(21000, 350000);
  const gasPrice = isPi ? 0 : randomFloat(5, 120, 2);
  const isOutgoing = ['send', 'approve', 'stake', 'bridge', 'burn'].includes(type);
  const counterparty = isPi ? 'G' + randomHex(32) : randomAddress();

  return {
    txHash: isPi ? 'PiTx_' + randomHex(24) : '0x' + randomHex(64),
    type: type,
    token: token.symbol,
    tokenName: token.name,
    amount: amount,
    from: isOutgoing ? walletAddress : counterparty,
    to: isOutgoing ? counterparty : walletAddress,
    gasUsed: gasUsed,
    gasPrice: gasPrice,
    gasCostETH: isPi ? 0 : parseFloat(((gasUsed * gasPrice) / 1e9).toFixed(6)),
    status: isSuccess ? 'success' : 'failed',
    timestamp: timestamp,
    blockNumber: isPi ? randomRange(1000000, 5000000) : randomRange(18000000, 19500000),
    nonce: index,
  };
}

function generateTransactions(walletAddress, count, isPi) {
  const txs = [];
  for (let i = 0; i < count; i++) {
    txs.push(generateTransaction(walletAddress, i, isPi));
  }
  txs.sort((a, b) => b.timestamp - a.timestamp);
  txs.forEach((tx, i) => tx.nonce = i);
  return txs;
}

const POSSIBLE_RISK_FLAGS = [
  { id: 'rf_01', label: 'Interaksi dengan kontrak berisiko', severity: 'high', description: 'Wallet pernah berinteraksi dengan smart contract yang teridentifikasi berisiko oleh scanner keamanan.' },
  { id: 'rf_02', label: 'Transaksi besar dalam satu blok', severity: 'medium', description: 'Terdapat transaksi dengan nilai nominal jauh di atas rata-rata wallet.' },
  { id: 'rf_03', label: 'Pola transaksi tidak wajar', severity: 'high', description: 'Pola timing transaksi menunjukkan karakteristik bot atau automasi.' },
  { id: 'rf_04', label: 'Pertukaran dengan address terblacklist', severity: 'critical', description: 'Wallet pernah menerima atau mengirim aset ke address yang ada di blacklist.' },
  { id: 'rf_05', label: 'Umur wallet sangat baru', severity: 'low', description: 'Wallet pertama kali aktif dalam 30 hari terakhir.' },
  { id: 'rf_06', label: 'Frekuensi transaksi sporadis', severity: 'low', description: 'Aktivitas transaksi tidak konsisten.' },
  { id: 'rf_07', label: 'Multiple bridge dalam waktu singkat', severity: 'medium', description: 'Beberapa transaksi bridge ke chain berbeda dalam rentang waktu kurang dari 1 jam.' },
  { id: 'rf_08', label: 'Interaksi dengan mixer/tumbler', severity: 'critical', description: 'Wallet terdeteksi berinteraksi dengan kontrak mixer.' },
];

function generateRiskFlags(score) {
  let flagCount = 0;
  if (score < 200) flagCount = randomRange(4, 6);
  else if (score < 400) flagCount = randomRange(2, 4);
  else if (score < 600) flagCount = randomRange(1, 2);
  else if (score < 800) flagCount = randomRange(0, 1);
  else flagCount = 0;

  const shuffled = [...POSSIBLE_RISK_FLAGS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, flagCount);
}

function calculateCreditScore(walletAddress) {
  const isPi = isPiWallet(walletAddress);

  // Algoritma hash djb2 yang aman untuk mencegah error pada alamat yang banyak angka 0
  let seed = 5381;
  for (let i = 0; i < walletAddress.length; i++) {
    seed = ((seed << 5) + seed) + walletAddress.charCodeAt(i);
    seed = seed & seed;
  }
  seed = Math.abs(seed) + walletAddress.length + walletAddress.charCodeAt(walletAddress.length - 1);
  if (seed === 0) seed = 12345;

  function seededRandom() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  function seededRange(min, max) {
    return Math.floor(seededRandom() * (max - min + 1)) + min;
  }

  const totalTransactions = seededRange(12, 850);
  const successCount = Math.floor(totalTransactions * (0.7 + seededRandom() * 0.28));
  const failCount = totalTransactions - successCount;
  const successRate = parseFloat(((successCount / totalTransactions) * 100).toFixed(1));

  const walletAgeDays = seededRange(1, 1100);
  const firstTxTimestamp = Date.now() - (walletAgeDays * 24 * 60 * 60 * 1000);

  const transactions = generateTransactions(walletAddress, totalTransactions, isPi);

  // --- Hitung skor per kategori (0-250) ---
  let successRateScore;
  if (successRate >= 98) successRateScore = 250;
  else if (successRate >= 95) successRateScore = Math.round(200 + (successRate - 95) * 10);
  else if (successRate >= 90) successRateScore = Math.round(150 + (successRate - 90) * 10);
  else if (successRate >= 80) successRateScore = Math.round(80 + (successRate - 80) * 7);
  else if (successRate >= 60) successRateScore = Math.round(30 + (successRate - 60) * 2.5);
  else successRateScore = Math.round((successRate / 60) * 30);

  let volumeScore;
  if (totalTransactions >= 500) volumeScore = 250;
  // DITAMBAH KURUNG UNTUK MENCEGAH ERROR NaN (Blank Screen)
  else if (totalTransactions >= 200) volumeScore = Math.round(180 + ((totalTransactions - 200) * 0.233));
  else if (totalTransactions >= 50) volumeScore = Math.round(100 + ((totalTransactions - 50) * 0.8));
  else if (totalTransactions >= 20) volumeScore = Math.round(40 + ((totalTransactions - 20) * 2));
  else volumeScore = Math.round((totalTransactions / 20) * 40);

  let ageScore;
  if (walletAgeDays >= 730) ageScore = 250;
  else if (walletAgeDays >= 365) ageScore = Math.round(200 + ((walletAgeDays - 365) * 0.137));
  else if (walletAgeDays >= 180) ageScore = Math.round(140 + ((walletAgeDays - 180) * 0.333));
  else if (walletAgeDays >= 90) ageScore = Math.round(80 + ((walletAgeDays - 90) * 0.667));
  else if (walletAgeDays >= 30) ageScore = Math.round(30 + ((walletAgeDays - 30) * 0.833));
  else ageScore = Math.round((walletAgeDays / 30) * 30);

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

  let rawScore = successRateScore + volumeScore + ageScore - riskPenalty;
  let finalScore = Math.max(0, Math.min(1000, rawScore));
  finalScore = Math.round(finalScore / 5) * 5;

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

  const totalGasETH = transactions
    .filter(t => t.status === 'success')
    .reduce((sum, t) => sum + (t.gasCostETH || 0), 0);

  const estimatedBalance = isPi ? randomFloat(10, 5000, 4) : randomFloat(0.01, 25, 4);
  const percentile = Math.min(99, Math.max(1, Math.round((finalScore / 1000) * 85 + seededRandom() * 14)));
  const networkAvg = 620;
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const recentTxCount = transactions.filter(t => t.timestamp > sevenDaysAgo).length;
  const scoreChange = randomFloat(-30, 45, 1);

  return {
    walletAddress: walletAddress,
    walletAgeDays: walletAgeDays,
    firstTxTimestamp: firstTxTimestamp,
    estimatedBalance: estimatedBalance,
    networkType: isPi ? 'pi' : 'ethereum',
    score: finalScore,
    status: status,
    statusColor: statusColor,
    statusBg: statusBg,
    statusIcon: statusIcon,
    percentile: percentile,
    networkAvg: networkAvg,
    scoreChange: scoreChange,
    breakdown: {
      successRate: { score: successRateScore, max: 250, value: successRate, label: 'Success Rate' },
      volume: { score: volumeScore, max: 250, value: totalTransactions, label: 'Volume Transaksi' },
      age: { score: ageScore, max: 250, value: walletAgeDays, label: 'Umur Wallet' },
      risk: { score: Math.max(0, 250 - riskPenalty), max: 250, penalty: riskPenalty, label: 'Risk Assessment' },
    },
    transactions: {
      total: totalTransactions,
      success: successCount,
      failed: failCount,
      successRate: successRate,
      recentWeek: recentTxCount,
      totalGasETH: parseFloat(totalGasETH.toFixed(4)),
      list: transactions,
    },
    riskFlags: riskFlags,
    generatedAt: new Date().toISOString(),
    isSimulated: true,
  };
}

function generateScoreTrend(currentScore) {
  const trend = [];
  const now = Date.now();
  let score = currentScore - randomRange(20, 60);
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const change = randomRange(-15, 18);
    score = Math.max(0, Math.min(1000, score + change));
    trend.push({
      date: date.toISOString().split('T')[0],
      score: i === 0 ? currentScore : Math.round(score / 5) * 5,
      txCount: randomRange(0, 12),
    });
  }
  return trend;
}

function generateTxTypeDistribution(transactions) {
  const dist = {};
  transactions.forEach(tx => {
    dist[tx.type] = (dist[tx.type] || 0) + 1;
  });
  return Object.entries(dist)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

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

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatETH(amount) {
  if (amount >= 1) return amount.toFixed(4) + ' ETH';
  if (amount >= 0.001) return amount.toFixed(6) + ' ETH';
  return amount.toFixed(8) + ' ETH';
}

function shortAddress(addr) {
  if (!addr || addr.length < 10) return addr || '—';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}
