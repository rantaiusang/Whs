import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.WHS_URL,
  process.env.WHS_SERVICE_KEY
);

const PI_BASE = "https://api-sandbox.minepi.com/v2";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { action, paymentId, txid } = req.body;

    if (!paymentId || !action) {
      return res.status(400).json({
        error: "Missing paymentId or action"
      });
    }

    const headers = {
      Authorization: `Key ${process.env.PI_API_KEY}`
    };

    // ===========================
    // APPROVE
    // ===========================
    if (action === "approve") {

      const r = await fetch(
        `${PI_BASE}/payments/${paymentId}/approve`,
        {
          method: "POST",
          headers
        }
      );

      const text = await r.text();

      if (!r.ok) {
        return res.status(r.status).send(text);
      }

      await supabase.from("transactions").upsert({
        payment_id: paymentId,
        status: "approved"
      });

      return res.json({
        status: "approved"
      });
    }

    // ===========================
    // COMPLETE
    // ===========================
    if (action === "complete") {

      if (!txid) {
        return res.status(400).json({
          error: "Missing txid"
        });
      }

      const r = await fetch(
        `${PI_BASE}/payments/${paymentId}/complete`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            txid
          })
        }
      );

      const text = await r.text();

      if (!r.ok) {
        return res.status(r.status).send(text);
      }

      await supabase.from("transactions").upsert({
        payment_id: paymentId,
        txid,
        status: "success"
      });

      return res.json({
        status: "completed"
      });
    }

    return res.status(400).json({
      error: "Invalid action"
    });

  } catch (e) {

    console.error(e);

    return res.status(500).json({
      error: e.message
    });

  }
}
