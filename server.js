import express from "express";
import fetch from "node-fetch";

const app = express();
app.set("trust proxy", true); // чтобы корректно брать IP за прокси (nginx/cloudflare)
app.use(express.json());
app.use(express.static("public"));

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

function esc(s = "") {
  return String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
}

function getClientIp(req) {
  // express + trust proxy даст req.ip как норм IP
  return req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "";
}

app.post("/track", async (req, res) => {
  try {
    if (!BOT_TOKEN || !CHAT_ID) {
      return res.status(500).json({ ok: false, error: "BOT_TOKEN/CHAT_ID not set" });
    }

    const ip = getClientIp(req);

    const {
      page,
      title,
      referrer,
      lang,
      tz,
      screen,
      ua,
      ts
    } = req.body || {};

    const text =
`✅ Consent visit
🕒 ${esc(ts)}
📄 ${esc(title)} (${esc(page)})
🌐 IP: ${esc(ip)}
🔗 Ref: ${esc(referrer || "-")}
🌍 Lang: ${esc(lang || "-")} | TZ: ${esc(tz || "-")}
🖥 Screen: ${esc(screen || "-")}
🧾 UA: ${esc(ua || "-")}`;

    const tgUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const r = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text })
    });

    const data = await r.json();
    if (!data.ok) return res.status(500).json({ ok: false, error: data });

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.listen(3000, () => console.log("✅ Server on http://localhost:3000"));
