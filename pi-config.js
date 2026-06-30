/**
 * ==========================================
 *  WHS APP - FINAL CONFIG
 *  Pi Network + Supabase Integration
 * ==========================================
 */
(function () {

  // =========================
  // ENVIRONMENT
  // =========================
  const IS_SANDBOX = true; // Ubah ke false saat mainnet

  // =========================
  // SUPABASE CONFIG
  // =========================
  const SUPABASE_URL = "https://valpwlebldnkedrznaym.supabase.co";

  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhbHB3bGVibGRua2VkcnpuYXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mzk3ODUsImV4cCI6MjA5ODMxNTc4NX0.G3BDRqiRBmcFwtBRtdiJI3CkptRrya9bxiVozcQZCSc";

  // =========================
  // ENDPOINTS
  // =========================
  const ENDPOINTS = {
    LOGIN: `${SUPABASE_URL}/functions/v1/verify-pi-login`,
    PAYMENT: `${SUPABASE_URL}/functions/v1/verify-pi-payment`
  };

  // =========================
  // PI SDK INIT
  // =========================
  function initPi() {
    try {
      if (typeof window !== "undefined" && window.Pi) {
        
        // Init tanpa appId (SDK v2.0 deteksi otomatis via domain)
        Pi.init({
          version: "2.0",
          sandbox: IS_SANDBOX
        });

        window.__PI_READY__ = true;
        console.log("[Config] ✅ Pi SDK Ready (Sandbox:", IS_SANDBOX + ")");

      } else {
        console.warn("[Config] ⚠️ Pi SDK tidak ditemukan. Pastikan buka di Pi Browser.");
      }
    } catch (err) {
      console.error("[Config] ❌ Gagal init Pi SDK:", err);
    }
  }

  // Init langsung saat script di-load
  if (typeof window !== "undefined") {
    initPi();
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
