// POST /api/contact — sends a contact-form message to Matthew via Resend.
// Vercel Node function (CommonJS). No dependencies: calls Resend's REST API with fetch.
//
// Env:
//   RESEND_API_KEY  (required) — Resend API key. Never hardcode it.
//   CONTACT_FROM    (optional) — sender. Defaults to Resend's test sender, which can
//                   only deliver to the email on the Resend account. Set this to an
//                   address on a domain verified in Resend to lift that limit.
//
// Responses (JSON):
//   200 { ok: true }
//   400 { ok: false, error: "invalid", fields: { name?, email?, message? } }
//   405 { ok: false, error: "method_not_allowed" }
//   500 { ok: false, error: "not_configured" }   — RESEND_API_KEY missing
//   502 { ok: false, error: "send_failed" }      — Resend rejected or unreachable

const TO = "matthewfriedler@gmail.com";
const DEFAULT_FROM = "Portfolio contact form <onboarding@resend.dev>";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ name, email, message }) {
  const fields = {};
  if (!name) fields.name = "Please enter your name.";
  else if (name.length > 100) fields.name = "Please keep your name under 100 characters.";
  if (!email) fields.email = "Please enter your email address.";
  else if (email.length > 254 || !EMAIL_RE.test(email)) fields.email = "Please enter a valid email address.";
  if (!message) fields.message = "Please enter a message.";
  else if (message.length < 10) fields.message = "Please write at least 10 characters.";
  else if (message.length > 5000) fields.message = "Please keep your message under 5,000 characters.";
  return fields;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body && typeof body === "object" ? body : {};

  const str = (v) => (typeof v === "string" ? v.trim() : "");
  const name = str(body.name).replace(/[\r\n]+/g, " ");
  const email = str(body.email);
  const message = str(body.message);

  // Honeypot: real visitors never see or fill the "website" field. Bots do.
  // Pretend success so the bot learns nothing.
  if (str(body.website)) return res.status(200).json({ ok: true });

  const fields = validate({ name, email, message });
  if (Object.keys(fields).length) {
    return res.status(400).json({ ok: false, error: "invalid", fields });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("contact: RESEND_API_KEY is not set");
    return res.status(500).json({ ok: false, error: "not_configured" });
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM || DEFAULT_FROM,
        to: [TO],
        reply_to: email,
        subject: `Portfolio message from ${name}`,
        text: `From: ${name} <${email}>\n\n${message}`,
        html:
          `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>` +
          `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) {
      console.error("contact: Resend responded", r.status, await r.text().catch(() => ""));
      return res.status(502).json({ ok: false, error: "send_failed" });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("contact: request to Resend failed", err);
    return res.status(502).json({ ok: false, error: "send_failed" });
  }
};
