// Confirmation-email HTML for the contact form (api/contact.js sends this
// to the visitor after the notification mail to Sören goes out), plus the
// matching HTML layout for the notification mail Sören himself receives.
//
// Table-based layout, every style inline -- <style> blocks and modern CSS
// (flexbox/grid, gradients as the *only* background) get stripped or
// ignored by a meaningful slice of real inboxes, Outlook desktop
// especially. The one exception is the headline: it's a separate row below
// the photo rather than overlaid on top of it, because reliable
// text-over-image needs Outlook-specific VML tricks that aren't worth the
// added fragility here -- same visual language (big Anton headline, photo
// banner above it), just not literally layered on the photo the way the
// design mockup showed it.
//
// The one <style> block this template does ship (FONT_FACE_CSS) is a
// progressive enhancement, not a requirement: it's an @font-face for Anton,
// which Apple Mail (macOS + iOS, a WebKit-based renderer with real web-font
// support) picks up, while clients that strip <style> blocks entirely just
// fall back to the inline font stack already on the headline. The recap
// "glass tile" doesn't rely on any such enhancement -- backdrop-filter
// turned out to have essentially no real support in actual mail clients,
// Apple Mail included (Safari's own support doesn't carry over to Mail's
// more restricted rendering path). Since the panel only ever sits over one
// flat, known background color, there's nothing to actually blur anyway --
// a soft diagonal gradient + border + inset highlight fakes the same
// frosted-glass read with zero dynamic effects, so every client renders it
// identically.
//
// Logo and hero photo are both referenced by URL rather than embedded, so
// they always reflect whatever's currently live on the site -- update
// logo-white.png or hero.jpg on soerenblaecker.com and every confirmation
// sent afterward picks it up automatically, no code change needed. The
// white variant is used here specifically because the logo sits directly
// on the photo overlay (see headerBlock) -- the site's own nav still uses
// the regular blue logo.png everywhere else. The hero
// photo goes through /api/email-hero (see that file) rather than linking
// hero.jpg directly, since email needs an already-cropped-to-banner-shape,
// pre-optimized file (Outlook doesn't support object-fit, so the crop has
// to happen server-side, not in CSS) -- that endpoint re-derives it from
// the live hero.jpg on every request, cached, so it too stays in sync
// automatically.

var fs = require('fs');
var path = require('path');

var SITE_BASE_URL = (process.env.SITE_BASE_URL || 'https://test1-three-peach-63.vercel.app').replace(/\/+$/, '');

// email/content.txt is the hand-editable source for every text in these
// emails (see email/README.md) -- same "plain text file next to the code"
// convention as about-content.txt etc. for the site itself. Parsed once at
// module load (this file is required fresh per serverless invocation
// anyway, so there's no staleness to worry about) into three sections by
// looking for DEUTSCH/ENGLISH/BENACHRICHTIGUNG in each "--- ... ---"
// header -- order matters, since the notification section's own header
// also contains the word "Deutsch". Any read/parse failure (file missing,
// a stray edit that breaks the format) falls back to DEFAULTS below rather
// than throwing, so a typo in the text file can never break mail sending,
// only silently leave one field on its last-known text.
function parseContentTxt(raw) {
  var sections = {};
  var current = null;
  raw.split(/\r\n|\r|\n/).forEach(function (line) {
    var header = line.match(/^-{2,}\s*(.+?)\s*-{2,}\s*$/);
    if (header) {
      var label = header[1].toUpperCase();
      var key = label.indexOf('BENACHRICHTIGUNG') !== -1 ? 'notify'
        : label.indexOf('ENGLISH') !== -1 ? 'confirmEn'
        : label.indexOf('DEUTSCH') !== -1 ? 'confirmDe'
        : null;
      current = key;
      if (current && !sections[current]) sections[current] = {};
      return;
    }
    if (!current) return;
    var kv = line.match(/^([^:]+):\s*(.*)$/);
    if (!kv) return;
    sections[current][kv[1].trim()] = kv[2];
  });
  return sections;
}

function loadEmailContent() {
  try {
    var raw = fs.readFileSync(path.join(__dirname, '..', 'email', 'content.txt'), 'utf8');
    return parseContentTxt(raw);
  } catch (err) {
    console.error('email/content.txt could not be read, using built-in default email texts:', err.message);
    return {};
  }
}

