#!/usr/bin/env node
/*
 * Sibling to update-project-content.js, for the site's six bespoke,
 * one-off pages (About, Kontakt, Startseite-Hero, Service, Impressum,
 * Datenschutz) rather than the 27 near-identical project pages.
 *
 * Those project pages are fully regenerated from one canonical template
 * on every run because there are many of them and they're structurally
 * identical -- full regen guarantees they never drift apart. These six
 * pages are each unique and some (Impressum, Datenschutz) carry legal
 * text where a subtly-wrong hand-written template would be a real risk.
 * So instead this script does targeted in-place patches: for each field
 * in a page's content.txt, it finds a small piece of surrounding HTML
 * that's guaranteed unique and never itself edited (a class name, a
 * fixed heading, a link href) and replaces only the text sitting between
 * two fixed markers. Everything else in the file -- layout, scripts,
 * nav, structural markup -- is left completely untouched. If a page's
 * structure ever changes enough that an anchor no longer matches exactly
 * once, the affected patch throws instead of silently doing the wrong
 * thing.
 *
 * Each page's content.txt sits next to its own index.html (services/,
 * impressum/, datenschutz/ each have their own folder already); about.html,
 * contact.html and index.html live directly at the repo root, so their
 * content.txt files use distinct names there (about-content.txt etc.)
 * to avoid colliding with a project's plain "content.txt".
 *
 * Usage: node scripts/update-page-content.js
 * Always processes all six pages (whichever content.txt files exist),
 * same self-healing approach as update-project-content.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function bilingualSpan(de, en) {
  return `<span data-lang="de">${escapeHtml(de)}</span><span data-lang="en">${escapeHtml(en)}</span>`;
}

function parseFlatBlock(rawLines, knownKeys, listKeys) {
  const KEY_RE = new RegExp(`^(${knownKeys.join('|')}):\\s*(.*)$`);
  const fields = {};
  let currentKey = null;
  let buf = [];
  let listItems = null;
  function flush() {
    if (currentKey && listKeys.includes(currentKey)) {
      fields[currentKey] = listItems || [];
    } else if (currentKey) {
      fields[currentKey] = buf.map((l) => l.trim()).filter(Boolean).join(' ');
    }
    buf = [];
  }
  for (const raw of rawLines) {
    const line = raw.replace(/\r$/, '');
    const m = line.match(KEY_RE);
    if (m) {
      flush();
      currentKey = m[1];
      listItems = listKeys.includes(currentKey) ? [] : null;
      if (m[2]) buf.push(m[2]);
      continue;
    }
    if (currentKey && listKeys.includes(currentKey)) {
      const bm = line.match(/^\s*-\s*(.+)$/);
      if (bm) listItems.push(bm[1].trim());
      continue;
    }
    if (!line.trim()) continue;
    if (currentKey) buf.push(line);
  }
  flush();
  return fields;
}

function parseTwoLangContentTxt(text, knownKeys, listKeys) {
  listKeys = listKeys || [];
  const lines = text.split('\n');
  const deIdx = lines.findIndex((l) => l.trim() === '--- DEUTSCH ---');
  const enIdx = lines.findIndex((l) => l.trim() === '--- ENGLISH ---');
  if (deIdx === -1 || enIdx === -1 || enIdx < deIdx) {
    throw new Error('Datei muss "--- DEUTSCH ---" und "--- ENGLISH ---" enthalten (in dieser Reihenfolge).');
  }
  return {
    de: parseFlatBlock(lines.slice(deIdx + 1, enIdx), knownKeys, listKeys),
    en: parseFlatBlock(lines.slice(enIdx + 1), knownKeys, listKeys),
  };
}

// Replaces the two <span data-lang="de">...</span><span data-lang="en">...</span>
// tags sitting between two fixed pieces of surrounding markup. `before`/`after`
// are matched literally so they only need to be unique together with the
// span pattern between them, never dependent on the current (editable) text.
function patchBilingual(html, before, after, deVal, enVal, label) {
  const re = new RegExp(
    escapeRegex(before) + '<span data-lang="de">[\\s\\S]*?<\\/span>\\s*<span data-lang="en">[\\s\\S]*?<\\/span>' + escapeRegex(after)
  );
  const count = (html.match(new RegExp(re.source, 'g')) || []).length;
  if (count !== 1) throw new Error(`"${label}" nicht eindeutig im Template gefunden (${count} Treffer statt 1) -- Seitenstruktur hat sich vermutlich geaendert, bitte pruefen.`);
  return html.replace(re, before + bilingualSpan(deVal, enVal) + after);
}

// Same idea but for a single (non-bilingual) value, e.g. an email address.
function patchPlain(html, before, after, val, label) {
  const re = new RegExp(escapeRegex(before) + '[\\s\\S]*?' + escapeRegex(after));
  const count = (html.match(new RegExp(re.source, 'g')) || []).length;
  if (count !== 1) throw new Error(`"${label}" nicht eindeutig gefunden (${count} Treffer statt 1) -- Seitenstruktur hat sich vermutlich geaendert, bitte pruefen.`);
  return html.replace(re, before + escapeHtml(val) + after);
}

// For a repeatable block (e.g. timeline rows): finds the region between a
// unique heading literal and a unique container-close literal, non-greedily,
// and replaces everything between the container's opening tag and its
// closing tag with freshly rendered rows -- works no matter how many rows
// content.txt asks for, not just however many are currently on the page.
function patchContainer(html, headingLiteral, containerOpen, containerClose, newInnerHtml, label) {
  const re = new RegExp(
    escapeRegex(headingLiteral) + '([\\s\\S]*?)' + escapeRegex(containerOpen) + '[\\s\\S]*?' + escapeRegex(containerClose)
  );
  const count = (html.match(new RegExp(re.source, 'g')) || []).length;
  if (count !== 1) throw new Error(`"${label}" nicht eindeutig gefunden (${count} Treffer statt 1) -- Seitenstruktur hat sich vermutlich geaendert, bitte pruefen.`);
  return html.replace(re, (m, between) => headingLiteral + between + containerOpen + newInnerHtml + containerClose);
}

function requireSame(data, key, pageLabel) {
  if (data.de[key] !== data.en[key]) {
    throw new Error(`${pageLabel}: "${key}" ist nicht sprachabhaengig auf dieser Seite -- DE- und EN-Wert muessen identisch sein.`);
  }
  return data.de[key];
}

// ---------------------------------------------------------------- About --

const ABOUT_KEYS = ['Titel', 'BioAbsatz1', 'BioAbsatz2', 'Zeitstrahl', 'AwardsText', 'ZitatIntro', 'ZitatText', 'ZitatLink', 'AwardsListe'];
const ABOUT_LIST_KEYS = ['Zeitstrahl', 'AwardsListe'];

function splitYear(line, label) {
  const idx = line.indexOf('|');
  if (idx === -1) throw new Error(`"${label}"-Eintrag "${line}" hat kein "|" -- Format ist "Jahr | Text".`);
  return { jahr: line.slice(0, idx).trim(), text: line.slice(idx + 1).trim() };
}

function renderTimelineRows(entries) {
  return entries.map(({ jahr, de, en }) =>
    `          <div class="timeline__row">\n            <time>${jahr}</time>\n            ${bilingualSpan(de, en)}\n          </div>\n`
  ).join('');
}

// AwardsListe entries take an optional third "| Link" field -- unlike
// Zeitstrahl (never linked), an award can point at its source. Splitting on
// every "|" (not just the first) lets the link itself be optional per
// entry without a separate keyword or format.
function splitAwardEntry(line, label) {
  const parts = line.split('|').map((s) => s.trim());
  if (parts.length < 2) throw new Error(`"${label}"-Eintrag "${line}" hat kein "|" -- Format ist "Jahr | Text" oder "Jahr | Text | Link".`);
  return { jahr: parts[0], text: parts[1], url: parts[2] || null };
}

const AWARD_ARROWS_HTML = '<span class="award-arrows" aria-hidden="true"><span></span><span></span><span></span></span>';

// Same row shape as renderTimelineRows, plus: any entry carrying a url gets
// wrapped in a link (display:contents so it stays invisible to the grid
// layout -- see about.html) and the three pulsing arrow chevrons appended
// right after the text, in both languages. An entry without a url renders
// exactly like a plain Zeitstrahl row -- add a link later and both the
// wrapper and the arrows show up automatically, nothing else to touch.
function renderAwardsRows(entries) {
  return entries.map(({ jahr, de, en, url }) => {
    if (!url) {
      return `          <div class="timeline__row">\n            <time>${jahr}</time>\n            ${bilingualSpan(de, en)}\n          </div>\n`;
    }
    const href = escapeHtml(url);
    return `          <div class="timeline__row">\n`
      + `            <a href="${href}" target="_blank" rel="noopener" style="display:contents;color:inherit;text-decoration:none;">\n`
      + `              <time>${jahr}</time>\n`
      + `              <span data-lang="de">${escapeHtml(de)}${AWARD_ARROWS_HTML}</span><span data-lang="en">${escapeHtml(en)}${AWARD_ARROWS_HTML}</span>\n`
      + `            </a>\n          </div>\n`;
  }).join('');
}

// The Awards panel's left column is more than one plain paragraph (unlike
// every other AwardsText-style field): an intro line, then an optional
// press-quote block (its own intro sentence + an italic pull-quote,
// link-wrapped straight to the source) once there's an actual quote to
// show. zitatText empty skips the quote block entirely rather than
// rendering an empty one.
function renderAwardsIntro(awardsText, zitatIntro, zitatText, zitatLink) {
  let html = `<p>\n            ${bilingualSpan(awardsText.de, awardsText.en)}\n          </p>`;
  if (zitatText.de || zitatText.en) {
    html += `\n          <p style="margin-top:28px;">\n            ${bilingualSpan(zitatIntro.de, zitatIntro.en)}\n          </p>`;
    const href = escapeHtml(zitatLink);
    html += `\n          <a href="${href}" target="_blank" rel="noopener" style="display:block;color:inherit;text-decoration:none;border-left:2px solid var(--color-accent);padding-left:18px;margin-top:12px;">\n`
      + `            <p style="font-style:italic;">\n              ${bilingualSpan(zitatText.de, zitatText.en)}\n            </p>\n          </a>`;
  }
  return html;
}

function updateAbout(html, data) {
  // The About panel's title is content.txt-driven (unlike Awards' own
  // title just below, still fixed), so unlike every other field here it
  // can't be anchored on its own *previous* fixed literal text -- anchored
  // on its photo path instead (data-photo="about/about", never itself
  // edited), which stays a valid anchor no matter what the title says.
  html = patchBilingual(html,
    '<img data-photo="about/about" alt="">\n      <div class="stack__scrim"></div>\n    </div>\n    <div class="stack__content wrap">\n      <h1 class="stack__title hover-letters">',
    '</h1>\n      <div class="about-grid stack__body">\n        <div>\n          <p>\n            ',
    data.de.Titel, data.en.Titel, 'Titel (About)');

  // Now that the title itself has just been written, BioAbsatz1 can anchor
  // on it the same way Awards' own fields anchor on its (still-fixed)
  // English title further below.
  const titelEnHtml = escapeHtml(data.en.Titel);
  const titelDeHtml = escapeHtml(data.de.Titel);
  html = patchBilingual(html,
    titelEnHtml + '</span></h1>\n      <div class="about-grid stack__body">\n        <div>\n          <p>\n            ',
    '\n          </p>', data.de.BioAbsatz1, data.en.BioAbsatz1, 'BioAbsatz1');
  html = patchBilingual(html,
    '</p>\n          <p>\n            ',
    '\n          </p>', data.de.BioAbsatz2, data.en.BioAbsatz2, 'BioAbsatz2');

  const deYears = data.de.Zeitstrahl.map((l) => splitYear(l, 'Zeitstrahl (DE)'));
  const enYears = data.en.Zeitstrahl.map((l) => splitYear(l, 'Zeitstrahl (EN)'));
  if (deYears.length !== enYears.length) throw new Error('Zeitstrahl: DE und EN haben unterschiedlich viele Eintraege.');
  html = patchContainer(html,
    '<h1 class="stack__title hover-letters"><span data-lang="de">' + titelDeHtml + '</span><span data-lang="en">' + titelEnHtml + '</span></h1>',
    '<div class="timeline">\n', '\n        </div>',
    renderTimelineRows(deYears.map((d, i) => ({ jahr: d.jahr, de: d.text, en: enYears[i].text }))),
    'Zeitstrahl (About)');

  const zitatLink = requireSame(data, 'ZitatLink', 'Awards');
  html = patchContainer(html,
    'Awards</span></h1>',
    '<div class="about-grid stack__body">\n        <div>\n          ', '\n        </div>\n        <div class="timeline">',
    renderAwardsIntro(
      { de: data.de.AwardsText, en: data.en.AwardsText },
      { de: data.de.ZitatIntro, en: data.en.ZitatIntro },
      { de: data.de.ZitatText, en: data.en.ZitatText },
      zitatLink
    ),
    'AwardsText/Zitat');

  const deAwards = data.de.AwardsListe.map((l) => splitAwardEntry(l, 'AwardsListe (DE)'));
  const enAwards = data.en.AwardsListe.map((l) => splitAwardEntry(l, 'AwardsListe (EN)'));
  if (deAwards.length !== enAwards.length) throw new Error('AwardsListe: DE und EN haben unterschiedlich viele Eintraege.');
  deAwards.forEach((d, i) => {
    if ((d.url || '') !== (enAwards[i].url || '')) {
      throw new Error(`AwardsListe: Eintrag ${i + 1} hat unterschiedliche Links in DE ("${d.url || ''}") und EN ("${enAwards[i].url || ''}").`);
    }
  });
  html = patchContainer(html,
    'Awards</span></h1>',
    '<div class="timeline">\n', '\n        </div>',
    renderAwardsRows(deAwards.map((d, i) => ({ jahr: d.jahr, de: d.text, en: enAwards[i].text, url: d.url }))),
    'AwardsListe');

  return html;
}

// -------------------------------------------------------------- Kontakt --

const CONTACT_KEYS = ['Titel', 'Untertitel', 'EMail', 'Telefon', 'Standort'];

function updateContact(html, data) {
  html = patchBilingual(html, '<h1 class="page-hero__title hover-letters">\n      ', '\n    </h1>', data.de.Titel, data.en.Titel, 'Titel');
  html = patchBilingual(html, '<p class="lede">\n      ', '\n    </p>', data.de.Untertitel, data.en.Untertitel, 'Untertitel');
  html = patchPlain(html, '<li><span data-lang="de">E-Mail</span><span data-lang="en">Email</span> <span>', '</span></li>',
    requireSame(data, 'EMail', 'Kontakt'), 'EMail');
  html = patchPlain(html, '<li>Telefon <span>', '</span></li>',
    requireSame(data, 'Telefon', 'Kontakt'), 'Telefon');
  html = patchBilingual(html, '<li><span data-lang="de">Standort</span><span data-lang="en">Location</span> ', '</li>',
    data.de.Standort, data.en.Standort, 'Standort');
  return html;
}

// ---------------------------------------------------------- Startseite --

const HOME_KEYS = ['Eyebrow', 'Titel', 'Text'];

function updateHome(html, data) {
  html = patchBilingual(html, '<span class="eyebrow">\n      ', '\n    </span>', data.de.Eyebrow, data.en.Eyebrow, 'Eyebrow');
  html = patchBilingual(html, '<h1 class="display">\n      ', '\n    </h1>', data.de.Titel, data.en.Titel, 'Titel');
  html = patchBilingual(html, '</h1>\n    <p>\n      ', '\n    </p>', data.de.Text, data.en.Text, 'Text');
  return html;
}

// ------------------------------------------------------------- Service --

const SERVICES_KEYS = ['Titel', 'Untertitel', 'Abschnitt1Titel', 'Abschnitt1Text', 'Abschnitt2Titel', 'Abschnitt2Text', 'Abschnitt3Titel', 'Abschnitt3Text'];

// The three editorial-row blocks are structurally identical, so a plain
// "unique surrounding markup" anchor doesn't work for rows 2/3 -- instead
// anchor on the previous row's own link href, which is fixed (points at a
// category page) and never edited by this script.
function patchServiceRow(html, precedingHrefAnchor, deTitle, enTitle, deText, enText, label) {
  const re = new RegExp(
    escapeRegex(precedingHrefAnchor) +
    '([\\s\\S]*?)' +
    '<div class="editorial-row">\\s*<h3><span data-lang="de">[\\s\\S]*?<\\/span><span data-lang="en">[\\s\\S]*?<\\/span><\\/h3>\\s*<p>\\s*<span data-lang="de">[\\s\\S]*?<\\/span>\\s*<span data-lang="en">[\\s\\S]*?<\\/span>\\s*<\\/p>'
  );
  const count = (html.match(new RegExp(re.source, 'g')) || []).length;
  if (count !== 1) throw new Error(`"${label}" nicht eindeutig gefunden (${count} Treffer statt 1) -- Seitenstruktur hat sich vermutlich geaendert, bitte pruefen.`);
  return html.replace(re, (m, bridge) =>
    precedingHrefAnchor + bridge +
    `<div class="editorial-row">\n      <h3>${bilingualSpan(deTitle, enTitle)}</h3>\n      <p>\n        ${bilingualSpan(deText, enText)}\n      </p>`
  );
}

function updateServices(html, data) {
  html = patchBilingual(html, '<h1 class="page-hero__title hover-letters page-hero__title--tight">\n      ', '\n    </h1>', data.de.Titel, data.en.Titel, 'Titel');
  html = patchBilingual(html, '<p class="lede">\n      ', '\n    </p>', data.de.Untertitel, data.en.Untertitel, 'Untertitel');
  html = patchServiceRow(html, '<p class="lede">',
    data.de.Abschnitt1Titel, data.en.Abschnitt1Titel, data.de.Abschnitt1Text, data.en.Abschnitt1Text, 'Abschnitt1');
  html = patchServiceRow(html, 'href="../kategorien/mobility/">',
    data.de.Abschnitt2Titel, data.en.Abschnitt2Titel, data.de.Abschnitt2Text, data.en.Abschnitt2Text, 'Abschnitt2');
  html = patchServiceRow(html, 'href="../kategorien/furniture-lighting/">',
    data.de.Abschnitt3Titel, data.en.Abschnitt3Titel, data.de.Abschnitt3Text, data.en.Abschnitt3Text, 'Abschnitt3');
  return html;
}

// ----------------------------------------------------------- Impressum --

const IMPRESSUM_KEYS = [
  'Name', 'Anschrift', 'Telefon', 'EMail', 'Website',
  'Berufsbezeichnung', 'Umsatzsteuer', 'Verbraucherstreitbeilegung',
  'HaftungInhalte', 'HaftungLinks', 'Urheberrecht',
];

function updateImpressum(html, data) {
  const name = requireSame(data, 'Name', 'Impressum');
  const anschrift = requireSame(data, 'Anschrift', 'Impressum');
  const telefon = requireSame(data, 'Telefon', 'Impressum');
  const email = requireSame(data, 'EMail', 'Impressum');
  const website = requireSame(data, 'Website', 'Impressum');

  html = patchPlain(html, '<li><span data-lang="de">Name</span><span data-lang="en">Name</span> <span>', '</span></li>', name, 'Name');
  html = patchPlain(html, '<li><span data-lang="de">Anschrift</span><span data-lang="en">Address</span> <span>', '</span></li>', anschrift, 'Anschrift');
  html = patchPlain(html, '<li><span data-lang="de">Telefon</span><span data-lang="en">Phone</span> <span>', '</span></li>', telefon, 'Telefon');
  html = patchPlain(html, '<li><span data-lang="de">E-Mail</span><span data-lang="en">Email</span> <span>', '</span></li>', email, 'EMail');
  html = patchPlain(html, '<li><span data-lang="de">Website</span><span data-lang="en">Website</span> <span>', '</span></li>', website, 'Website');

  html = patchBilingual(html,
    '<h2><span data-lang="de">Berufsbezeichnung und berufsrechtliche Regelungen</span><span data-lang="en">Professional title and regulations</span></h2>\n    <p>\n      ',
    '\n    </p>', data.de.Berufsbezeichnung, data.en.Berufsbezeichnung, 'Berufsbezeichnung');
  html = patchBilingual(html,
    '<h2><span data-lang="de">Umsatzsteuer</span><span data-lang="en">VAT</span></h2>\n    <p>\n      ',
    '\n    </p>', data.de.Umsatzsteuer, data.en.Umsatzsteuer, 'Umsatzsteuer');

  // "Verantwortlich fuer den Inhalt" reuses Name/Anschrift rather than its
  // own fields -- same legal name and address, not separate content, so
  // there's one source of truth if the address ever changes.
  {
    const re = /(<h2><span data-lang="de">Verantwortlich für den Inhalt gemäß § 18 Abs\. 2 MStV<\/span><span data-lang="en">Responsible for content pursuant to § 18 \(2\) MStV<\/span><\/h2>\n {4}<p>\n {6})[\s\S]*?(\n {4}<\/p>)/;
    const count = (html.match(new RegExp(re.source, 'g')) || []).length;
    if (count !== 1) throw new Error(`"VerantwortlichInhalt" nicht eindeutig gefunden (${count} Treffer statt 1).`);
    html = html.replace(re, (m, pre, post) => `${pre}${escapeHtml(name)}<br>\n      ${escapeHtml(anschrift)}${post}`);
  }

  html = patchBilingual(html,
    '<h2><span data-lang="de">Verbraucherstreitbeilegung</span><span data-lang="en">Consumer dispute resolution</span></h2>\n    <p>\n      ',
    '\n    </p>', data.de.Verbraucherstreitbeilegung, data.en.Verbraucherstreitbeilegung, 'Verbraucherstreitbeilegung');
  html = patchBilingual(html,
    '<h2><span data-lang="de">Haftung für Inhalte</span><span data-lang="en">Liability for content</span></h2>\n    <p>\n      ',
    '\n    </p>', data.de.HaftungInhalte, data.en.HaftungInhalte, 'HaftungInhalte');
  html = patchBilingual(html,
    '<h2><span data-lang="de">Haftung für Links</span><span data-lang="en">Liability for links</span></h2>\n    <p>\n      ',
    '\n    </p>', data.de.HaftungLinks, data.en.HaftungLinks, 'HaftungLinks');
  html = patchBilingual(html,
    '<h2><span data-lang="de">Urheberrecht</span><span data-lang="en">Copyright</span></h2>\n    <p>\n      ',
    '\n    </p>', data.de.Urheberrecht, data.en.Urheberrecht, 'Urheberrecht');

  return html;
}

// ---------------------------------------------------------- Datenschutz --

const DATENSCHUTZ_KEYS = [
  'VerantwortlicherText', 'Name', 'Anschrift', 'EMail',
  'Uebersicht', 'Hosting', 'ServerLogfiles', 'Schriftarten', 'Sprache',
  'Kontaktformular', 'Empfaenger', 'Speicherdauer', 'RechteIntro',
  'RechteAusuebung', 'Aenderung',
];

function updateDatenschutz(html, data) {
  const name = requireSame(data, 'Name', 'Datenschutz');
  const anschrift = requireSame(data, 'Anschrift', 'Datenschutz');
  const email = requireSame(data, 'EMail', 'Datenschutz');

  // Section 1 mixes a bilingual intro sentence with a fixed (untranslated)
  // name/address/email block -- one custom regex, nothing else has this shape.
  {
    const re = /(<h2><span data-lang="de">1\. Verantwortlicher<\/span><span data-lang="en">1\. Data controller<\/span><\/h2>\n {4}<p>\n {6})[\s\S]*?(\n {4}<\/p>)/;
    const count = (html.match(new RegExp(re.source, 'g')) || []).length;
    if (count !== 1) throw new Error(`"Verantwortlicher" nicht eindeutig gefunden (${count} Treffer statt 1).`);
    html = html.replace(re, (m, pre, post) =>
      `${pre}${bilingualSpan(data.de.VerantwortlicherText, data.en.VerantwortlicherText)}<br><br>\n      ${escapeHtml(name)}<br>\n      ${escapeHtml(anschrift)}<br>\n      ${escapeHtml(email)}${post}`
    );
  }

  html = patchBilingual(html,
    '<h2><span data-lang="de">2. Übersicht der Verarbeitungen</span><span data-lang="en">2. Overview of processing activities</span></h2>\n    <p>\n      ',
    '\n    </p>', data.de.Uebersicht, data.en.Uebersicht, 'Uebersicht');
  html = patchBilingual(html,
    '<h2><span data-lang="de">3. Hosting</span><span data-lang="en">3. Hosting</span></h2>\n    <p>\n      ',
    '\n    </p>', data.de.Hosting, data.en.Hosting, 'Hosting');
  html = patchBilingual(html,
    '<h2><span data-lang="de">4. Server-Logfiles</span><span data-lang="en">4. Server log files</span></h2>\n    <p>\n      ',
    '\n    </p>', data.de.ServerLogfiles, data.en.ServerLogfiles, 'ServerLogfiles');
  html = patchBilingual(html,
    '<h2><span data-lang="de">5. Schriftarten</span><span data-lang="en">5. Fonts</span></h2>\n    <p>\n      ',
    '\n    </p>', data.de.Schriftarten, data.en.Schriftarten, 'Schriftarten');
  html = patchBilingual(html,
    '<h2><span data-lang="de">6. Lokale Spracheinstellung</span><span data-lang="en">6. Local language preference</span></h2>\n    <p>\n      ',
    '\n    </p>', data.de.Sprache, data.en.Sprache, 'Sprache');
  html = patchBilingual(html,
    '<h2><span data-lang="de">7. Kontaktformular</span><span data-lang="en">7. Contact form</span></h2>\n    <p>\n      ',
    '\n    </p>', data.de.Kontaktformular, data.en.Kontaktformular, 'Kontaktformular');
  html = patchBilingual(html,
    '<h2><span data-lang="de">8. Empfänger und Drittlandübermittlung</span><span data-lang="en">8. Recipients and third-country transfers</span></h2>\n    <p>\n      ',
    '\n    </p>', data.de.Empfaenger, data.en.Empfaenger, 'Empfaenger');
  html = patchBilingual(html,
    '<h2><span data-lang="de">9. Speicherdauer</span><span data-lang="en">9. Storage duration</span></h2>\n    <p>\n      ',
    '\n    </p>', data.de.Speicherdauer, data.en.Speicherdauer, 'Speicherdauer');
  html = patchBilingual(html,
    '<h2><span data-lang="de">10. Deine Rechte</span><span data-lang="en">10. Your rights</span></h2>\n    <p>\n      ',
    '\n    </p>', data.de.RechteIntro, data.en.RechteIntro, 'RechteIntro');
  // The Art. 15-21 GDPR rights list between RechteIntro and RechteAusuebung
  // is left untouched -- a fixed set of statutory categories, not routine
  // content.
  html = patchBilingual(html, '<p style="margin-top:16px;">\n      ', '\n    </p>',
    data.de.RechteAusuebung, data.en.RechteAusuebung, 'RechteAusuebung');
  html = patchBilingual(html,
    '<h2><span data-lang="de">11. Änderung dieser Datenschutzerklärung</span><span data-lang="en">11. Changes to this privacy policy</span></h2>\n    <p>\n      ',
    '\n    </p>', data.de.Aenderung, data.en.Aenderung, 'Aenderung');

  return html;
}

// -------------------------------------------------------------- Runner --

const PAGES = [
  { contentFile: 'about-content.txt', htmlFile: 'about.html', keys: ABOUT_KEYS, listKeys: ABOUT_LIST_KEYS, update: updateAbout },
  { contentFile: 'contact-content.txt', htmlFile: 'contact.html', keys: CONTACT_KEYS, listKeys: [], update: updateContact },
  { contentFile: 'home-content.txt', htmlFile: 'index.html', keys: HOME_KEYS, listKeys: [], update: updateHome },
  { contentFile: 'services/content.txt', htmlFile: 'services/index.html', keys: SERVICES_KEYS, listKeys: [], update: updateServices },
  { contentFile: 'impressum/content.txt', htmlFile: 'impressum/index.html', keys: IMPRESSUM_KEYS, listKeys: [], update: updateImpressum },
  { contentFile: 'datenschutz/content.txt', htmlFile: 'datenschutz/index.html', keys: DATENSCHUTZ_KEYS, listKeys: [], update: updateDatenschutz },
];

function main() {
  let anyError = false;
  for (const page of PAGES) {
    const contentPath = path.join(REPO_ROOT, page.contentFile);
    const htmlPath = path.join(REPO_ROOT, page.htmlFile);
    if (!fs.existsSync(contentPath)) continue; // nothing to do for this page yet
    try {
      const text = fs.readFileSync(contentPath, 'utf8');
      const data = parseTwoLangContentTxt(text, page.keys, page.listKeys);
      const html = fs.readFileSync(htmlPath, 'utf8');
      const out = page.update(html, data);
      fs.writeFileSync(htmlPath, out);
      console.log(`OK: ${page.contentFile} -> ${page.htmlFile}`);
    } catch (err) {
      anyError = true;
      console.error(`FEHLER bei ${page.contentFile}: ${err.message}`);
    }
  }
  if (anyError) process.exit(1);
}

if (require.main === module) main();

module.exports = { parseTwoLangContentTxt, updateAbout, updateContact, updateHome, updateServices, updateImpressum, updateDatenschutz, PAGES };
