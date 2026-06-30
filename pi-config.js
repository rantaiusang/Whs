/**
 * pi-config.js
 * File konfigurasi utama untuk Aurora Store Pi Network App.
 */

const config = (function() {
    
    // --- PENGATURAN LINGKUNGAN (ENVIRONMENT) ---
    const IS_SANDBOX = true; // Ubah ke 'false' saat Production

    // --- KONEKSI BACKEND (SUPABASE) ---
    const SUPABASE_BASE_URL = "https://dikapquhusbwjccbqcsb.supabase.co/functions/v1";

    const ENDPOINTS = {
        LOGIN: `${SUPABASE_BASE_URL}/verify-pi-login`,
        PAYMENT: `${SUPABASE_BASE_URL}/verify-pi-payment`
    };

    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpa2FwcXVodXNid2pjY2JxY3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxNjQ1NTQsImV4cCI6MjA4NDc0MDU1NH0.X278oHDF0be7oa25484eliSukSYAYvDbJyU6ysz83zA";

    // Debugging Log hanya di Browser
    if (IS_SANDBOX && typeof window !== 'undefined') {
        console.log("[Config] Running in SANDBOX MODE");
    }

    return {
        IS_SANDBOX,
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
