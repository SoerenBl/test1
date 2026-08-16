// Powers /404.html as a fallback "project detail page" template: any URL
// matching /{category}/{slug-cc-yyyy}/ that has no real index.html of its
// own lands here instead of a plain 404. Reads the category/slug straight
// out of the URL and fills in the same markup a hand-built project page
// would have — js/main.js's existing photo-gallery/favicon/logo logic
// then runs completely unchanged, since the relative photo probes
// (1.jpg, 2.jpg, ...) resolve against the URL shown in the address bar,
// not against this file's real location.
//
// Genuinely broken links (wrong category, malformed slug) fall through
// to the plain "page not found" panel instead.
document.addEventListener('DOMContentLoaded', function () {
  var CATEGORY_INFO = {
    'furniture-lighting': { de: 'Möbel & Beleuchtung', en: 'Furniture & Lighting' },
    'mobility': { de: 'Mobility & Automotive', en: 'Mobility & Automotive' },
    'product-design': { de: 'Produktdesign', en: 'Product Design' },
    'interior-design': { de: 'Interieur', en: 'Interior' },
    'editorial': { de: 'Editorial Design', en: 'Editorial Design' },
    'craft-restoration': { de: 'Handwerk & Restaurierung', en: 'Craft & Restoration' }
  };
  var FOLDER_RE = /^(.+)-([a-z]{2})-(\d{4})$/;
  var GH_REPO = 'SoerenBl/test1';
  var GH_BRANCH = 'main';

  function titleCaseSlug(slug) {
    return slug.split('-').map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  var parts = window.location.pathname.split('/').filter(Boolean);
  if (parts.length && /\.html$/i.test(parts[parts.length - 1])) parts.pop();

  var category = parts[0];
  var folderName = parts[1];
  var info = category ? CATEGORY_INFO[category] : null;
  var m = folderName ? folderName.match(FOLDER_RE) : null;

  var projectRoot = document.getElementById('projectRoot');
  var notFoundRoot = document.getElementById('notFoundRoot');

  if (!info || !m || parts.length !== 2) {
    projectRoot.style.display = 'none';
    notFoundRoot.style.display = '';
    return;
  }

  var slug = m[1], country = m[2].toUpperCase(), year = m[3];
  var categoryHref = '/' + category + '/';

  var heroLink = document.getElementById('heroTitleLink');
  heroLink.setAttribute('href', categoryHref);

  function applyTitle(title) {
    document.getElementById('pageTitle').textContent = title + ' — Sören Bläcker';
    heroLink.textContent = title;
    // The hover/dock animation (js/main.js) measured this element's size
    // before this text was set — it was empty at that point, so tell it
    // to measure again now that the real title is in place.
    if (window.__remeasureProjectHero) window.__remeasureProjectHero();
  }
  applyTitle(titleCaseSlug(slug));

  document.getElementById('metaCategoryDe').textContent = info.de;
  document.getElementById('metaCategoryEn').textContent = info.en;
  document.getElementById('metaCountry').textContent = country;
  document.getElementById('metaYear').textContent = year;

  var titleUrl = 'https://raw.githubusercontent.com/' + GH_REPO + '/' + GH_BRANCH + '/' +
    category + '/' + folderName + '/title.txt';
  fetch(titleUrl).then(function (res) { return res.ok ? res.text() : null; })
    .then(function (text) { if (text && text.trim()) applyTitle(text.trim()); })
    .catch(function () {});
});
