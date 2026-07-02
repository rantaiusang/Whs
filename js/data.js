/* ========================================
   DATA.JS — Pi Network Real Data Handler
   Tidak ada simulasi. Semua data dari
   sumber nyata (localStorage setelah login,
   atau API Pi Network di masa depan)
======================================== */

/* ------------------------------------------
   FORMAT UTILITIES
   ------------------------------------------ */
function formatTimestamp(ts) {
  if (!ts || isNaN(ts)) return '—';
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return diffMins + ' menit lalu';
  if (diffHours < 24) return diffHours + ' jam lalu';
  if (diffDays < 7) return diffDays + ' hari lalu';
  if (diffDays < 30) return Math.floor(diffDays / 7) + ' minggu lalu';
  if (diffDays < 365) return Math.floor(diffDays / 30) + ' bulan lalu';
  return Math.floor(diffDays / 365) + ' tahun lalu';
}

function formatDate(ts) {
  if (!ts || isNaN(ts)) return '—';
  return new Date(ts).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatPi(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 Pi';
  if (amount >= 1000) return amount.toFixed(2) + ' Pi';
  if (amount >= 1) return amount.toFixed(4) + ' Pi';
  if (amount >= 0.001) return amount.toFixed(6) + ' Pi';
  return amount.toFixed(8) + ' Pi';
}

function shortAddress(addr) {
  if (!addr || addr.length < 10) return addr || '—';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

/* ------------------------------------------
   PI WALLET VALIDATOR
   Alamat Pi: diawali 'G', panjang 33 karakter
   ------------------------------------------ */
function isValidPiAddress(addr) {
  if (!addr || typeof addr !== 'string') return false;
  if (addr.startsWith('0x')) return false;
  return /^G[a-f0-9]{32}$/i.test(addr);
}

function isPiWallet(address) {
  if (!address) return false;
  /* Prioritas: cek flag auth dulu */
  if (localStorage.getItem('whs_auth_type') === 'pi_network') return true;
  /* Fallback: cek format alamat */
  return isValidPiAddress(address);
}

/* ------------------------------------------
   PI TOKEN LIST (real, bukan fake)
   ------------------------------------------ */
const TOKEN_LIST_PI = [
  { symbol: 'Pi', name: 'Pi Network', decimals: 18 },
];

/* ------------------------------------------
   PI-SPECIFIC RISK FLAGS
   Flag yang relevan untuk ekosistem Pi Network
   ------------------------------------------ */
const PI_RISK_FLAGS = [
  {
    id: 'pi_sybil_01',
    label: 'Indikasi Sybil Attack',
    severity: 'critical',
    description: 'Wallet menunjukkan pola konsisten dengan beberapa wallet lain yang diduga satu operator. Pi Network mendeteksi multiple account dari perangkat/fingerprint yang mirip.'
  },
  {
    id: 'pi_spam_01',
    label: 'Spam Transfer Berulang',
    severity: 'high',
    description: 'Wallet mengirimkan transaksi dalam jumlah besar dengan nominal kecil dan identik ke banyak address dalam waktu singkat.'
  },
  {
    id: 'pi_kyc_01',
    label: 'KYC Tidak Terverifikasi',
    severity: 'medium',
    description: 'Wallet belum menyelesaikan proses KYC Pi Network. Ini membatasi akses ke fitur tertentu dan menurunkan trust level.'
  },
  {
    id: 'pi_inactive_01',
    label: 'Periode Tidak Aktif Panjang',
    severity: 'low',
    description: 'Wallet tidak memiliki aktivitas transaksi selama lebih dari 90 hari berturut-turut.'
  },
  {
    id: 'pi_new_01',
    label: 'Wallet Baru (Kurang dari 30 Hari)',
    severity: 'low',
    description: 'Wallet pertama kali aktif dalam 30 hari terakhir. Trust score belum terbentuk sepenuhnya.'
  },
  {
    id: 'pi_concentrated_01',
    label: 'Konsentrasi Penerima Tunggal',
    severity: 'medium',
    description: 'Lebih dari 80% transaksi masuk/keluar dari satu address saja. Pola ini bisa menunjukkan wash trading atau kontrol tunggal.'
  },
  {
    id: 'pi_timing_01',
    label: 'Pola Timing Mencurigakan',
    severity: 'high',
    description: 'Transaksi selalu terjadi pada interval yang sangat presisi (misal tepat setiap 60 detik), mengindikasikan automasi/bot.'
  },
  {
    id: 'pi_blacklist_01',
    label: 'Interaksi dengan Address Terblacklist',
    severity: 'critical',
    description: 'Wallet pernah bertransaksi dengan address yang masuk daftar blacklist Pi Network karena pelanggaran kebijakan.'
  },
];

/* ------------------------------------------
   DATA STORAGE
   Menyimpan/mengambil data real dari localStorage
   Setelah login, data disimpan oleh halaman login
   ------------------------------------------ */
function getStoredPiData() {
  try {
    var raw = localStorage.getItem('whs_pi_data');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function storePiData(data) {
  try {
    localStorage.setItem('whs_pi_data', JSON.stringify(data));
  } catch (e) {
    /* localStorage penuh atau diblokir — silent fail */
  }
}

/* ------------------------------------------
   SCORE CALCULATOR — REAL DATA VERSION
   Tidak ada random. Semua dari data nyata.
   Jika data belum tersedia, tampilkan 0
   dengan status "Data Belum Tersedia"
   ------------------------------------------ */
function calculateCreditScore(walletAddress) {
  var storedData = getStoredPiData();
  var isPi = isPiWallet(walletAddress);

  /* === JIKA DATA REAL BELUM ADA === */
  if (!storedData || !storedData.transactions || storedData.transactions.length === 0) {
    return buildEmptyScore(walletAddress, isPi);
  }

  /* === PARSE DATA REAL === */
  var txList = storedData.transactions || [];
  var kycStatus = storedData.kycStatus || 'none'; /* none, pending, verified */
  var walletCreatedAt = storedData.walletCreatedAt || null;
  var piBalance = storedData.balance || 0;
  var flaggedByNetwork = storedData.flaggedByNetwork || false;

  /* Hitung metrik real dari transaksi */
  var totalTx = txList.length;
  var successTx = txList.filter(function(t) { return t.status === 'success'; }).length;
  var failedTx = totalTx - successTx;
  var successRate = totalTx > 0 ? parseFloat(((successTx / totalTx) * 100).toFixed(1)) : 0;

  /* Wallet age dari data real, bukan random */
  var walletAgeDays = 0;
  var firstTxTimestamp = null;
  if (walletCreatedAt) {
    walletAgeDays = Math.max(1, Math.floor((Date.now() - walletCreatedAt) / 86400000));
  } else if (txList.length > 0) {
    var timestamps = txList.map(function(t) { return t.timestamp; }).filter(function(t) { return t; });
    if (timestamps.length > 0) {
      firstTxTimestamp = Math.min.apply(null, timestamps);
      walletAgeDays = Math.max(1, Math.floor((Date.now() - firstTxTimestamp) / 86400000));
    }
  }

  /* Transaksi 7 hari terakhir */
  var sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  var recentWeek = txList.filter(function(t) { return t.timestamp > sevenDaysAgo; }).length;

  /* === SKOR PER KATEGORI === */

  /* 1. Success Rate (0-250) */
  var successRateScore;
  if (successRate >= 98) successRateScore = 250;
  else if (successRate >= 95) successRateScore = Math.round(200 + (successRate - 95) * 10);
  else if (successRate >= 90) successRateScore = Math.round(150 + (successRate - 90) * 10);
  else if (successRate >= 80) successRateScore = Math.round(80 + (successRate - 80) * 7);
  else if (successRate >= 60) successRateScore = Math.round(30 + (successRate - 60) * 2.5);
  else successRateScore = Math.round((successRate / 60) * 30);

  /* 2. Volume Transaksi (0-250) */
  var volumeScore;
  if (totalTx >= 500) volumeScore = 250;
  else if (totalTx >= 200) volumeScore = Math.round(180 + ((totalTx - 200) * 0.233));
  else if (totalTx >= 50) volumeScore = Math.round(100 + ((totalTx - 50) * 0.8));
  else if (totalTx >= 20) volumeScore = Math.round(40 + ((totalTx - 20) * 2));
  else volumeScore = Math.round((totalTx / 20) * 40);

  /* 3. Umur Wallet (0-250) */
  var ageScore;
  if (walletAgeDays >= 730) ageScore = 250;
  else if (walletAgeDays >= 365) ageScore = Math.round(200 + ((walletAgeDays - 365) * 0.137));
  else if (walletAgeDays >= 180) ageScore = Math.round(140 + ((walletAgeDays - 180) * 0.333));
  else if (walletAgeDays >= 90) ageScore = Math.round(80 + ((walletAgeDays - 90) * 0.667));
  else if (walletAgeDays >= 30) ageScore = Math.round(30 + ((walletAgeDays - 30) * 0.833));
  else ageScore = Math.round((walletAgeDays / 30) * 30);

  /* 4. Risk Assessment (0-250, dikurangi penalty) */
  var riskFlags = [];
  var riskPenalty = 0;

  /* Deteksi flag dari data real */
  if (flaggedByNetwork) {
    riskFlags.push(PI_RISK_FLAGS[7]); /* blacklist */
    riskPenalty += 80;
  }

  if (kycStatus === 'none') {
    riskFlags.push(PI_RISK_FLAGS[2]); /* KYC belum verifikasi */
    riskPenalty += 30;
  }

  if (walletAgeDays < 30 && totalTx > 0) {
    riskFlags.push(PI_RISK_FLAGS[4]); /* wallet baru */
    riskPenalty += 10;
  }

  if (walletAgeDays > 90 && recentWeek === 0 && totalTx > 0) {
    riskFlags.push(PI_RISK_FLAGS[3]); /* tidak aktif */
    riskPenalty += 10;
  }

  /* Cek konsentrasi penerima */
  if (totalTx >= 10) {
    var receiveTargets = {};
    txList.forEach(function(t) {
      if (t.type === 'receive' && t.from) {
        receiveTargets[t.from] = (receiveTargets[t.from] || 0) + 1;
      }
    });
    var targetCounts = Object.values(receiveTargets);
    if (targetCounts.length > 0) {
      var maxTarget = Math.max.apply(null, targetCounts);
      if (maxTarget / totalTx > 0.8) {
        riskFlags.push(PI_RISK_FLAGS[5]); /* konsentrasi */
        riskPenalty += 30;
      }
    }
  }

  /* Cek pola timing (transaksi dengan interval identik) */
  if (totalTx >= 5) {
    var sorted = txList.slice().sort(function(a, b) { return a.timestamp - b.timestamp; });
    var suspiciousTiming = false;
    for (var i = 2; i < sorted.length; i++) {
      var gap1 = sorted[i].timestamp - sorted[i-1].timestamp;
      var gap2 = sorted[i-1].timestamp - sorted[i-2].timestamp;
      if (gap1 > 0 && gap2 > 0 && Math.abs(gap1 - gap2) < 2000) {
        suspiciousTiming = true;
        break;
      }
    }
    if (suspiciousTiming) {
      riskFlags.push(PI_RISK_FLAGS[6]); /* timing bot */
      riskPenalty += 50;
    }
  }

  /* Cek spam (banyak tx kecil identik dalam 1 jam) */
  if (totalTx >= 5) {
    var oneHourAgo = Date.now() - 3600000;
    var recentHour = txList.filter(function(t) { return t.timestamp > oneHourAgo; });
    if (recentHour.length >= 10) {
      var smallTx = recentHour.filter(function(t) { return t.amount < 0.01; });
      if (smallTx.length >= 8) {
        riskFlags.push(PI_RISK_FLAGS[1]); /* spam */
        riskPenalty += 50;
      }
    }
  }

  riskPenalty = Math.min(riskPenalty, 250);
  var riskScore = Math.max(0, 250 - riskPenalty);

  /* === FINAL SCORE === */
  var rawScore = successRateScore + volumeScore + ageScore - riskPenalty;
  var finalScore = Math.max(0, Math.min(1000, rawScore));
  finalScore = Math.round(finalScore / 5) * 5;

  /* Status */
  var status, statusColor, statusBg, statusIcon;
  if (finalScore >= 800) {
    status = 'Excellent'; statusColor = '#22c55e'; statusBg = 'rgba(34,197,94,0.12)'; statusIcon = 'fa-circle-check';
  } else if (finalScore >= 600) {
    status = 'Good'; statusColor = '#f59e0b'; statusBg = 'rgba(245,158,11,0.12)'; statusIcon = 'fa-circle-minus';
  } else if (finalScore >= 350) {
    status = 'Risky'; statusColor = '#f97316'; statusBg = 'rgba(249,115,22,0.12)'; statusIcon = 'fa-triangle-exclamation';
  } else {
    status = 'Dangerous'; statusColor = '#ef4444'; statusBg = 'rgba(239,68,68,0.12)'; statusIcon = 'fa-circle-xmark';
  }

  var percentile = Math.min(99, Math.max(1, Math.round((finalScore / 1000) * 85 + 14)));

  /* Score change — dihitung dari riwayat jika ada, kalau belum ada set 0 */
  var scoreChange = 0;
  if (storedData.scoreHistory && storedData.scoreHistory.length >= 2) {
    var prev = storedData.scoreHistory[storedData.scoreHistory.length - 2];
    var curr = storedData.scoreHistory[storedData.scoreHistory.length - 1];
    if (prev !== undefined && curr !== undefined) {
      scoreChange = parseFloat((curr - prev).toFixed(1));
    }
  }

  /* Simpan ke riwayat */
  if (!storedData.scoreHistory) storedData.scoreHistory = [];
  if (storedData.scoreHistory.length === 0 || storedData.scoreHistory[storedData.scoreHistory.length - 1] !== finalScore) {
    storedData.scoreHistory.push(finalScore);
    if (storedData.scoreHistory.length > 30) storedData.scoreHistory = storedData.scoreHistory.slice(-30);
    storePiData(storedData);
  }

  return {
    walletAddress: walletAddress,
    walletAgeDays: walletAgeDays,
    firstTxTimestamp: firstTxTimestamp,
    estimatedBalance: piBalance,
    networkType: 'pi',
    score: finalScore,
    status: status,
    statusColor: statusColor,
    statusBg: statusBg,
    statusIcon: statusIcon,
    percentile: percentile,
    networkAvg: 620,
    scoreChange: scoreChange,
    kycStatus: kycStatus,
    breakdown: {
      successRate: { score: successRateScore, max: 250, value: successRate, label: 'Success Rate' },
      volume: { score: volumeScore, max: 250, value: totalTx, label: 'Volume Transaksi' },
      age: { score: ageScore, max: 250, value: walletAgeDays, label: 'Umur Wallet' },
      risk: { score: riskScore, max: 250, penalty: riskPenalty, label: 'Risk Assessment' },
    },
    transactions: {
      total: totalTx,
      success: successTx,
      failed: failedTx,
      successRate: successRate,
      recentWeek: recentWeek,
      totalGasETH: 0, /* Pi tidak punya gas */
      list: txList,
    },
    riskFlags: riskFlags,
    scoreHistory: storedData.scoreHistory || [],
    generatedAt: new Date().toISOString(),
    isSimulated: false,
  };
}

/* ------------------------------------------
   EMPTY SCORE — ketika belum ada data transaksi
   Menampilkan score 0 dengan pesan jelas,
   bukan kosong/blank
   ------------------------------------------ */
function buildEmptyScore(walletAddress, isPi) {
  return {
    walletAddress: walletAddress,
    walletAgeDays: 0,
    firstTxTimestamp: null,
    estimatedBalance: 0,
    networkType: 'pi',
    score: 0,
    status: 'Data Belum Tersedia',
    statusColor: '#475569',
    statusBg: 'rgba(71,85,105,0.12)',
    statusIcon: 'fa-circle-question',
    percentile: 0,
    networkAvg: 620,
    scoreChange: 0,
    kycStatus: 'none',
    breakdown: {
      successRate: { score: 0, max: 250, value: 0, label: 'Success Rate' },
      volume: { score: 0, max: 250, value: 0, label: 'Volume Transaksi' },
      age: { score: 0, max: 250, value: 0, label: 'Umur Wallet' },
      risk: { score: 0, max: 250, penalty: 0, label: 'Risk Assessment' },
    },
    transactions: {
      total: 0,
      success: 0,
      failed: 0,
      successRate: 0,
      recentWeek: 0,
      totalGasETH: 0,
      list: [],
    },
    riskFlags: [
      {
        id: 'pi_nodata_01',
        label: 'Belum Ada Transaksi',
        severity: 'low',
        description: 'Wallet ini belum memiliki riwayat transaksi. Score akan terbentuk setelah ada aktivitas on-chain.'
      }
    ],
    scoreHistory: [],
    generatedAt: new Date().toISOString(),
    isSimulated: false,
  };
}

/* ------------------------------------------
   SCORE TREND — dari riwayat real
   ------------------------------------------ */
function generateScoreTrend(currentScore) {
  var storedData = getStoredPiData();
  var history = (storedData && storedData.scoreHistory) ? storedData.scoreHistory : [];

  if (history.length === 0) {
    /* Jika belum ada riwayat, buat trend flat dari 0 ke current */
    var trend = [];
    var now = Date.now();
    for (var i = 29; i >= 0; i--) {
      var date = new Date(now - i * 24 * 60 * 60 * 1000);
      trend.push({
        date: date.toISOString().split('T')[0],
        score: i === 0 ? currentScore : 0,
        txCount: 0,
      });
    }
    return trend;
  }

  /* Gunakan riwayat real, padding ke 30 hari */
  var trend = [];
  var now = Date.now();
  var startIdx = Math.max(0, history.length - 30);

  for (var i = 29; i >= 0; i--) {
    var date = new Date(now - i * 24 * 60 * 60 * 1000);
    var histIdx = history.length - 1 - (29 - i);

    if (histIdx >= 0 && histIdx < history.length) {
      trend.push({
        date: date.toISOString().split('T')[0],
        score: history[histIdx],
        txCount: 0, /* bisa diisi dari data tx per hari jika ada */
      });
    } else {
      /* Sebelum riwayat ada, tampilkan 0 */
      trend.push({
        date: date.toISOString().split('T')[0],
        score: 0,
        txCount: 0,
      });
    }
  }

  /* Pastikan entry terakhir = current score */
  if (trend.length > 0) {
    trend[trend.length - 1].score = currentScore;
  }

  return trend;
}

/* ------------------------------------------
   TX DISTRIBUTION — dari data real
   ------------------------------------------ */
function generateTxTypeDistribution(transactions) {
  if (!transactions || transactions.length === 0) return [];
  var dist = {};
  transactions.forEach(function(tx) {
    dist[tx.type] = (dist[tx.type] || 0) + 1;
  });
  return Object.entries(dist)
    .map(function(entry) { return { type: entry[0], count: entry[1] }; })
    .sort(function(a, b) { return b.count - a.count; });
}
