// Confirmation-email HTML for the contact form (api/contact.js sends this
// to the visitor after the notification mail to Sören goes out).
//
// Table-based layout, every style inline -- <style> blocks and modern CSS
// (flexbox/grid, backdrop-filter, gradients as the *only* background) get
// stripped or ignored by a meaningful slice of real inboxes, Outlook
// desktop especially. The one exception is the headline: it's a separate
// row below the photo rather than overlaid on top of it, because reliable
// text-over-image needs Outlook-specific VML tricks that aren't worth the
// added fragility here -- same visual language (big Anton headline, photo
// banner above it), just not literally layered on the photo the way the
// design mockup showed it.
//
// Logo and hero photo are both referenced by URL rather than embedded, so
// they always reflect whatever's currently live on the site -- update
// logo.png or hero.jpg on soerenblaecker.com and every confirmation sent
// afterward picks it up automatically, no code change needed. The hero
// photo goes through /api/email-hero (see that file) rather than linking
// hero.jpg directly, since email needs an already-cropped-to-banner-shape,
// pre-optimized file (Outlook doesn't support object-fit, so the crop has
// to happen server-side, not in CSS) -- that endpoint re-derives it from
// the live hero.jpg on every request, cached, so it too stays in sync
// automatically.

var SITE_BASE_URL = (process.env.SITE_BASE_URL || 'https://test1-three-peach-63.vercel.app').replace(/\/+$/, '');

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

var COPY = {
  de: {
    subjectLine: 'Deine Nachricht ist angekommen',
    heroLine1: 'Nachricht', heroLine2: 'angekommen.',
    greeting: function (name) { return 'Hallo ' + name + ','; },
    greetingGeneric: 'Hallo,',
    p1: 'vielen Dank für Deine Nachricht über soerenblaecker.com.',
    p2: 'Das hier ist nur eine automatische Bestätigung, dass sie bei mir angekommen ist, ich melde mich so schnell wie möglich persönlich bei Dir zurück, meist innerhalb von 1–2 Werktagen.',
    recapLabel: 'Das hast du geschickt',
    recapSubject: 'Betreff', recapMessage: 'Nachricht',
    signoffLine: 'Bis bald,',
    email: 'E-Mail', phone: 'Telefon', location: 'Standort', locationValue: 'Deutschland',
    legalImpressum: 'Impressum', legalPrivacy: 'Datenschutz',
    footerNote: function (year) {
      return '© ' + year + ' Sören Bläcker — Produktdesign. Diese E-Mail wurde automatisch als Antwort auf eine Anfrage über das Kontaktformular auf soerenblaecker.com versendet.';
    },
  },
  en: {
    subjectLine: 'Your message has arrived',
    heroLine1: 'Message', heroLine2: 'received.',
    greeting: function (name) { return 'Hi ' + name + ','; },
    greetingGeneric: 'Hi,',
    p1: 'thanks for reaching out through soerenblaecker.com.',
    p2: 'This is just an automatic confirmation that your message has arrived, I’ll get back to you personally as soon as I can, usually within 1–2 business days.',
    recapLabel: 'What you sent',
    recapSubject: 'Subject', recapMessage: 'Message',
    signoffLine: 'Talk soon,',
    email: 'Email', phone: 'Phone', location: 'Location', locationValue: 'Germany',
    legalImpressum: 'Legal Notice', legalPrivacy: 'Privacy',
    footerNote: function (year) {
      return '© ' + year + ' Sören Bläcker — Product Design. This email was sent automatically in response to a request submitted through the contact form on soerenblaecker.com.';
    },
  },
};

