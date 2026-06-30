import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// SENJATA RAHASIA: Memaksa Node.js mengabaikan SSL Pi Network yang Expired
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export default async function handler(req, res) {
  // Izinkan akses dari HTML kamu
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { paymentId, txid, action } = req.body;
    if (!paymentId || !action) throw new Error("Parameter tidak lengkap");

    // Ambil Env Vars dari Vercel
    const supabase = createClient(process.env.WHS_URL, process.env.WHS_SERVICE_KEY);
    const PI_API_KEY = process.env.PI_API_KEY;
    if (!PI_API_KEY) throw new Error("Env Vercel belum diset");

    // ==========================
    // PROSES 1: APPROVE
    // ==========================
    if (action === "approve") {
      const approveRes = await fetch(`https://api-sandbox.minepi.com/v2/payments/${paymentId}/approve`, {
        method: "POST",
        headers: { "Authorization": `Key ${PI_API_KEY}`, "Content-Type": "application/json" }
      });

      if (!approveRes.ok) {
        const errText = await approveRes.text();
        throw new Error(`Pi Gagal: ${errText}`);
      }

      // Simpan ke DB Supabase
      const { data: exist } = await supabase.from("transactions").select("payment_id").eq("payment_id", paymentId).limit(1).maybeSingle();
      
      if (!exist) {
        await supabase.from("transactions").insert({ payment_id: paymentId, status: "approved" });
      } else {
        await supabase.from("transactions").update({ status: "approved" }).eq("payment_id", paymentId);
      }

      return res.status(200).json({ status: "approved" });
    }

    // ==========================
    // PROSES 2: COMPLETE
    // ==========================
    if (action === "complete") {
      if (!txid) throw new Error("TXID dibutuhkan");

      const verifyRes = await fetch(`https://api-sandbox.minepi.com/v2/payments/${paymentId}`, {
        method: "GET",
        headers: { "Authorization": `Key ${PI_API_KEY}` }
      });

      const piData = await verifyRes.json();
      const serverTxid = piData?.transaction?.txid;
      if (!serverTxid) throw new Error("TXID belum ada di Pi");
      if (serverTxid !== txid) throw new Error("TXID Tidak Cocok!");

      // Update DB Supabase
      const { data: exist } = await supabase.from("transactions").select("payment_id").eq("payment_id", paymentId).limit(1).maybeSingle();
      
      if (exist) {
        await supabase.from("transactions").update({ txid, status: "success", amount: piData.amount || 1 }).eq("payment_id", paymentId);
      } else {
        await supabase.from("transactions").insert({ payment_id: paymentId, txid, amount: piData.amount || 1, status: "success" });
      }

      // Notify Pi Network
      await fetch(`https://api-sandbox.minepi.com/v2/payments/${paymentId}/complete`, {
        method: "POST",
        headers: { "Authorization": `Key ${PI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ txid })
      });

      return res.status(200).json({ status: "completed" });
    }

    throw new Error("Action tidak valid");
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
