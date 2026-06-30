/**
 * Menghitung credit score berdasarkan parameter
 * Mengembalikan objek lengkap dengan breakdown
 */
function calculateCreditScore(walletAddress) {
  // Deteksi apakah ini Pi Network atau Ethereum
  const isPi = isPiWallet(walletAddress);

  // --- Parameter dasar (acak tapi deterministik per address) ---
  // Gunakan hash yang lebih robust agar tidak error pada alamat yang banyak angka 0
  let seed = 5381; // Hash awal (dari algoritma djb2)
  for (let i = 0; i < walletAddress.length; i++) {
    seed = ((seed << 5) + seed) + walletAddress.charCodeAt(i); 
    seed = seed & seed; // Convert to 32bit int
  }
  // Tambahkan panjang string dan indeks karakter terakhir untuk menghindari seed 0
  seed = Math.abs(seed) + walletAddress.length + walletAddress.charCodeAt(walletAddress.length - 1);
  if (seed === 0) seed = 12345; // Fallback mutlak agar tidak pernah 0

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
  const successCount = Math.floor(totalTransactions * (0.7 + seededRandom() * 0.28));
  const failCount = totalTransactions - successCount;
  const successRate = parseFloat(((successCount / totalTransactions) * 100).toFixed(1));

  // Umur wallet dalam hari (1 hari sampai ~3 tahun)
  const walletAgeDays = seededRange(1, 1100);
  const firstTxTimestamp = Date.now() - (walletAgeDays * 24 * 60 * 60 * 1000);

  // Generate transaksi (mengirim flag isPi)
  const transactions = generateTransactions(walletAddress, totalTransactions, isPi);

  // --- Hitung skor per kategori (masing-masing 0-250, total max 1000) ---
  let successRateScore;
  if (successRate >= 98) successRateScore = 250;
  else if (successRate >= 95) successRateScore = Math.round(200 + (successRate - 95) * 10);
  else if (successRate >= 90) successRateScore = Math.round(150 + (successRate - 90) * 10);
  else if (successRate >= 80) successRateScore = Math.round(80 + (successRate - 80) * 7);
  else if (successRate >= 60) successRateScore = Math.round(30 + (successRate - 60) * 2.5);
  else successRateScore = Math.round((successRate / 60) * 30);

  let volumeScore;
  if (totalTransactions >= 500) volumeScore = 250;
  else if (totalTransactions >= 200) volumeScore = Math.round(180 + (totalTransactions - 200) * 0.233);
  else if (totalTransactions >= 50) volumeScore = Math.round(100 + (totalTransactions - 50) * 0.8);
  else if (totalTransactions >= 20) volumeScore = Math.round(40 + (totalTransactions - 20) * 2);
  else volumeScore = Math.round((totalTransactions / 20) * 40);

  let ageScore;
  if (walletAgeDays >= 730) ageScore = 250;
  else if (walletAgeDays >= 365) ageScore = Math.round(200 + (walletAgeDays - 365) * 0.137);
  else if (walletAgeDays >= 180) ageScore = Math.round(140 + (walletAgeDays - 180) * 0.333);
  else if (walletAgeDays >= 90) ageScore = Math.round(80 + (walletAgeDays - 90) * 0.667);
  else if (walletAgeDays >= 30) ageScore = Math.round(30 + (walletAgeDays - 30) * 0.833);
  else ageScore = Math.round((walletAgeDays / 30) * 30);

  // Risk Penalty
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
    .reduce((sum, t) => sum + (t.gasCostETH || 0), 0);

  // Hitung saldo estimasi (Pi biasanya memiliki saldo yang lebih besar angkanya)
  const estimatedBalance = isPi ? randomFloat(10, 5000, 4) : randomFloat(0.01, 25, 4);

  const percentile = Math.min(99, Math.max(1, Math.round((finalScore / 1000) * 85 + seededRandom() * 14)));
  const networkAvg = 620;

  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const recentTxCount = transactions.filter(t => t.timestamp > sevenDaysAgo).length;

  const scoreChange = randomFloat(-30, 45, 1);

  return {
    // Data wallet
    walletAddress: walletAddress,
    walletAgeDays: walletAgeDays,
    firstTxTimestamp: firstTxTimestamp,
    estimatedBalance: estimatedBalance,
    networkType: isPi ? 'pi' : 'ethereum',

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