function renderConfirmationEmail(opts) {
  opts = opts || {};
  var lang = opts.lang === 'en' ? 'en' : 'de';
  var t = COPY[lang];
  // 'static' mode is for the generic, non-personalized version saved under
  // email-templates/ -- a plain-text autoresponder (e.g. IONOS's own,
  // triggered directly on the mailbox for mail that bypasses the site's
  // contact form entirely) has no idea who wrote in or what they wrote, so
  // it can't fill in a name or a recap of "what you sent". Rather than fake
  // that with placeholder data, this mode drops both: a plain "Hallo,"
  // and no recap box at all.
  var isStatic = opts.mode === 'static';
  var name = escapeHtml(opts.name || (lang === 'en' ? 'there' : 'zusammen'));
  var subject = opts.subject ? escapeHtml(opts.subject) : '';
  var message = escapeHtml(opts.message || '').replace(/\r\n|\r|\n/g, '<br>');
  var year = new Date().getFullYear();
  var logoUrl = SITE_BASE_URL + '/logo.png';
  var heroUrl = SITE_BASE_URL + '/api/email-hero';
  var impressumUrl = SITE_BASE_URL + '/impressum/';
  var privacyUrl = SITE_BASE_URL + '/datenschutz/';

  var greetingHtml = isStatic ? t.greetingGeneric : t.greeting(name);

  var subjectRow = subject
    ? '<tr><td style="padding:0 0 12px 0;">'
      + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#a9a8ae;font-weight:600;margin:0 0 3px 0;font-family:Helvetica,Arial,sans-serif;">' + t.recapSubject + '</div>'
      + '<div style="color:#ffffff;font-size:14px;line-height:1.5;font-family:Helvetica,Arial,sans-serif;">' + subject + '</div>'
      + '</td></tr>'
    : '';

  var recapSection = isStatic ? '' : (
    // recap "glass tile" -- approximated with a solid lighter panel +
    // border instead of backdrop-filter (near-zero email support for
    // blur); same rounded-corner, bordered-card impression without it
    '<tr><td style="padding:0 32px 26px 32px;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#38373d;border:1px solid #56555c;border-radius:12px;">'
    + '<tr><td style="padding:18px 20px;font-family:Helvetica,Arial,sans-serif;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
    + '<tr><td style="padding:0 0 12px 0;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#8fc5ea;font-weight:700;">' + t.recapLabel + '</td></tr>'
    + subjectRow
    + '<tr><td>'
    + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#a9a8ae;font-weight:600;margin:0 0 3px 0;">' + t.recapMessage + '</div>'
    + '<div style="color:#ffffff;font-size:14px;line-height:1.5;">' + message + '</div>'
    + '</td></tr>'
    + '</table>'
    + '</td></tr>'
    + '</table>'
    + '</td></tr>'
  );

  var html = '<!doctype html>'
    + '<html lang="' + lang + '">'
    + '<head>'
    + '<meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="color-scheme" content="dark">'
    + '<meta name="supported-color-schemes" content="dark">'
    + '<title>' + t.subjectLine + '</title>'
    + '</head>'
    + '<body style="margin:0;padding:0;background:#1c1b1f;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1c1b1f;">'
    + '<tr><td align="center" style="padding:28px 16px;">'
    + '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#2b2a30;">'

    // hero photo -- pre-cropped by /api/email-hero, not CSS, so it looks
    // right in Outlook too (no object-fit support there)
    + '<tr><td>'
    + '<img src="' + heroUrl + '" width="600" height="260" alt="" style="display:block;width:100%;max-width:600px;height:auto;border:0;">'
    + '</td></tr>'

    // logo + headline, directly below the photo rather than over it
    + '<tr><td style="padding:22px 32px 0 32px;">'
    + '<img src="' + logoUrl + '" alt="Sören Bläcker" height="20" style="height:20px;width:auto;border:0;display:block;">'
    + '</td></tr>'
    + '<tr><td style="padding:14px 32px 6px 32px;">'
    + '<div style="font-family:\'Anton\',Arial,\'Helvetica Neue\',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:.01em;line-height:.98;font-size:30px;color:#ffffff;">'
    + t.heroLine1 + '<br>' + t.heroLine2
    + '</div>'
    + '</td></tr>'

    // body copy
    + '<tr><td style="padding:18px 32px 0 32px;font-family:Helvetica,Arial,sans-serif;">'
    + '<p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#ffffff;">' + greetingHtml + '</p>'
    + '<p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#ffffff;">' + escapeHtml(t.p1) + '</p>'
    + '<p style="margin:0 0 20px 0;font-size:15px;line-height:1.65;color:#ffffff;">' + escapeHtml(t.p2) + '</p>'
    + '</td></tr>'

    + recapSection

    // signoff
    + '<tr><td style="padding:0 32px 30px 32px;font-family:Helvetica,Arial,sans-serif;">'
    + '<p style="margin:0 0 4px 0;font-size:15px;color:#ffffff;">' + t.signoffLine + '</p>'
    + '<p style="margin:0;font-size:15px;color:#ffffff;font-weight:700;">Sören Bläcker</p>'
    + '</td></tr>'

    // footer
    + '<tr><td style="padding:20px 32px 24px 32px;border-top:1px solid #3c3b41;font-family:Helvetica,Arial,sans-serif;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;">'
    + '<tr><td style="padding:8px 0;color:#7d7c82;">' + t.email + '</td><td align="right" style="padding:8px 0;color:#e7e6e9;">info@soerenblaecker.com</td></tr>'
    + '<tr><td style="padding:8px 0;color:#7d7c82;border-top:1px solid #3c3b41;">' + t.phone + '</td><td align="right" style="padding:8px 0;color:#e7e6e9;border-top:1px solid #3c3b41;">+49 15679825104</td></tr>'
    + '<tr><td style="padding:8px 0;color:#7d7c82;border-top:1px solid #3c3b41;">' + t.location + '</td><td align="right" style="padding:8px 0;color:#e7e6e9;border-top:1px solid #3c3b41;">' + t.locationValue + '</td></tr>'
    + '</table>'
    + '<div style="padding-top:14px;margin-top:14px;border-top:1px solid #3c3b41;font-size:12px;">'
    + '<a href="' + impressumUrl + '" style="color:#7d7c82;text-decoration:none;">' + t.legalImpressum + '</a>'
    + '&nbsp;&nbsp;&middot;&nbsp;&nbsp;'
    + '<a href="' + privacyUrl + '" style="color:#7d7c82;text-decoration:none;">' + t.legalPrivacy + '</a>'
    + '</div>'
    + '<p style="margin:16px 0 0 0;font-size:11.5px;line-height:1.6;color:#66656b;">' + escapeHtml(t.footerNote(year)) + '</p>'
    + '</td></tr>'

    + '</table>'
    + '</td></tr>'
    + '</table>'
    + '</body></html>';

  var textLines = [
    isStatic ? t.greetingGeneric : t.greeting(opts.name || (lang === 'en' ? 'there' : 'zusammen')),
    '',
    t.p1,
    t.p2,
  ];
  if (!isStatic) {
    textLines.push('', t.recapLabel + ':');
    if (opts.subject) textLines.push(t.recapSubject + ': ' + opts.subject);
    textLines.push(t.recapMessage + ': ' + (opts.message || ''));
  }
  textLines.push('', t.signoffLine, 'Sören Bläcker');
  var text = textLines.join('\n');

  return { subject: t.subjectLine, html: html, text: text };
}

module.exports = { renderConfirmationEmail: renderConfirmationEmail, SITE_BASE_URL: SITE_BASE_URL };
