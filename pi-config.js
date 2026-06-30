/**
 * pi-config.js
 * File konfigurasi utama untuk Aurora Store Pi Network App.
 */

const config = (function() {
    
    // --- PENGATURAN LINGKUNGAN (ENVIRONMENT) ---
    const IS_SANDBOX = true; // Ubah ke 'false' saat Production

    // --- KONEKSI BACKEND (SUPABASE) ---
    const SUPABASE_URL = "https://valpwlebldnkedrznaym.supabase.co";

    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhbHB3bGVibGRua2VkcnpuYXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mzk3ODUsImV4cCI6MjA5ODMxNTc4NX0.G3BDRqiRBmcFwtBRtdiJI3CkptRrya9bxiVozcQZCSc";

    const ENDPOINTS = {
        LOGIN: `${SUPABASE_URL}/functions/v1/verify-pi-login`,
        PAYMENT: `${SUPABASE_URL}/functions/v1/verify-pi-payment`
    };

    // Debugging Log hanya di Browser
    if (IS_SANDBOX && typeof window !== 'undefined') {
        console.log("[Config] Running in SANDBOX MODE");
        console.log("[Config] Supabase URL:", SUPABASE_URL);
    }

    return {
        IS_SANDBOX,
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        ENDPOINTS
    };

})();

// Pengaman agar tidak eror di Cloudflare Workers/Build Tools
if (typeof window !== 'undefined') {
    window.APP_CONFIG = config;
}

// Export untuk lingkungan Node.js/Workers jika diperlukan
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}