// {name}/{jahr} placeholders inside a hand-edited line get substituted here
// rather than content.txt storing actual functions (it's a plain text file,
// not code) -- String(...) on the value guards against a template that
// dropped the placeholder entirely, which would otherwise throw on .replace.
function fillTemplate(template, vars) {
  var out = String(template == null ? '' : template);
  Object.keys(vars).forEach(function (k) {
    out = out.split('{' + k + '}').join(String(vars[k]));
  });
  return out;
}

function escapeHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Anton's "latin" subset woff2 -- covers the full range German text needs
// (includes ä/ö/ü/ß). Fetched once from Google Fonts' own CSS and inlined
// here as a direct file URL so no external stylesheet request is needed,
// just the font file itself.
var FONT_FACE_CSS = '<style>@font-face{font-family:Anton;font-style:normal;font-weight:400;'
  + 'src:url(https://fonts.gstatic.com/s/anton/v27/1Ptgg87LROyAm3Kz-C8CSKlv.woff2) format("woff2");}</style>';

var HEAD_TOP = '<meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width,initial-scale=1">'
  + '<meta name="color-scheme" content="dark">'
  + '<meta name="supported-color-schemes" content="dark">'
  // Stops iOS/macOS Mail from auto-scaling text size, which otherwise can
  // make the headline (and the font swap above) look inconsistent between
  // devices.
  + '<meta name="x-apple-disable-message-reformatting">'
  + FONT_FACE_CSS;

var LOGO_HEIGHT = 40;

// Logo + headline overlaid on the hero photo itself (position:absolute),
// matching the approved design mockup, with a dark top/bottom scrim for
// legibility over whatever the photo looks like. This only works in
// clients that honor position:absolute on a table cell -- Apple Mail,
// Gmail (web + apps), Outlook.com and similar all do. The one holdout is
// Outlook desktop (Word's rendering engine), which just ignores the
// position and falls back to normal block flow: the scrim div collapses
// to nothing (no content, no set height) and the logo/headline simply
// stack below the photo instead -- worse than the overlay, but still a
// clean, readable email, not a broken one.
function headerBlock(logoUrl, heroUrl, line1, line2) {
  return '<tr><td style="position:relative;padding:0;">'
    + '<img src="' + heroUrl + '" width="680" height="295" alt="" style="display:block;width:100%;max-width:680px;height:auto;border:0;">'
    + '<div style="position:absolute;top:0;left:0;right:0;bottom:0;'
    + 'background:linear-gradient(180deg, rgba(15,14,17,0.72) 0%, rgba(15,14,17,0.05) 36%, rgba(15,14,17,0.05) 52%, rgba(15,14,17,0.88) 100%);">'
    + '</div>'
    + '<div style="position:absolute;top:0;left:0;right:0;padding:22px 32px;">'
    + '<img src="' + logoUrl + '" alt="Sören Bläcker" height="' + LOGO_HEIGHT + '" style="height:' + LOGO_HEIGHT + 'px;width:auto;border:0;display:block;margin-left:auto;margin-right:0;">'
    + '</div>'
    + '<div style="position:absolute;left:0;right:0;bottom:0;padding:0 32px 20px 32px;">'
    + '<div style="font-family:Anton,Arial,\'Helvetica Neue\',sans-serif;font-weight:400;text-transform:uppercase;letter-spacing:.01em;line-height:.98;font-size:30px;color:#ffffff;text-shadow:0 2px 12px rgba(0,0,0,0.5);">'
    + line1 + '<br>' + line2
    + '</div>'
    + '</div>'
    + '</td></tr>';
}

