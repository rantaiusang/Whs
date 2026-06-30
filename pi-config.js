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
  // PI SDK INIT (IMPORTANT)
  // =========================
  function initPi() {
    try {
      if (typeof window !== "undefined" && window.Pi && !window.__PI_INIT__) {

        Pi.init({
          version: "2.0",
          sandbox: IS_SANDBOX
        });

        window.__PI_INIT__ = true;

        console.log("[Pi] SDK initialized successfully");
      }
    } catch (e) {
      console.log("[Pi] Init error:", e);
    }
  }

  // auto init when loaded
  if (typeof window !== "undefined") {
    window.addEventListener("load", initPi);
  }

  // =========================
  // EXPOSE GLOBAL CONFIG
  // =========================
  const config = {
    IS_SANDBOX,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    ENDPOINTS
  };

  if (typeof window !== "undefined") {
    window.APP_CONFIG = config;
  }

})();
