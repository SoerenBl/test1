#!/usr/bin/env node
/*
 * Reads a project's content.txt (DE + EN, hand-edited) and regenerates
 * that project's entire index.html from one canonical template --
 * whether the page already exists (an edit) or doesn't yet (a brand
 * new project folder). Same code path either way, deliberately: a
 * new project is not a special case, it's just an edit where the
 * "before" state happens to be empty. This also means every project
 * page stays byte-for-byte structurally identical to every other one
 * (nav, menu panel, footer, script includes) -- there's nothing to
 * drift out of sync one page at a time the way hand-patching spans in
 * an existing file could.
 *
 * Photos need nothing from this script at all: main.js already
 * auto-discovers a project's hero photo (data-photo="1") and the rest
 * of its gallery (the empty .tile-grid--projects[data-fixed-layout]
 * div, filled by probing the folder for 2.jpg, 3.jpg, ... up to
 * MAX_GALLERY_PHOTOS) purely from what files exist in the folder --
 * this template just needs to include those same two hooks, which it
 * does unconditionally.
 *
 * Category-page listings and homepage project counts also need
 * nothing from here -- discoverCategoryProjects() in main.js already
 * finds every folder matching slug-CC-YYYY under a category at
 * runtime, live, no registration step. Dropping a new project.txt
 * (with a matching folder) is genuinely the only thing a new project
 * needs beyond its photos.
 *
 * Usage: node scripts/update-project-content.js <path/to/content.txt> [...more]
 * Each content.txt must sit directly in its project's own folder,
 * next to where its index.html lives (or will be created), e.g.
 * mobility/bmw-k100-aero-de-2024/content.txt.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

const CATEGORY_LABELS = {
  mobility: 'Mobility & Automotive',
  'furniture-lighting': 'Möbel & Beleuchtung',
  'product-design': 'Produktdesign',
  'craft-restoration': 'Handwerk & Restaurierung',
  'interior-design': 'Interieur',
  editorial: 'Editorial Design',
};
// English versions, matching the homepage's own category tiles
// (index.html) -- kept as a separate map rather than deriving one from
// the other since a couple of these aren't literal translations
// (e.g. "Interieur" -> "Interior", not "Interior Design").
const CATEGORY_LABELS_EN = {
  mobility: 'Mobility & Automotive',
  'furniture-lighting': 'Furniture & Lighting',
  'product-design': 'Product Design',
  'craft-restoration': 'Craft & Restoration',
  'interior-design': 'Interior',
  editorial: 'Editorial Design',
};

const KNOWN_KEYS = ['Titel', 'Land', 'Jahr', 'Beschreibung', 'Material', 'Fertigungstechniken', 'Besonderheiten'];
const KEY_LINE_RE = new RegExp(`^(${KNOWN_KEYS.join('|')}):\\s*(.*)$`);

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Turns "line one\nline two" (a paragraph typed/wrapped across several
// lines in a plain text editor) into "line one line two" -- every
// field here is exactly one paragraph or one bullet list, never
// multiple paragraphs, so a blank line always means the field ended.
function joinWrapped(lines) {
  return lines.map((l) => l.trim()).filter(Boolean).join(' ');
}

function parseBlock(rawLines) {
  const fields = {};
  let currentKey = null;
  let buf = [];
  let besonderheitenItems = null;

  function flush() {
    if (currentKey === 'Besonderheiten') {
      fields.Besonderheiten = besonderheitenItems || [];
    } else if (currentKey) {
      fields[currentKey] = joinWrapped(buf);
    }
    buf = [];
  }

  for (const rawLine of rawLines) {
    const line = rawLine.replace(/\r$/, '');
    const keyMatch = line.match(KEY_LINE_RE);
    if (keyMatch) {
      flush();
      currentKey = keyMatch[1];
      besonderheitenItems = currentKey === 'Besonderheiten' ? [] : null;
      if (keyMatch[2]) buf.push(keyMatch[2]);
      continue;
    }
    if (currentKey === 'Besonderheiten') {
      const bulletMatch = line.match(/^\s*-\s*(.+)$/);
      if (bulletMatch) {
        besonderheitenItems.push(bulletMatch[1].trim());
      }
      continue; // blank lines and anything non-bullet inside this block are ignored
    }
    if (!line.trim()) continue; // blank line: field boundary
    if (currentKey) buf.push(line);
  }
  flush();
  return fields;
}

function parseContentTxt(text) {
  const lines = text.split('\n');
  const deIdx = lines.findIndex((l) => l.trim() === '--- DEUTSCH ---');
  const enIdx = lines.findIndex((l) => l.trim() === '--- ENGLISH ---');
  if (deIdx === -1 || enIdx === -1 || enIdx < deIdx) {
    throw new Error('content.txt muss beide Marker "--- DEUTSCH ---" und "--- ENGLISH ---" enthalten (in dieser Reihenfolge).');
  }
  const header = parseBlock(lines.slice(0, deIdx));
  const de = parseBlock(lines.slice(deIdx + 1, enIdx));
  const en = parseBlock(lines.slice(enIdx + 1));
  if (!header.Titel) throw new Error('content.txt: "Titel:" fehlt.');
  return { titel: header.Titel, land: header.Land || '', jahr: header.Jahr || '', de, en };
}

function bilingualSpan(deText, enText) {
  return `<span data-lang="de">${escapeHtml(deText)}</span><span data-lang="en">${escapeHtml(enText)}</span>`;
}

// bilingualSpan() escapes its arguments, but Besonderheiten needs
// <br><br> between bullets to survive -- built directly instead of
// going through it.
function buildBesonderheitenRow(deB, enB) {
  if (!deB.length || !enB.length) return '';
  const deJoined = deB.map(escapeHtml).join('<br><br>');
  const enJoined = enB.map(escapeHtml).join('<br><br>');
  return `          <li class="row-detail">${bilingualSpan('Besonderheiten', 'Special features')} <span><span data-lang="de">${deJoined}</span><span data-lang="en">${enJoined}</span></span></li>`;
}

function buildContactList(data, categoryLabelDe, categoryLabelEn) {
  const rows = [];
  rows.push(`      <li>${bilingualSpan('Kategorie', 'Category')} ${bilingualSpan(categoryLabelDe, categoryLabelEn)}</li>`);
  if (data.land) rows.push(`      <li>${bilingualSpan('Land', 'Country')} <span>${escapeHtml(data.land)}</span></li>`);
  if (data.jahr) rows.push(`      <li>${bilingualSpan('Jahr', 'Year')} <span>${escapeHtml(data.jahr)}</span></li>`);
  if (data.de.Material && data.en.Material) {
    rows.push(`          <li class="row-detail">${bilingualSpan('Material', 'Material')} <span>${bilingualSpan(data.de.Material, data.en.Material)}</span></li>`);
  }
  if (data.de.Fertigungstechniken && data.en.Fertigungstechniken) {
    rows.push(`          <li class="row-detail">${bilingualSpan('Fertigungstechniken', 'Manufacturing techniques')} <span>${bilingualSpan(data.de.Fertigungstechniken, data.en.Fertigungstechniken)}</span></li>`);
  }
  const besRow = buildBesonderheitenRow(data.de.Besonderheiten || [], data.en.Besonderheiten || []);
  if (besRow) rows.push(besRow);
  return rows.join('\n');
}

// Reads the CSS/JS cache-bust version off an existing project page
// rather than hardcoding it here -- so a future sitewide version bump
// (see main.js/style.css ?v=NNN) doesn't quietly leave newly generated
// pages pointing at a stale asset version just because this template
// wasn't updated too.
function currentAssetVersion() {
  const probe = path.join(REPO_ROOT, 'kategorien', 'mobility', 'bmw-k100-aero-de-2024', 'index.html');
  if (fs.existsSync(probe)) {
    const m = fs.readFileSync(probe, 'utf8').match(/style\.css\?v=(\d+)/);
    if (m) return m[1];
  }
  return '1'; // fallback if the probe page itself is ever renamed/removed
}

function renderProjectHtml(data, categoryLabelDe, categoryLabelEn, assetVersion) {
  // Titel: in the header is the default, used for both languages unless
  // content.txt also has its own "Titel:" line inside --- ENGLISH ---,
  // in which case that overrides just the English side. Most projects
  // (proper nouns, model names) never need this; a few descriptive
  // titles do. <title>/meta stay on the header title either way, same
  // as every other page's browser-tab title on this site -- none of
  // them re-render on a language switch.
  const title = escapeHtml(data.titel);
  const titleDe = data.titel;
  const titleEn = data.en.Titel || data.titel;
  return `<!DOCTYPE html>
<html lang="de" data-lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — Sören Bläcker</title>
<meta name="description" content="${title} — Projekt von Sören Bläcker.">
<script>(function(){var l=localStorage.getItem('lang')||'de';document.documentElement.setAttribute('data-lang',l);})();</script>
<link rel="icon" href="../../../favicon.svg" id="faviconLink" data-favicon-fallback="../../../logo2">
<link rel="stylesheet" href="../../../css/style.css?v=${assetVersion}">
</head>
<body>

<header class="nav">
  <div class="nav__inner">
    <a href="../../../index.html" class="nav__mark"><span class="nav__mark-text">Sören Bläcker</span><img class="nav__mark-logo" data-photo="../../../logo" alt="Sören Bläcker"></a>
    <div class="nav__right">
      <div class="lang-toggle">
        <span class="lang-toggle__thumb" aria-hidden="true">
          <svg class="lang-toggle__thumb-cutout" data-lang="de" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><mask id="langThumbDe"><rect width="24" height="24" rx="12" ry="12" fill="#fff"/><text x="12" y="12" dy="0.35em" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="8.5" fill="#000">DE</text></mask><rect width="24" height="24" rx="12" ry="12" fill="#fff" mask="url(#langThumbDe)"/></svg>
          <svg class="lang-toggle__thumb-cutout" data-lang="en" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><mask id="langThumbEn"><rect width="24" height="24" rx="12" ry="12" fill="#fff"/><text x="12" y="12" dy="0.35em" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="8.5" fill="#000">EN</text></mask><rect width="24" height="24" rx="12" ry="12" fill="#fff" mask="url(#langThumbEn)"/></svg>
        </span>
        <button type="button" data-set-lang="de" aria-label="Deutsch"></button>
        <button type="button" data-set-lang="en" aria-label="English"></button>
      </div>
      <button class="menu-btn" id="menuBtn" aria-haspopup="true" aria-expanded="false" aria-controls="menuPanel" aria-label="Menü">
        <span class="menu-btn__cutout" data-lang="de">
          <svg viewBox="0 0 104 36" width="104" height="36" aria-hidden="true"><mask id="menuMaskDe"><rect width="104" height="36" rx="18" ry="18" fill="#fff"/><text x="52" y="19" text-anchor="middle" dominant-baseline="central" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="13" letter-spacing="2" fill="#000">MENÜ</text></mask><rect width="104" height="36" rx="18" ry="18" fill="#fff" mask="url(#menuMaskDe)"/></svg>
        </span>
        <span class="menu-btn__cutout" data-lang="en">
          <svg viewBox="0 0 104 36" width="104" height="36" aria-hidden="true"><mask id="menuMaskEn"><rect width="104" height="36" rx="18" ry="18" fill="#fff"/><text x="52" y="19" text-anchor="middle" dominant-baseline="central" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="13" letter-spacing="2" fill="#000">MENU</text></mask><rect width="104" height="36" rx="18" ry="18" fill="#fff" mask="url(#menuMaskEn)"/></svg>
        </span>
        <span class="menu-btn__burger" aria-hidden="true"><span></span><span></span><span></span></span>
      </button>
    </div>
  </div>
</header>

<div class="menu-scrim" id="menuScrim"></div>
<div class="menu-panel" id="menuPanel">
  <button class="menu-panel__close" id="menuClose" aria-label="Menü schließen"></button>
  <nav class="menu-panel__nav">
    <a href="../../../index.html"><span data-lang="de">Start</span><span data-lang="en">Home</span></a>
    <a href="../../../index.html#categories"><span data-lang="de">Arbeiten</span><span data-lang="en">Work</span></a>
    <a href="../../../services/"><span data-lang="de">Service</span><span data-lang="en">Services</span></a>
    <a href="../../../about.html"><span data-lang="de">Über mich</span><span data-lang="en">About</span></a>
    <a href="../../../contact.html"><span data-lang="de">Kontakt</span><span data-lang="en">Contact</span></a>
  </nav>
  <div class="menu-panel__foot">
    <span data-lang="de">Deutschland — weltweit verfügbar</span>
    <span data-lang="en">Germany — available worldwide</span>
    <div class="menu-panel__social">
      <a href="https://www.youtube.com/@soerenblaecker.design" target="_blank" rel="noopener">YouTube</a>
      <a href="https://www.linkedin.com/in/soerenblaecker" target="_blank" rel="noopener">LinkedIn</a>
      <a href="../../../impressum/"><span data-lang="de">Impressum</span><span data-lang="en">Legal Notice</span></a>
      <a href="../../../datenschutz/"><span data-lang="de">Datenschutz</span><span data-lang="en">Privacy</span></a>
    </div>
  </div>
</div>

<section class="section--flush project-hero">
  <div class="wrap project-hero__overlay"><h1 class="project-hero__title"><a href="../">${bilingualSpan(titleDe, titleEn)}</a></h1></div>
  <div class="project-stack">
    <div class="project-hero-panel">
      <div class="tile__media">
        <div class="ph"><span data-lang="de">Projektfoto — Hauptbild</span><span data-lang="en">Project photo — main image</span></div>
        <img data-photo="1" alt="">
      </div>
    </div>
    <div class="tile-grid tile-grid--projects" data-fixed-layout></div>
  </div>
</section>

<section>
  <div class="wrap about-grid">
    <div>
      <h2><span data-lang="de">Über das Projekt</span><span data-lang="en">About the project</span></h2>
      <p>
        ${bilingualSpan(data.de.Beschreibung || '', data.en.Beschreibung || '')}
      </p>
    </div>
    <ul class="contact-list">
${buildContactList(data, categoryLabelDe, categoryLabelEn)}
    </ul>
  </div>
</section>

<footer>
  <div class="wrap footer__inner">
    <span>&copy; <span id="year">2026</span> Sören Bläcker</span>
    <div class="footer__social">
      <a href="../../../contact.html"><span data-lang="de">Kontakt</span><span data-lang="en">Contact</span></a>
      <a href="../../../impressum/"><span data-lang="de">Impressum</span><span data-lang="en">Legal Notice</span></a>
      <a href="../../../datenschutz/"><span data-lang="de">Datenschutz</span><span data-lang="en">Privacy</span></a>
      <a href="https://www.youtube.com/@soerenblaecker.design" target="_blank" rel="noopener">YouTube</a>
      <a href="https://www.linkedin.com/in/soerenblaecker" target="_blank" rel="noopener">LinkedIn</a>
    </div>
  </div>
</footer>

<script src="../../../js/main.js?v=${assetVersion}"></script>
</body>
</html>
`;
}

function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('Usage: update-project-content.js <content.txt> [...]');
    process.exit(1);
  }
  const assetVersion = currentAssetVersion();
  let anyError = false;
  for (const file of files) {
    try {
      const absPath = path.resolve(file);
      const dir = path.dirname(absPath);
      const htmlPath = path.join(dir, 'index.html');
      const category = path.basename(path.dirname(dir));
      const categoryLabelDe = CATEGORY_LABELS[category];
      const categoryLabelEn = CATEGORY_LABELS_EN[category];
      if (!categoryLabelDe) {
        throw new Error(`Unbekannte Kategorie "${category}" (aus dem Ordnerpfad ermittelt) -- keine Zuordnung in CATEGORY_LABELS. Erwartete Struktur: <kategorie>/<projekt-ordner>/content.txt`);
      }
      const text = fs.readFileSync(absPath, 'utf8');
      const data = parseContentTxt(text);
      const isNew = !fs.existsSync(htmlPath);
      fs.writeFileSync(htmlPath, renderProjectHtml(data, categoryLabelDe, categoryLabelEn, assetVersion));
      // Category-page tiles need a title without fetching/parsing this
      // project's whole content.txt just for that -- title.txt is that
      // cheap lookup, always written here (never hand-edited) so it can
      // never drift from what this same content.txt says. Two lines, DE
      // then EN; a project whose name doesn't differ per language just
      // gets the same line twice.
      const titleDe = data.titel;
      const titleEn = data.en.Titel || data.titel;
      fs.writeFileSync(path.join(dir, 'title.txt'), `${titleDe}\n${titleEn}\n`);
      console.log(`${isNew ? 'NEU' : 'OK'}: ${file} -> ${path.relative(process.cwd(), htmlPath)}`);
    } catch (err) {
      anyError = true;
      console.error(`FEHLER bei ${file}: ${err.message}`);
    }
  }
  if (anyError) process.exit(1);
}

if (require.main === module) main();

module.exports = { parseContentTxt, buildContactList, renderProjectHtml, CATEGORY_LABELS, CATEGORY_LABELS_EN };