// The recap "glass tile": no backdrop-filter (real support for it in mail
// clients is essentially nonexistent, Apple Mail included) -- instead a
// static diagonal gradient + border + inset highlight, which reads as the
// same frosted panel without needing to actually blur anything. That's a
// fair trade here specifically: this panel only ever sits over one flat,
// known background color (the card body, #2b2a30), so a real blur would
// have nothing to do anyway. Height is never fixed -- it's a plain table
// cell that grows with however much text fieldRow() gives it.
function glassPanel(labelText, rows) {
  return '<tr><td style="padding:0 32px 26px 32px;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
    + '<tr><td style="padding:18px 20px;font-family:Helvetica,Arial,sans-serif;'
    + 'background:#3a393f;'
    // Warm/cool colour glow in opposite corners, layered under the same
    // diagonal white sheen as before -- glass in real light rarely reads
    // as pure neutral grey, it picks up faint colour at its edges. Both
    // glows are soft enough to stay a texture, not a colour block.
    + 'background:radial-gradient(120% 120% at 6% 0%, rgba(255,158,92,0.22) 0%, rgba(255,158,92,0) 42%),'
    + 'radial-gradient(120% 120% at 100% 100%, rgba(160,110,255,0.24) 0%, rgba(160,110,255,0) 46%),'
    + 'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 45%, rgba(255,255,255,0.02) 100%);'
    + 'border:1px solid rgba(255,255,255,0.26);border-radius:14px;'
    + 'box-shadow:0 10px 26px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.32),inset 0 -1px 0 rgba(0,0,0,0.22),inset 1px 0 0 rgba(255,255,255,0.14),inset -1px 0 0 rgba(0,0,0,0.14);">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">'
    + '<tr><td style="padding:0 0 12px 0;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#8fc5ea;font-weight:700;">' + labelText + '</td></tr>'
    + rows
    + '</table>'
    + '</td></tr>'
    + '</table>'
    + '</td></tr>';
}

function fieldRow(label, valueHtml, last) {
  return '<tr><td style="padding:0 0 ' + (last ? '0' : '12') + 'px 0;">'
    + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#a9a8ae;font-weight:600;margin:0 0 3px 0;font-family:Helvetica,Arial,sans-serif;">' + label + '</div>'
    + '<div style="color:#ffffff;font-size:14px;line-height:1.5;font-family:Helvetica,Arial,sans-serif;">' + valueHtml + '</div>'
    + '</td></tr>';
}

function footerBlock(t, year, impressumUrl, privacyUrl) {
  return '<tr><td style="padding:20px 32px 24px 32px;border-top:1px solid #3c3b41;font-family:Helvetica,Arial,sans-serif;">'
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
    + '<p style="margin:16px 0 0 0;font-size:11.5px;line-height:1.6;color:#66656b;">' + escapeHtml(fillTemplate(t.footerNoteTemplate, { jahr: year })) + '</p>'
    + '</td></tr>';
}

function shell(lang, titleText, bodyRows) {
  return '<!doctype html>'
    + '<html lang="' + lang + '">'
    + '<head>' + HEAD_TOP + '<title>' + titleText + '</title></head>'
    + '<body style="margin:0;padding:0;background:#1c1b1f;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1c1b1f;">'
    + '<tr><td align="center" style="padding:28px 16px;">'
    + '<table role="presentation" width="680" cellpadding="0" cellspacing="0" border="0" style="max-width:680px;width:100%;background:#2b2a30;">'
    + bodyRows
    + '</table>'
    + '</td></tr>'
    + '</table>'
    + '</body></html>';
}

// Every value below is also the fallback used if email/content.txt is
// missing that key (or missing entirely) -- see loadEmailContent() above.
var DEFAULTS = {
  confirmDe: {
    Betreffzeile: 'Deine Nachricht ist angekommen',
    HeaderZeile1: 'Nachricht', HeaderZeile2: 'angekommen.',
    Begruessung: 'Hallo {name},', BegruessungOhneName: 'Hallo,',
    Text1: 'vielen Dank für Deine Nachricht über soerenblaecker.com.',
    Text2: 'Das hier ist nur eine automatische Bestätigung, dass sie bei mir angekommen ist. Ich melde mich so schnell wie möglich persönlich bei Dir zurück, meist innerhalb von 1–2 Werktagen.',
    RecapUeberschrift: 'Das hast du geschickt',
    RecapBetreffLabel: 'Betreff', RecapNachrichtLabel: 'Nachricht',
    Verabschiedung: 'Bis bald,',
    EMailLabel: 'E-Mail', TelefonLabel: 'Telefon', StandortLabel: 'Standort', StandortWert: 'Deutschland',
    ImpressumLabel: 'Impressum', DatenschutzLabel: 'Datenschutz',
    Fussnote: '© {jahr} Sören Bläcker — Produktdesign. Diese E-Mail wurde automatisch als Antwort auf eine Anfrage über das Kontaktformular auf soerenblaecker.com versendet.',
  },
  confirmEn: {
    Betreffzeile: 'Your message has arrived',
    HeaderZeile1: 'Message', HeaderZeile2: 'received.',
    Begruessung: 'Hi {name},', BegruessungOhneName: 'Hi,',
    Text1: 'thanks for reaching out through soerenblaecker.com.',
    Text2: 'This is just an automatic confirmation that your message has arrived. I’ll get back to you personally as soon as I can, usually within 1–2 business days.',
    RecapUeberschrift: 'What you sent',
    RecapBetreffLabel: 'Subject', RecapNachrichtLabel: 'Message',
    Verabschiedung: 'Talk soon,',
    EMailLabel: 'Email', TelefonLabel: 'Phone', StandortLabel: 'Location', StandortWert: 'Germany',
    ImpressumLabel: 'Legal Notice', DatenschutzLabel: 'Privacy',
    Fussnote: '© {jahr} Sören Bläcker — Product Design. This email was sent automatically in response to a request submitted through the contact form on soerenblaecker.com.',
  },
  notify: {
    HeaderZeile1: 'Neue', HeaderZeile2: 'Anfrage.',
    Einleitung: 'jemand hat gerade über das Kontaktformular auf soerenblaecker.com geschrieben:',
    RecapUeberschrift: 'Anfrage',
    NameLabel: 'Name', EMailLabel: 'E-Mail', BetreffLabel: 'Betreff', NachrichtLabel: 'Nachricht',
    Hinweis: 'Antworten geht direkt auf diese Mail -- die Antwort-Adresse ist bereits auf die anfragende Person gesetzt.',
  },
};

