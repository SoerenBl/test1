const nodemailer = require('nodemailer');

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const body = req.body || {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  // Honeypot -- real visitors never see or fill this field (hidden off-screen
  // in the form); a filled value means a bot submitted it. Pretend success
  // so the bot doesn't learn its submission was rejected.
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
  });

  const safeName = name.slice(0, 200);
  const safeSubject = subject.slice(0, 200);
  const safeMessage = message.slice(0, 5000);

  try {
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
    return res.status(502).json({ ok: false, error: 'send_failed' });
  }
};
