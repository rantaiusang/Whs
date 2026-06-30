import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.WHS_URL,
  process.env.WHS_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { paymentId, action, txid } = req.body;

    if (!paymentId || !action) {
      return res.status(400).json({
        success: false,
        message: "Missing paymentId or action"
      });
    }

    // =========================
    // APPROVE
    // =========================
    if (action === "approve") {

      console.log("APPROVE:", paymentId);

      // simpan ke supabase
      await supabase.from("transactions").upsert({
        payment_id: paymentId,
        status: "approved"
      });

      return res.status(200).json({
        success: true,
        status: "approved",
        paymentId
      });
    }

    // =========================
    // COMPLETE
    // =========================
    if (action === "complete") {

      if (!txid) {
        return res.status(400).json({
          success: false,
          message: "Missing txid"
        });
      }

      console.log("COMPLETE:", paymentId, txid);

      // update supabase
      await supabase.from("transactions").upsert({
        payment_id: paymentId,
        txid,
        status: "success"
      });

      return res.status(200).json({
        success: true,
        status: "completed",
        paymentId,
        txid
      });
    }

    return res.status(400).json({
      success: false,
      error: "Invalid action"
    });

  } catch (err) {
    console.error("ERROR:", err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