var FILE_CONTENT = loadEmailContent();

function field(sectionKey, fieldKey) {
  var fromFile = FILE_CONTENT[sectionKey] && FILE_CONTENT[sectionKey][fieldKey];
  return fromFile != null ? fromFile : DEFAULTS[sectionKey][fieldKey];
}

function buildConfirmCopy(sectionKey) {
  return {
    subjectLine: field(sectionKey, 'Betreffzeile'),
    heroLine1: field(sectionKey, 'HeaderZeile1'), heroLine2: field(sectionKey, 'HeaderZeile2'),
    greetingTemplate: field(sectionKey, 'Begruessung'), greetingGeneric: field(sectionKey, 'BegruessungOhneName'),
    p1: field(sectionKey, 'Text1'), p2: field(sectionKey, 'Text2'),
    recapLabel: field(sectionKey, 'RecapUeberschrift'),
    recapSubject: field(sectionKey, 'RecapBetreffLabel'), recapMessage: field(sectionKey, 'RecapNachrichtLabel'),
    signoffLine: field(sectionKey, 'Verabschiedung'),
    email: field(sectionKey, 'EMailLabel'), phone: field(sectionKey, 'TelefonLabel'),
    location: field(sectionKey, 'StandortLabel'), locationValue: field(sectionKey, 'StandortWert'),
    legalImpressum: field(sectionKey, 'ImpressumLabel'), legalPrivacy: field(sectionKey, 'DatenschutzLabel'),
    footerNoteTemplate: field(sectionKey, 'Fussnote'),
  };
}

var COPY = { de: buildConfirmCopy('confirmDe'), en: buildConfirmCopy('confirmEn') };

