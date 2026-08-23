const nodemailer = require('nodemailer');

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // Everything below wrapped in one try/catch -- an error thrown anywhere
  // in here (a bad SMTP host, a hung connection, a bug) used to escape
  // uncaught and come back to the browser as a bare 502 with no body,
  // which is unreadable both from the Network tab and (on Vercel's
  // Hobby-plan log retention) from the dashboard. Catching it here and
  // returning real JSON -- including the underlying error's own message,
  // truncated -- means the actual cause shows up directly in the
  // browser's Response tab without needing dashboard log access at all.
  try {
    const body = req.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    // Honeypot -- real visitors never see or fill this field (hidden
    // off-screen in the form); a filled value means a bot submitted it.
    // Pretend success so the bot doesn't learn its submission was rejected.
    const honeypot = typeof body.company === 'string' ? body.company.trim() : '';
    if (honeypot) {
      return res.status(200).json({ ok: true });
    }

    if (!name || !message || !isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: 'invalid_input' });
    }

    const host = process.env.IONOS_SMTP_HOST || 'smtp.ionos.de';
    const port = Number(process.env.IONOS_SMTP_PORT || 587);
    const user = process.env.IONOS_SMTP_USER;
    const pass = process.env.IONOS_SMTP_PASSWORD;
    const to = process.env.CONTACT_TO_EMAIL || user;

    if (!user || !pass || !to) {
      console.error('Contact form: IONOS_SMTP_USER / IONOS_SMTP_PASSWORD / CONTACT_TO_EMAIL not set');
      return res.status(500).json({ ok: false, error: 'server_not_configured' });
    }

    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: port === 465,
      auth: { user: user, pass: pass },
      // Fail fast with a real error instead of hanging until Vercel's own
      // function timeout kills the request -- that's what a bare,
      // body-less 502 (no JSON, nothing in the Network tab's Response
      // pane) usually means: nodemailer's own defaults (2 minutes) are
      // far longer than a serverless function is ever allowed to run.
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
    });

    const safeName = name.slice(0, 200);
    const safeSubject = subject.slice(0, 200);
    const safeMessage = message.slice(0, 5000);

    await transporter.sendMail({
      // IONOS rejects mail whose From doesn't match the authenticated
      // mailbox (anti-spoofing) -- the visitor's own name/address goes in
      // the display name and replyTo instead, so a reply still goes
      // straight to them.
      from: '"' + safeName.replace(/"/g, "'") + ' via soerenblaecker.com" <' + user + '>',
      to: to,
      replyTo: email,
      subject: safeSubject ? '[Kontaktformular] ' + safeSubject : '[Kontaktformular] Neue Anfrage von ' + safeName,
      text: 'Name: ' + safeName + '\nE-Mail: ' + email + '\n\n' + safeMessage,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact form send failed:', err);
    var detail = err && err.message ? String(err.message).slice(0, 300) : 'unknown error';
    return res.status(502).json({ ok: false, error: 'send_failed', detail: detail });
  }
};

// Vercel Serverless Function config -- gives sendMail's own 8s timeouts
// above room to actually run (and return a real error) instead of racing
// against a shorter platform default.
module.exports.config = { maxDuration: 25 };
