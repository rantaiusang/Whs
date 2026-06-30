/**
 * ==========================================
 *  WHS APP - FINAL CONFIG (FIXED RACE CONDITION)
 * ==========================================
 */
(function () {

  // =========================
  // ENVIRONMENT
  // =========================
  const IS_SANDBOX = true;

  // =========================
  // SUPABASE CONFIG
  // =========================
  const SUPABASE_URL = "https://valpwlebldnkedrznaym.supabase.co";

  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhbHB3bGVibGRua2VkcnpuYXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mzk3ODUsImV4cCI6MjA5ODMxNTc4NX0.G3BDRqiRBmcFwtBRtdiJI3CkptRrya9bxiVozcQZCSc";

  const ENDPOINTS = {
    LOGIN: `${SUPABASE_URL}/functions/v1/verify-pi-login`,
    PAYMENT: `${SUPABASE_URL}/functions/v1/verify-pi-payment`
  };

  // =========================
  // PI SDK INIT (ANTI RACE CONDITION)
  // =========================
  function waitAndInitPi() {
    // Cek apakah SDK sudah ada
    if (typeof window.Pi !== 'undefined') {
      try {
        Pi.init({
          version: "2.0",
          sandbox: IS_SANDBOX
        });
        window.__PI_READY__ = true;
        console.log("[Config] ✅ Pi SDK berhasil di-init!");
        return; // Berhenti, tugas selesai
      } catch (err) {
        console.error("[Config] ❌ Gagal init:", err);
        return;
      }
    }

    // Kalau SDK belum ada, TUNGGU 100ms, lalu cek lagi
    console.log("[Config] ⏳ Menunggu Pi SDK loading...");
    setTimeout(waitAndInitPi, 100);
  }

  // Mulai proses penungguan
  if (typeof window !== "undefined") {
    waitAndInitPi();
  }

  // =========================
  // GLOBAL EXPORT
  // =========================
  window.APP_CONFIG = {
    IS_SANDBOX,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    ENDPOINTS,
    isPiReady: function () {
      return window.__PI_READY__ === true;
    }
  };

})();