var NOTIFY_COPY = {
  heroLine1: field('notify', 'HeaderZeile1'), heroLine2: field('notify', 'HeaderZeile2'),
  intro: field('notify', 'Einleitung'),
  recapLabel: field('notify', 'RecapUeberschrift'),
  name: field('notify', 'NameLabel'), email: field('notify', 'EMailLabel'),
  subject: field('notify', 'BetreffLabel'), message: field('notify', 'NachrichtLabel'),
  hint: field('notify', 'Hinweis'),
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
  var logoUrl = SITE_BASE_URL + '/logo-white.png';
  var heroUrl = SITE_BASE_URL + '/api/email-hero';
  var impressumUrl = SITE_BASE_URL + '/impressum/';
  var privacyUrl = SITE_BASE_URL + '/datenschutz/';

  var greetingHtml = isStatic ? t.greetingGeneric : fillTemplate(t.greetingTemplate, { name: name });

  var recapRows = (subject ? fieldRow(t.recapSubject, subject, false) : '')
    + fieldRow(t.recapMessage, message, true);
  var recapSection = isStatic ? '' : glassPanel(t.recapLabel, recapRows);

  var bodyRows = headerBlock(logoUrl, heroUrl, t.heroLine1, t.heroLine2)
    + '<tr><td style="padding:18px 32px 0 32px;font-family:Helvetica,Arial,sans-serif;">'
    + '<p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#ffffff;">' + greetingHtml + '</p>'
    + '<p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#ffffff;">' + escapeHtml(t.p1) + '</p>'
    + '<p style="margin:0 0 20px 0;font-size:15px;line-height:1.65;color:#ffffff;">' + escapeHtml(t.p2) + '</p>'
    + '</td></tr>'
    + recapSection
    + '<tr><td style="padding:0 32px 30px 32px;font-family:Helvetica,Arial,sans-serif;">'
    + '<p style="margin:0 0 4px 0;font-size:15px;color:#ffffff;">' + t.signoffLine + '</p>'
    + '<p style="margin:0;font-size:15px;color:#ffffff;font-weight:700;">Sören Bläcker</p>'
    + '</td></tr>'
    + footerBlock(t, year, impressumUrl, privacyUrl);

  var html = shell(lang, t.subjectLine, bodyRows);

  var textLines = [
    isStatic ? t.greetingGeneric : fillTemplate(t.greetingTemplate, { name: opts.name || (lang === 'en' ? 'there' : 'zusammen') }),
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

// Notification mail to Sören himself, same visual shell as the visitor's
// confirmation mail (hero photo, logo, Anton headline, glass recap panel)
// but with the actual enquiry data instead of a thank-you message. German
// only -- this one's for Sören, not the visitor, so no lang switching.
function renderNotificationEmail(opts) {
  opts = opts || {};
  var name = escapeHtml(opts.name || '');
  var email = escapeHtml(opts.email || '');
  var subject = opts.subject ? escapeHtml(opts.subject) : '';
  var message = escapeHtml(opts.message || '').replace(/\r\n|\r|\n/g, '<br>');
  var year = new Date().getFullYear();
  var logoUrl = SITE_BASE_URL + '/logo-white.png';
  var heroUrl = SITE_BASE_URL + '/api/email-hero';
  var impressumUrl = SITE_BASE_URL + '/impressum/';
  var privacyUrl = SITE_BASE_URL + '/datenschutz/';
  var t = COPY.de;
  var titleText = 'Neue Anfrage über das Kontaktformular';

  var recapRows = fieldRow(NOTIFY_COPY.name, name, false)
    + fieldRow(NOTIFY_COPY.email, email, false)
    + (subject ? fieldRow(NOTIFY_COPY.subject, subject, false) : '')
    + fieldRow(NOTIFY_COPY.message, message, true);

  var bodyRows = headerBlock(logoUrl, heroUrl, NOTIFY_COPY.heroLine1, NOTIFY_COPY.heroLine2)
    + '<tr><td style="padding:18px 32px 0 32px;font-family:Helvetica,Arial,sans-serif;">'
    + '<p style="margin:0 0 20px 0;font-size:15px;line-height:1.65;color:#ffffff;">' + escapeHtml(NOTIFY_COPY.intro) + '</p>'
    + '</td></tr>'
    + glassPanel(NOTIFY_COPY.recapLabel, recapRows)
    + '<tr><td style="padding:0 32px 30px 32px;font-family:Helvetica,Arial,sans-serif;">'
    + '<p style="margin:0;font-size:12.5px;line-height:1.6;color:#a9a8ae;">' + escapeHtml(NOTIFY_COPY.hint) + '</p>'
    + '</td></tr>'
    + footerBlock(t, year, impressumUrl, privacyUrl);

  var html = shell('de', titleText, bodyRows);

  var textLines = [
    NOTIFY_COPY.intro,
    '',
    NOTIFY_COPY.name + ': ' + (opts.name || ''),
    NOTIFY_COPY.email + ': ' + (opts.email || ''),
  ];
  if (opts.subject) textLines.push(NOTIFY_COPY.subject + ': ' + opts.subject);
  textLines.push(NOTIFY_COPY.message + ': ' + (opts.message || ''));
  textLines.push('', NOTIFY_COPY.hint);
  var text = textLines.join('\n');

  return { subject: titleText, html: html, text: text };
}

module.exports = {
  renderConfirmationEmail: renderConfirmationEmail,
  renderNotificationEmail: renderNotificationEmail,
  SITE_BASE_URL: SITE_BASE_URL,
};
