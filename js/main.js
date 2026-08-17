document.addEventListener('DOMContentLoaded', function () {
  // --- Slide menu panel ---
  var menuBtn = document.getElementById('menuBtn');
  var menuPanel = document.getElementById('menuPanel');
  var menuClose = document.getElementById('menuClose');
  var menuScrim = document.getElementById('menuScrim');

  function openMenu() {
    menuPanel.classList.add('is-open');
    menuScrim.classList.add('is-open');
    menuBtn.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    menuPanel.classList.remove('is-open');
    menuScrim.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', function () {
      if (menuPanel.classList.contains('is-open')) closeMenu(); else openMenu();
    });
  }
  if (menuClose) menuClose.addEventListener('click', closeMenu);
  if (menuScrim) menuScrim.addEventListener('click', closeMenu);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });
  if (menuPanel) {
    menuPanel.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeMenu);
    });
  }

  // --- Language toggle (DE/EN) ---
  var langButtons = document.querySelectorAll('[data-set-lang]');
  function applyLang(lang) {
    document.documentElement.setAttribute('data-lang', lang);
    langButtons.forEach(function (btn) {
      btn.setAttribute('data-active', String(btn.getAttribute('data-set-lang') === lang));
    });
  }
  langButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = btn.getAttribute('data-set-lang');
      localStorage.setItem('lang', lang);
      applyLang(lang);
    });
  });
  applyLang(document.documentElement.getAttribute('data-lang') || 'de');

  // --- Letter-jump hover on select page titles (About, Awards, Service,
  // Contact) --- Splits each title's text into one span per character so
  // a hover can bounce them individually via the Web Animations API: a
  // wave sweeps left to right, each letter hopping up a little and
  // flashing blue, like the Pixar-lamp bounce. Runs per [data-lang] child
  // so bilingual titles keep working after a language switch (display
  // toggling still applies to the whole span, letters and all).
  function initLetterFx(titleEl) {
    if (!titleEl || titleEl.dataset.letterFxInit) return;
    titleEl.dataset.letterFxInit = 'true';
    var langSpans = titleEl.querySelectorAll(':scope > [data-lang]');
    var langSpansArr = langSpans.length ? Array.prototype.slice.call(langSpans) : null;
    var containers;
    if (langSpansArr) {
      containers = langSpansArr;
    } else {
      // No existing [data-lang] wrapper (e.g. "About", same in both
      // languages) — make one purely so there's an inline element to hang
      // the hover listener on (see below for why that matters).
      var wrap = document.createElement('span');
      while (titleEl.firstChild) wrap.appendChild(titleEl.firstChild);
      titleEl.appendChild(wrap);
      containers = [wrap];
    }
    containers.forEach(function (container) {
      container.style.display = 'inline';
      var text = container.textContent;
      container.textContent = '';
      Array.prototype.forEach.call(text, function (ch) {
        var span = document.createElement('span');
        span.className = 'letter-fx__char';
        span.textContent = ch === ' ' ? ' ' : ch;
        container.appendChild(span);
      });
    });
    var accent = getComputedStyle(document.documentElement).getPropertyValue('--color-panel-hover').trim() || '#9fd8ff';
    function bounceLetters() {
      var chars = titleEl.querySelectorAll('.letter-fx__char');
      chars.forEach(function (span, i) {
        var base = getComputedStyle(span).color;
        if (span.__letterAnim) span.__letterAnim.cancel();
        span.__letterAnim = span.animate([
          { transform: 'translateY(0)', color: base, offset: 0 },
          { transform: 'translateY(-0.22em)', color: accent, offset: 0.4 },
          { transform: 'translateY(0)', color: base, offset: 1 }
        ], {
          duration: 520,
          delay: i * 26,
          easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        });
      });
    }
    // Listener lives on the (now inline, tightly-fit) containers rather
    // than the title element itself, which stays block-level so normal
    // page layout (spacing before whatever follows the title) is
    // unaffected — that's the actual point of this whole change.
    containers.forEach(function (container) {
      container.addEventListener('mouseenter', bounceLetters);
    });
  }
  document.querySelectorAll('.hover-letters').forEach(initLetterFx);

  // --- Footer year ---
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // --- Deterministic, gap-free 2-column tile placement. ---
  // CSS grid-auto-flow:dense can't be trusted here: with several
  // row-spanning "tall" tiles in the mix it can strand an empty cell
  // anywhere in the grid, not just at the end. So instead of letting the
  // browser auto-place tiles, we compute each tile's column/row ourselves
  // with a simple shortest-column-first (masonry) rule, which by
  // construction never leaves a hole — the shorter column always receives
  // the next tile, so any gap is always filled a step later. A full-width
  // tile realigns both columns to the same row. Only a single row can ever
  // remain short at the very end, which we close explicitly.
  function layoutTilesGapFree(tiles, opts) {
    opts = opts || {};
    if (!tiles.length) return;
    // Below the 2-column breakpoint the grid is a single full-width
    // column (see the max-width:760px rules in style.css) — setting an
    // explicit grid-column here would make the browser create a 2nd
    // implicit column regardless, breaking that. So on narrow viewports
    // just clear any leftover placement and leave tiles to the normal
    // single-column flow; there's no 2-column gap to prevent there anyway.
    var twoCol = window.matchMedia('(min-width: 761px)').matches;
    if (!twoCol) {
      tiles.forEach(function (tile) {
        tile.classList.remove('tile--tall', 'tile--full');
        tile.style.gridColumn = '';
        tile.style.gridRow = '';
      });
      return;
    }
    var colTop = [1, 1];
    var placed = [];

    // Bring the shorter column level with the taller one by stretching its
    // last (single-column) tile down — used both before a full-width tile
    // jumps in and once more at the very end, so no column is ever left
    // with an abandoned cell behind a tile that already moved past it.
    function markSpan(tile, span) {
      tile.classList.remove('tile--tall', 'tile--portrait');
      if (span === 2) tile.classList.add('tile--tall');
      else if (span >= 3) tile.classList.add('tile--portrait');
    }

    function closeGap() {
      while (colTop[0] !== colTop[1]) {
        var shortCol = colTop[0] < colTop[1] ? 0 : 1;
        var bottomTile = null;
        for (var j = placed.length - 1; j >= 0; j--) {
          if (placed[j].col === shortCol && placed[j].colSpan === 1) { bottomTile = placed[j]; break; }
        }
        if (!bottomTile) break;
        bottomTile.rowSpan += 1;
        bottomTile.tile.style.gridRow = bottomTile.row + ' / span ' + bottomTile.rowSpan;
        markSpan(bottomTile.tile, bottomTile.rowSpan);
        colTop[shortCol] += 1;
      }
    }

    tiles.forEach(function (tile, i) {
      var forceFull = opts.preserveFull && tile.classList.contains('tile--full');
      // A tile can arrive with an explicit row-span request (1/2/3) via
      // data-row-span — set from the photo's own orientation (landscape/
      // square/portrait) so the tile's shape actually matches what's
      // inside it, instead of every tile getting a random shape. Falls
      // back to the old random/preserve behaviour when no orientation
      // info is available (e.g. the hand-authored homepage grid).
      var requestedSpan = tile.getAttribute('data-row-span');
      var forceTall = opts.preserveTall && tile.classList.contains('tile--tall');
      tile.classList.remove('tile--tall', 'tile--portrait', 'tile--full');
      tile.style.gridColumn = '';
      tile.style.gridRow = '';
      var isLast = i === tiles.length - 1;

      if (forceFull) {
        closeGap();
        var row = colTop[0];
        tile.style.gridColumn = '1 / span 2';
        tile.style.gridRow = row + ' / span 1';
        tile.classList.add('tile--full');
        colTop[0] = colTop[1] = row + 1;
        placed.push({ tile: tile, col: 0, colSpan: 2, row: row, rowSpan: 1 });
        return;
      }

      var col = colTop[0] <= colTop[1] ? 0 : 1;
      var span;
      if (requestedSpan) {
        span = Math.max(1, Math.min(3, parseInt(requestedSpan, 10) || 1));
      } else {
        var tall = forceTall || (opts.randomTall && !isLast && Math.random() < 0.32);
        span = tall ? 2 : 1;
      }
      var row = colTop[col];
      tile.style.gridColumn = (col + 1) + ' / span 1';
      tile.style.gridRow = row + ' / span ' + span;
      markSpan(tile, span);
      placed.push({ tile: tile, col: col, colSpan: 1, row: row, rowSpan: span });
      colTop[col] += span;
    });

    closeGap();
  }

  // Category-listing pages (e.g. Möbel & Beleuchtung): order stays as
  // written in the HTML; which tiles render tall is randomized, but an
  // authored full-width tile (e.g. a closing banner) stays full-width.
  document.querySelectorAll('.tile-grid--projects:not([data-fixed-layout])').forEach(function (grid) {
    var tiles = Array.prototype.slice.call(grid.querySelectorAll(':scope > .tile'));
    if (tiles.length < 3) return;
    layoutTilesGapFree(tiles, { randomTall: true, preserveFull: true });
  });

  // Homepage category grid: sizes are hand-picked in the HTML, not
  // randomized — but still run through the same gap-free placement so a
  // future edit (adding/removing a category) can never leave a hole.
  document.querySelectorAll('#categories > .tile-grid').forEach(function (grid) {
    var tiles = Array.prototype.slice.call(grid.querySelectorAll(':scope > .tile'));
    layoutTilesGapFree(tiles, { preserveTall: true, preserveFull: true });
  });

  // --- Photo formats: try these extensions in order for any photo slot,
  // so it doesn't matter whether a file was exported as .jpg, .png, etc. ---
  // Tiered: try the extensions people actually export in (lowercase
  // jpg/png/webp) first, and only escalate to the uncommon-casing
  // fallbacks if none of those exist. Tried within a tier at once instead
  // of one after another — a fully sequential chain means a .png file
  // pays for a failed jpg round-trip first — but NOT all 8 at once either:
  // with up to 24 numbered gallery slots each firing a full set, that was
  // 192 simultaneous image requests fighting over the browser's ~6
  // concurrent-connections-per-host limit, which is what actually caused
  // the multi-second placeholder flash (not the probing logic itself).
  // Two small tiers keep the common case (tier 1 hits) fast while capping
  // how many requests pile up when a slot genuinely has nothing in it.
  var PHOTO_EXTS_PRIMARY = ['jpg', 'png', 'webp'];
  var PHOTO_EXTS_FALLBACK = ['JPG', 'jpeg', 'JPEG', 'PNG', 'WEBP'];
  function probeExtSet(baseNoExt, exts) {
    return new Promise(function (resolve) {
      var remaining = exts.length;
      var settled = false;
      exts.forEach(function (ext) {
        var url = baseNoExt + '.' + ext;
        var img = new Image();
        img.onload = function () {
          if (!settled) { settled = true; resolve(url); }
        };
        img.onerror = function () {
          remaining -= 1;
          if (remaining === 0 && !settled) { settled = true; resolve(null); }
        };
        img.src = url;
      });
    });
  }
  function probePhoto(baseNoExt) {
    return probeExtSet(baseNoExt, PHOTO_EXTS_PRIMARY).then(function (url) {
      return url || probeExtSet(baseNoExt, PHOTO_EXTS_FALLBACK);
    });
  }

  // --- Project photo galleries: fully dynamic. Probes numbered files
  // (1, 2, ...) up to a sane cap and builds one tile per photo that
  // actually exists — add or remove a numbered file and the grid
  // grows/shrinks with it, no HTML edit needed. Gaps are just skipped.
  var MAX_GALLERY_PHOTOS = 24;
  // Small sequential batches instead of firing all 24 slots (× up to 8
  // extension guesses each) at once — that was up to ~190 simultaneous
  // image requests for a single gallery, which is what actually caused
  // the multi-second placeholder flash (browsers only run a handful of
  // requests at once per origin; the rest just queue). Stopping once a
  // batch comes back with several consecutive misses in a row also means
  // a typical 5-10 photo gallery finishes after 2-3 small batches instead
  // of always scanning the full range — still tolerant of the occasional
  // gap (a single missing number within a batch doesn't stop the scan),
  // just no longer willing to keep checking indefinitely once photos have
  // clearly run out.
  var GALLERY_BATCH_SIZE = 4;
  var GALLERY_MAX_CONSECUTIVE_MISSES = 4;
  // startIndex lets a caller skip past a photo already claimed elsewhere
  // (photo 1 is the project's hero — see .project-hero-panel below — so
  // the gallery itself only ever needs to scan from photo 2 on).
  function probeGallerySequence(base, startIndex, maxSlots) {
    var results = [];
    var consecutiveMisses = 0;
    var nextIndex = startIndex;
    function nextBatch() {
      if (nextIndex > maxSlots || consecutiveMisses >= GALLERY_MAX_CONSECUTIVE_MISSES) {
        return Promise.resolve(results);
      }
      var batch = [];
      for (var i = 0; i < GALLERY_BATCH_SIZE && nextIndex <= maxSlots; i++, nextIndex++) {
        batch.push(nextIndex);
      }
      return Promise.all(batch.map(function (idx) {
        return probePhoto(base + idx).then(function (url) { return { idx: idx, url: url }; });
      })).then(function (batchResults) {
        batchResults.sort(function (a, b) { return a.idx - b.idx; });
        batchResults.forEach(function (r) {
          results[r.idx] = r.url;
          consecutiveMisses = r.url ? 0 : consecutiveMisses + 1;
        });
        return nextBatch();
      });
    }
    return nextBatch();
  }

  // --- Project photo gallery (photos 2+ — photo 1 is the static hero
  // slot resolved by resolveStaticPhotos below, like any other single
  // photo). Same orientation-aware masonry placement as the category tile
  // grids: each tile's shape (landscape/square/portrait) is read from its
  // own photo before anything renders, instead of a fixed alternating
  // pattern that ignores what's actually in the picture. ---
  var galleryGrids = document.querySelectorAll('.tile-grid--projects[data-fixed-layout]');
  galleryGrids.forEach(function (grid) {
    var base = grid.getAttribute('data-photo-path') || '';
    probeGallerySequence(base, 2, MAX_GALLERY_PHOTOS).then(function (results) {
      var found = [];
      results.forEach(function (url) { if (url) found.push(url); });
      if (!found.length) return; // nothing beyond the hero photo — leave the grid empty
      return Promise.all(found.map(function (url) {
        return getOrientationSpan(url).then(function (span) { return { url: url, span: span }; });
      }));
    }).then(function (resolved) {
      if (!resolved || !resolved.length) return;
      // A single leftover landscape photo spans full width — cropping it
      // to a 2:1 strip via object-fit: cover still shows essentially the
      // whole frame. A square/portrait photo forced into that same wide
      // strip would instead lose most of its height to the crop, so it
      // keeps its own upright shape in one column and leaves the other
      // column blank rather than mangling the photo to fill it.
      if (resolved.length === 1) {
        var only = resolved[0];
        var soleClass = only.span === 1 ? 'tile--full' : (only.span === 2 ? 'tile--tall' : 'tile--portrait');
        grid.innerHTML = '<div class="tile ' + soleClass + '"><div class="tile__media"><img src="' + only.url + '" alt=""></div></div>';
        return;
      }
      var html = resolved.map(function (r) {
        return '<div class="tile" data-row-span="' + r.span + '"><div class="tile__media"><img src="' + r.url + '" alt=""></div></div>';
      }).join('');
      grid.innerHTML = html;
      var tiles = Array.prototype.slice.call(grid.querySelectorAll(':scope > .tile'));
      layoutTilesGapFree(tiles, { preserveFull: true });
    });
  });

  // --- Fixed single photo slots (hero, category covers, listing thumbnails):
  // same format tolerance, applied to a static <img data-photo="path/without/extension">.
  // An optional data-photo-fallback is tried if the primary path has no
  // file — e.g. a project tile prefers its own cover.jpg but falls back to
  // photo 1 automatically when no cover has been added yet.
  function resolveStaticPhotos(root) {
    (root || document).querySelectorAll('img[data-photo]').forEach(function (img) {
      var primary = img.getAttribute('data-photo');
      var fallback = img.getAttribute('data-photo-fallback');
      probePhoto(primary).then(function (url) {
        if (url || !fallback) return url;
        return probePhoto(fallback);
      }).then(function (url) {
        if (url) {
          img.src = url;
          var ph = img.previousElementSibling;
          if (ph && ph.classList.contains('ph')) ph.style.display = 'none';
          if (img.classList.contains('nav__mark-logo')) img.closest('.nav__mark').classList.add('has-logo');
        } else {
          img.style.display = 'none';
        }
      });
    });
  }
  resolveStaticPhotos();

  // --- Favicon: "SB" by default, swapped automatically for logo2.* if
  // that file exists (kept separate from logo.* so the nav mark and the
  // favicon can be different crops/versions of a logo). ---
  var faviconLink = document.getElementById('faviconLink');
  if (faviconLink) {
    var faviconFallback = faviconLink.getAttribute('data-favicon-fallback');
    if (faviconFallback) {
      probePhoto(faviconFallback).then(function (url) {
        if (url) faviconLink.href = url;
      });
    }
  }

  // --- Discover project folders automatically instead of hardcoding a
  // tile per project. A project folder is named "{slug}-{country}-{year}"
  // (e.g. "scandinavian-tech-nightstand-de-2025") — renaming or adding a
  // folder on GitHub/GitHub Desktop is enough, no code edit needed. The
  // display title defaults to a title-cased version of the slug, or can
  // be overridden by dropping a plain-text title.txt in the folder (useful
  // for capitalisation/ampersands a folder name can't represent, e.g.
  // "HiFi" or "&"). Cached in localStorage for a few minutes to go easy
  // on GitHub's unauthenticated API rate limit.
  var GH_REPO = 'SoerenBl/test1';
  var GH_BRANCH = 'main';
  var DISCOVER_CACHE_MS = 5 * 60 * 1000;
  var FOLDER_RE = /^(.+)-([a-z]{2})-(\d{4})$/;

  function titleCaseSlug(slug) {
    return slug.split('-').map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  function fetchTitleOverride(category, slug) {
    var url = 'https://raw.githubusercontent.com/' + GH_REPO + '/' + GH_BRANCH + '/' + category + '/' + slug + '/title.txt';
    return fetch(url).then(function (res) {
      return res.ok ? res.text() : null;
    }).then(function (text) {
      return text ? text.trim() : null;
    }).catch(function () { return null; });
  }

  function discoverCategoryProjects(category) {
    var cacheKey = 'discover:' + category;
    try {
      var cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && (Date.now() - cached.at) < DISCOVER_CACHE_MS) {
        return Promise.resolve(cached.projects);
      }
    } catch (e) { /* ignore bad cache */ }

    var apiUrl = 'https://api.github.com/repos/' + GH_REPO + '/contents/' + category + '?ref=' + GH_BRANCH;
    return fetch(apiUrl).then(function (res) {
      if (!res.ok) throw new Error('GitHub API ' + res.status);
      return res.json();
    }).then(function (entries) {
      var folders = entries.filter(function (e) { return e.type === 'dir' && FOLDER_RE.test(e.name); });
      return Promise.all(folders.map(function (e) {
        var m = e.name.match(FOLDER_RE);
        var slug = m[1], country = m[2].toUpperCase(), year = m[3];
        return fetchTitleOverride(category, e.name).then(function (customTitle) {
          return { slug: e.name, title: customTitle || titleCaseSlug(slug), country: country, year: year };
        });
      }));
    }).then(function (projects) {
      projects.sort(function (a, b) { return b.year - a.year || a.title.localeCompare(b.title); });
      try { localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), projects: projects })); } catch (e) { /* storage full/disabled */ }
      return projects;
    });
  }

  // Loads a resolved photo URL a second time purely to read its pixel
  // dimensions (free — the browser already has it cached from the probe
  // that found it) and maps the aspect ratio to a row-span: 1 (landscape,
  // wide) / 2 (square) / 3 (portrait, upright). Used so a tile's shape
  // actually matches the photo inside it instead of being random.
  function getOrientationSpan(url) {
    return new Promise(function (resolve) {
      if (!url) { resolve(1); return; }
      var img = new Image();
      img.onload = function () {
        var ratio = img.naturalWidth / (img.naturalHeight || 1);
        resolve(ratio < 0.85 ? 3 : (ratio > 1.15 ? 1 : 2));
      };
      img.onerror = function () { resolve(1); };
      img.src = url;
    });
  }

  function buildCategoryTiles(grid, projects) {
    if (!projects.length) {
      grid.classList.add('tile-grid--single');
      grid.innerHTML =
        '<div class="tile tile--full"><div class="tile__media"><div class="ph">' +
        '<span data-lang="de">Projekte folgen in Kürze</span><span data-lang="en">Projects coming soon</span>' +
        '</div></div></div>';
      applyLang(document.documentElement.getAttribute('data-lang') || 'de');
      return;
    }
    // Cover photo (with the usual photo-1 fallback) is resolved — and its
    // orientation read — before any tile markup is built, so the tile
    // grid renders once with the right shapes already in place instead of
    // rendering square/random and reflowing after the fact.
    Promise.all(projects.map(function (p) {
      return probePhoto(p.slug + '/cover').then(function (url) {
        return url || probePhoto(p.slug + '/1');
      }).then(function (url) {
        return getOrientationSpan(url).then(function (span) {
          return { p: p, span: span };
        });
      });
    })).then(function (resolved) {
      var html = resolved.map(function (r) {
        var p = r.p;
        return '<a class="tile" href="' + p.slug + '/" data-row-span="' + r.span + '">' +
          '<div class="tile__media">' +
          '<div class="ph"><span data-lang="de">Projektfoto — ' + p.title + '</span><span data-lang="en">Project photo — ' + p.title + '</span></div>' +
          '<img data-photo="' + p.slug + '/cover" data-photo-fallback="' + p.slug + '/1" alt="">' +
          '<div class="tile__caption">' +
          '<h3 class="tile__title display">' + p.title + '</h3>' +
          '<span class="tile__meta">' + p.country + ' · ' + p.year + '</span>' +
          '</div></div></a>';
      }).join('');
      grid.innerHTML = html;
      applyLang(document.documentElement.getAttribute('data-lang') || 'de');

      var tiles = Array.prototype.slice.call(grid.querySelectorAll(':scope > .tile'));
      grid.classList.toggle('tile-grid--single', tiles.length === 1);
      grid.classList.toggle('tile-grid--duo', tiles.length === 2);
      if (tiles.length >= 3) {
        layoutTilesGapFree(tiles, { preserveFull: true });
      }
      resolveStaticPhotos(grid);
    });
  }

  document.querySelectorAll('[data-discover-category]').forEach(function (grid) {
    var category = grid.getAttribute('data-discover-category');
    discoverCategoryProjects(category).then(function (projects) {
      buildCategoryTiles(grid, projects);
    }).catch(function () {
      buildCategoryTiles(grid, []);
    });
  });

  // --- Homepage category tiles: "N Projekte" is read from the same
  // discovery data instead of being typed in twice (and going stale the
  // moment a project is added or removed). ---
  document.querySelectorAll('[data-project-count]').forEach(function (el) {
    var category = el.getAttribute('data-project-count');
    discoverCategoryProjects(category).then(function (projects) {
      var n = projects.length;
      el.innerHTML =
        '<span data-lang="de">' + n + ' Projekt' + (n === 1 ? '' : 'e') + '</span>' +
        '<span data-lang="en">' + n + ' project' + (n === 1 ? '' : 's') + '</span>';
      applyLang(document.documentElement.getAttribute('data-lang') || 'de');
    }).catch(function () { /* leave blank rather than show a wrong number */ });
  });

  // --- Project photo lightbox: click to enlarge, click again to zoom + follow mouse ---
  if (galleryGrids.length) {
    var lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML =
      '<div class="lightbox__backdrop"></div>' +
      '<div class="lightbox__stage">' +
        '<button class="lightbox__close" aria-label="Schließen"></button>' +
        '<div class="lightbox__media"></div>' +
      '</div>';
    document.body.appendChild(lightbox);

    var lbBackdrop = lightbox.querySelector('.lightbox__backdrop');
    var lbStage = lightbox.querySelector('.lightbox__stage');
    var lbMedia = lightbox.querySelector('.lightbox__media');
    var lbClose = lightbox.querySelector('.lightbox__close');
    var lbZoomed = false;

    function openLightbox(media) {
      lbMedia.innerHTML = '';
      // Clone just the <img> itself, not the surrounding .tile__media —
      // that wrapper's grid-tile CSS (absolute position, 100%/100%,
      // object-fit: cover) would otherwise still apply here too (classes
      // aren't scoped to their original container) and force every photo
      // to stretch/crop into a fixed box instead of showing at its own
      // real aspect ratio.
      var img = media.querySelector('img');
      if (img) {
        var clone = img.cloneNode(true);
        clone.className = '';
        clone.removeAttribute('style');
        lbMedia.appendChild(clone);
      }
      lightbox.classList.add('is-open');
      document.body.classList.add('lightbox-open');
    }
    function closeLightbox() {
      lightbox.classList.remove('is-open');
      lbStage.classList.remove('is-zoomed');
      lbZoomed = false;
      document.body.classList.remove('lightbox-open');
    }
    function setZoomOrigin(e) {
      var rect = lbStage.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;
      lbMedia.style.transformOrigin = x + '% ' + y + '%';
    }

    // Delegated: gallery tiles are inserted asynchronously once the photo
    // probes above resolve, so listeners must be bound on the (present at
    // load time) grid container rather than on the tiles themselves.
    galleryGrids.forEach(function (grid) {
      grid.addEventListener('click', function (e) {
        var media = e.target.closest('.tile__media');
        if (media && media.querySelector('img')) openLightbox(media);
      });
    });
    // Hero panel's photo (project 1) isn't part of a gallery grid, but
    // should still open in the same lightbox as the rest — its <img> is
    // static in the HTML (not inserted async like the gallery tiles), so
    // no delegation needed here.
    var heroPanelMedia = document.querySelector('.project-hero-panel .tile__media');
    if (heroPanelMedia) {
      heroPanelMedia.addEventListener('click', function () {
        if (heroPanelMedia.querySelector('img')) openLightbox(heroPanelMedia);
      });
    }
    lbBackdrop.addEventListener('click', closeLightbox);
    lbClose.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeLightbox();
    });
    lbStage.addEventListener('click', function (e) {
      e.stopPropagation();
      if (e.target === lbClose) return;
      lbZoomed = !lbZoomed;
      if (lbZoomed) setZoomOrigin(e);
      lbStage.classList.toggle('is-zoomed', lbZoomed);
    });
    lbStage.addEventListener('mousemove', function (e) {
      if (lbZoomed) setZoomOrigin(e);
    });
    lbStage.addEventListener('mouseleave', function () {
      if (!lbZoomed) return;
      lbZoomed = false;
      lbStage.classList.remove('is-zoomed');
    });
  }

  // --- Editorial Design: interactive PDF page-flip viewer. Runs only on a
  // project page inside /editorial/. PDF filenames are arbitrary (not a
  // fixed numbered pattern like the photos), so finding one needs a real
  // folder listing rather than the relative-probe trick used elsewhere —
  // one GitHub API call against that project's own folder. If a .pdf turns
  // up, pdf.js renders every page to an image and StPageFlip (vendored,
  // js/vendor/pageflip) turns those into a realistic paper mockup — cover
  // alone, spreads in the middle, back cover alone, its own aspect ratio
  // taken straight from the PDF's real page size. StPageFlip's own click/
  // drag handling is switched off (useMouseEvents:false); page-turning is
  // driven entirely by our own margin click-zones, arrows and swipe
  // handling so the book itself only ever responds to a click as "zoom in
  // on this page" — the two interactions can never fire off the same click. */
  (function () {
    var heroSection = document.querySelector('section.project-hero');
    if (!heroSection || !document.querySelector('.project-hero-panel')) return;
    var pathParts = location.pathname.split('/').filter(Boolean);
    if (pathParts.length && pathParts[pathParts.length - 1].indexOf('.html') !== -1) pathParts.pop();
    var pdfCategory = pathParts[pathParts.length - 2];
    var pdfSlug = pathParts[pathParts.length - 1];
    if (pdfCategory !== 'editorial' || !pdfSlug) return;

    var apiUrl = 'https://api.github.com/repos/' + GH_REPO + '/contents/' + pdfCategory + '/' + encodeURIComponent(pdfSlug) + '?ref=' + GH_BRANCH;
    fetch(apiUrl).then(function (res) {
      if (!res.ok) throw new Error('GitHub API ' + res.status);
      return res.json();
    }).then(function (entries) {
      var pdfEntry = entries.filter(function (e) { return e.type === 'file' && /\.pdf$/i.test(e.name); })[0];
      if (!pdfEntry) return;
      return Promise.all([loadPdfJs(), loadPageFlip()]).then(function (libs) {
        initPdfViewer(libs[0], libs[1], pdfEntry.download_url);
      });
    }).catch(function (err) {
      // Not necessarily worth logging — 404/network errors here are the
      // normal case for every project that simply has no PDF — but do
      // log anything past a plain "not found" so a genuine failure (e.g.
      // the vendored libraries failing to load) doesn't vanish silently.
      if (err && !/GitHub API 404/.test(err.message || '')) console.error('PDF viewer setup failed:', err);
    });

    // Both libraries are vendored locally (js/vendor/) rather than pulled
    // from a CDN — no runtime dependency on a third-party host. Resolved as
    // absolute URLs from main.js's own <script> tag so they work the same
    // regardless of how many folders deep the current page sits (project
    // pages are two levels under the site root).
    function vendorBase(sub) {
      var mainScript = document.querySelector('script[src*="js/main.js"]');
      return mainScript ? new URL('vendor/' + sub + '/', mainScript.src).href : 'js/vendor/' + sub + '/';
    }
    var pdfJsPromise = null;
    function loadPdfJs() {
      if (pdfJsPromise) return pdfJsPromise;
      var base = vendorBase('pdfjs');
      pdfJsPromise = import(base + 'pdf.min.mjs').then(function (pdfjsLib) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.mjs';
        return pdfjsLib;
      });
      return pdfJsPromise;
    }
    var pageFlipPromise = null;
    function loadPageFlip() {
      if (pageFlipPromise) return pageFlipPromise;
      pageFlipPromise = new Promise(function (resolve, reject) {
        if (window.St && window.St.PageFlip) { resolve(window.St.PageFlip); return; }
        var script = document.createElement('script');
        script.src = vendorBase('pageflip') + 'page-flip.browser.js';
        script.onload = function () { resolve(window.St.PageFlip); };
        script.onerror = reject;
        document.head.appendChild(script);
      });
      return pageFlipPromise;
    }

    function initPdfViewer(pdfjsLib, PageFlip, url) {
      // Guards against ever ending up with two stacked 100dvh sections —
      // each 100vh tall, each showing one small centered page with huge
      // empty space above/below it, and pushing everything after it
      // (including the footer) far down the page. Shouldn't normally be
      // possible (this only runs once per successful fetch), but iOS
      // Safari's aggressive back/forward cache can occasionally leave a
      // page's script state resumed in ways that re-trigger setup code;
      // cheap enough to guard against unconditionally.
      if (document.querySelector('.pdfv-section')) return;
      var section = document.createElement('section');
      section.className = 'section--flush pdfv-section';
      section.innerHTML =
        '<div class="pdfv">' +
          '<h2 class="pdfv__heading">' +
            '<span data-lang="de">Wirf einen Blick hinein!</span>' +
            '<span data-lang="en">Take a look!</span>' +
          '</h2>' +
          '<div class="pdfv__stage is-loading">' +
            '<div class="pdfv__zone pdfv__zone--prev" data-disabled="true"></div>' +
            '<div class="pdfv__zone pdfv__zone--next" data-disabled="true"></div>' +
            '<div class="pdfv__loader" aria-hidden="true"></div>' +
            '<div class="pdfv__book-wrap"><div class="pdfv__book-shift"><div class="pdfv__book"></div></div></div>' +
            '<div class="pdfv__arrow pdfv__arrow--prev"></div>' +
            '<div class="pdfv__arrow pdfv__arrow--next"></div>' +
          '</div>' +
          '<div class="pdfv__count"></div>' +
        '</div>';
      heroSection.insertAdjacentElement('afterend', section);

      var stageEl = section.querySelector('.pdfv__stage');
      var loaderEl = section.querySelector('.pdfv__loader');
      var zonePrev = section.querySelector('.pdfv__zone--prev');
      var zoneNext = section.querySelector('.pdfv__zone--next');
      var bookWrap = section.querySelector('.pdfv__book-wrap');
      var bookShift = section.querySelector('.pdfv__book-shift');
      var bookEl = section.querySelector('.pdfv__book');
      var arrowPrev = section.querySelector('.pdfv__arrow--prev');
      var arrowNext = section.querySelector('.pdfv__arrow--next');
      var countEl = section.querySelector('.pdfv__count');

      // StPageFlip sizes its internal canvas's drawing buffer 1:1 with its
      // CSS pixel size (no devicePixelRatio awareness of its own — the
      // library reads getComputedStyle(canvas).width straight into
      // canvas.width), so on any retina/high-DPI screen it was rendering
      // at half resolution or worse. Fix: give .pdfv__book itself a CSS
      // size dpr times larger than it should visually occupy (so its
      // canvas buffer actually has that many pixels), then scale it back
      // down by 1/dpr so it still displays at the right size — the
      // standard high-DPI canvas trick, just via a wrapping transform
      // since this library gives no direct hook into its canvas sizing.
      // Capped at 2 rather than the full devicePixelRatio (3 on most
      // current iPhones) — every dimension below is multiplied by dpr, so
      // going from 2 to 3 nearly doubles total canvas/image memory for a
      // barely-perceptible sharpness gain on a page-flip mockup, which on
      // a memory-constrained phone rendering every page at once (see
      // renderPageToImage below) risked silently exhausting memory and
      // tripping the catch-all below — the whole section just never
      // appearing, with nothing in the console to explain why.
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      bookEl.style.transformOrigin = 'top left';
      bookEl.style.transform = 'scale(' + (1 / dpr) + ')';

      var pageFlip = null, numPages = 0, isZoomed = false, currentShift = 0;
      function applyBookTransform() {
        bookShift.style.transform = 'translateX(' + currentShift + '%) scale(' + (isZoomed ? 2.1 : 1) + ')';
      }

      var pdfDoc = null;
      pdfjsLib.getDocument(url).promise.then(function (doc) {
        numPages = doc.numPages;
        pdfDoc = doc;
        // Only the cover (page 1) is rendered before the viewer appears —
        // rendering all of them up front (the previous approach) meant a
        // 24-page booklet stayed completely invisible until every single
        // page had been decoded, rasterised to a canvas and re-encoded as
        // a JPEG, which on a phone's CPU was slow enough to read as "does
        // this even work". The rest load in the background right below,
        // via StPageFlip's own updateFromImages once they're ready. A
        // page's pixel size is read from the PDF's own first page, so the
        // mockup's proportions always match the uploaded format instead
        // of a fixed ratio.
        return doc.getPage(1).then(function (firstPage) {
          var baseViewport = firstPage.getViewport({ scale: 1 });
          var pageAspect = baseViewport.width / baseViewport.height;
          return renderPageToImage(doc, 1).then(function (firstImage) {
            return { images: [firstImage], pageAspect: pageAspect };
          });
        });
      }).then(function (result) {
        sizeBook(result.pageAspect);
        // StPageFlip loads its cover through its own, separate Image
        // object (new Image(); img.src = dataUrl; draws once img.onload
        // fires) — a first attempt at this waited on a *different* Image
        // object of our own with the identical data: URL, betting that
        // the browser would reuse the already-decoded bitmap for it. On
        // at least one real device that bet was wrong: StPageFlip's own
        // image still had to decode independently, taking its own real
        // time, so the spinner still vanished well before anything was
        // actually drawn (StPageFlip has its own tiny built-in "not
        // loaded yet" placeholder — a plain white box with a grey border
        // — which is what was showing, easy to read as "just blank").
        // Removed that guess entirely: this instead patches window.Image
        // for the single synchronous instant it takes PageFlip's
        // constructor below to create its own Image object (every Page
        // does so synchronously, right in its own constructor), and
        // listens directly on *that* object's real load/error event —
        // the exact same signal StPageFlip itself waits on internally.
        // No color/pixel guessing, no cross-object caching assumptions.
        function watchLibraryImageLoad(timeoutMs) {
          return new Promise(function (resolve) {
            var settled = false;
            function settle() { if (!settled) { settled = true; resolve(); } }
            var OrigImage = window.Image;
            window.Image = function () {
              var img = new OrigImage();
              img.addEventListener('load', settle);
              img.addEventListener('error', settle);
              return img;
            };
            window.Image.prototype = OrigImage.prototype;
            setTimeout(function () { window.Image = OrigImage; }, 0);
            setTimeout(settle, timeoutMs);
          });
        }
        var imageReady = watchLibraryImageLoad(15000);
        pageFlip = new PageFlip(bookEl, {
          width: Math.round(800 * dpr),
          height: Math.round((800 / result.pageAspect) * dpr),
          size: 'stretch',
          // Bounds are in the same (dpr-inflated) CSS-pixel space as
          // .pdfv__book's own size now, since the library reads its block
          // size straight off the DOM — see the dpr comment above. Kept
          // small on purpose (was 260) — with usePortrait:false below this
          // no longer feeds the library's own single/spread decision, it's
          // only a floor against a literally-zero box, and a small value
          // avoids it fighting our own width via a "min-width" CSS rule
          // the library sets on .pdfv__book itself (double this value,
          // since usePortrait:false makes it use its "2x" multiplier).
          minWidth: Math.round(50 * dpr),
          maxWidth: Math.round(900 * dpr),
          minHeight: Math.round(50 * dpr),
          maxHeight: Math.round(1200 * dpr),
          autoSize: false,
          showCover: true,
          useMouseEvents: false,
          drawShadow: true,
          maxShadowOpacity: 0.5,
          flippingTime: 700,
          mobileScrollSupport: true,
          // StPageFlip decides for itself whether to show a single page or
          // a spread, based purely on .pdfv__book's own rendered width
          // (single-page mode below 2x its minWidth) — completely separate
          // from, and blind to, our own isSingle logic in updateUi() below
          // (which is driven by which PAGE is current: only the literal
          // cover/back-cover should ever be single). On a landscape phone
          // .pdfv__book's own width regularly fell under that internal
          // threshold, so the library silently rendered interior pages as
          // a single page too — visually, one page of what should've been
          // a spread, with the other half just blank. usePortrait:false
          // turns that whole internal decision off, leaving our own
          // isSingle as the one and only authority on single vs. spread.
          usePortrait: false
        });
        pageFlip.loadFromImages(result.images);
        pageFlip.on('flip', updateUi);
        pageFlip.on('init', updateUi);
        updateUi();
        return imageReady.then(function () {
          // Only remove the spinner once StPageFlip's own image has
          // actually loaded (see watchLibraryImageLoad above) — not before.
          if (loaderEl) loaderEl.remove();
          stageEl.classList.remove('is-loading');
          var resettle = function () { sizeBook(result.pageAspect); updateUi(); };
          // Only the cover image is loaded so far — the viewer is visible
          // and already navigable as soon as this first page has rendered,
          // instead of waiting for all of them. The rest render now, in
          // the background, and get swapped in via updateFromImages
          // (StPageFlip's own API for this — it preserves the current
          // page position) without disturbing anything the visitor's
          // already doing; zoneNext/arrowNext stay correctly disabled
          // until then since pageFlip's own getPageCount() is still just 1.
          var pages = [];
          for (var i = 2; i <= numPages; i++) pages.push(i);
          if (pages.length) {
            Promise.all(pages.map(function (n) { return renderPageToImage(pdfDoc, n); })).then(function (restImages) {
              pageFlip.updateFromImages(result.images.concat(restImages));
              updateUi();
            }).catch(function (err) {
              console.error('PDF viewer: failed to load remaining pages:', err);
            });
          }
          // .pdfv__stage now hugs the book's own size (see the CSS comment
          // on .pdfv__stage) instead of claiming a fixed chunk of the
          // viewport, so it can no longer double as "the available area"
          // for sizeBook to measure — that's circular (the book's size
          // would depend on a box whose own size depends on the book).
          // sizeBook uses visualViewport.height / window.innerHeight for
          // that instead (see its own comment). visualViewport's own
          // 'resize' event is the most reliable signal there is for
          // mobile Safari's collapsing address bar specifically — it's
          // what dvh itself is defined against — so that's the primary
          // trigger; window 'resize' covers real resizes/rotations on
          // everything else.
          window.addEventListener('resize', resettle);
          if (window.visualViewport) window.visualViewport.addEventListener('resize', resettle);
          // Real-device reports (book renders tiny on first paint, but
          // full size again as soon as the visitor navigates a page or
          // rotates) showed even that isn't fully reliable by itself on
          // iOS Safari — belt and braces: force one fresh re-measure
          // shortly after load regardless of whether anything reports
          // having changed, plus on the interactions most likely to
          // coincide with the browser settling the real viewport.
          ['scroll', 'orientationchange', 'touchend', 'pageshow'].forEach(function (evt) {
            window.addEventListener(evt, function once() {
              window.removeEventListener(evt, once);
              resettle();
            }, { passive: true });
          });
          setTimeout(resettle, 400);
          setTimeout(resettle, 1200);
          // Opt-in on-screen debug readout (?debug=1 in the URL) — no
          // WebKit/real-device testing is available in the environment
          // this was built in, so this turns the visitor's own phone into
          // the test rig: append ?debug=1 to a project URL with a PDF,
          // scroll to the viewer, and screenshot the numbers in both
          // orientations. Safe to leave in — invisible unless that query
          // param is present.
          if (/[?&]debug=1(&|$)/.test(location.search)) {
            var dbg = document.createElement('div');
            dbg.style.cssText = 'position:fixed;top:0;left:0;z-index:99999;background:rgba(0,0,0,0.85);' +
              'color:#7CFC7C;font:11px/1.5 monospace;padding:8px 10px;max-width:100vw;white-space:pre;pointer-events:none;';
            document.body.appendChild(dbg);
            var renderDbg = function () {
              var sRect = section.getBoundingClientRect();
              var wRect = bookWrap.getBoundingClientRect();
              var vv = window.visualViewport;
              dbg.textContent =
                'PDFV DEBUG\n' +
                'window.innerWidth/Height: ' + window.innerWidth + ' / ' + window.innerHeight + '\n' +
                'visualViewport w/h: ' + (vv ? Math.round(vv.width) + ' / ' + Math.round(vv.height) : 'n/a') + '\n' +
                'section rect w/h: ' + Math.round(sRect.width) + ' / ' + Math.round(sRect.height) + '\n' +
                'bookWrap rect w/h: ' + Math.round(wRect.width) + ' / ' + Math.round(wRect.height) + '\n' +
                'frameW/frameH: ' + Math.round(frameW) + ' / ' + Math.round(frameH) + '\n' +
                'devicePixelRatio raw/capped: ' + (window.devicePixelRatio || 1) + ' / ' + dpr + '\n' +
                'orientation: ' + (pageFlip ? pageFlip.getOrientation() : 'n/a') + '\n' +
                'scrollY: ' + Math.round(window.scrollY) + '\n' +
                'docScrollHeight: ' + document.documentElement.scrollHeight;
            };
            renderDbg();
            if (window.ResizeObserver) new ResizeObserver(renderDbg).observe(section);
            window.addEventListener('resize', renderDbg);
            window.addEventListener('scroll', renderDbg, { passive: true });
            if (window.visualViewport) window.visualViewport.addEventListener('resize', renderDbg);
            setInterval(renderDbg, 500);
          }
        });
      }).catch(function (err) {
        console.error('PDF viewer failed to initialize:', err);
        section.remove();
      }); // unreadable PDF, or the render pipeline ran out of memory — don't leave a broken tile

      function renderPageToImage(doc, n) {
        return doc.getPage(n).then(function (page) {
          var baseViewport = page.getViewport({ scale: 1 });
          // The book itself never displays wider than ~900px (maxWidth
          // above) even on desktop, so 1400 (2800 actual px at dpr 2) was
          // rendering roughly 3x more pixels than the page ever shows —
          // most of the per-page cost (decode + canvas paint + JPEG
          // encode) for no visible sharpness gain. 1000 (2000px at dpr 2)
          // still comfortably covers it with margin.
          var targetWidth = 1000 * dpr;
          var viewport = page.getViewport({ scale: targetWidth / baseViewport.width });
          var canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          return page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise.then(function () {
            return canvas.toDataURL('image/jpeg', 0.88);
          });
        });
      }

      // .pdfv__book (StPageFlip's own mount) always stays sized for a full
      // two-page spread — that's what its internal page-pairing math
      // needs — regardless of whether a single page or a spread is
      // currently showing. frameW/frameH are kept around so updateUi can
      // size the *visible* window onto it (.pdfv__book-wrap) separately.
      var frameW = 0, frameH = 0;
      function sizeBook(pageAspect) {
        // Width comes from the section's own rendered box — safe to
        // measure directly, width isn't affected by mobile Safari's
        // address bar. Height can't be measured the same way anymore:
        // .pdfv-section and .pdfv__stage both now hug their own content
        // (see their CSS) rather than claiming a fixed slice of the
        // screen, so there's no longer an independent box to read a
        // height off of — the book's size would depend on a box whose own
        // size depends on the book. visualViewport.height is the
        // intentional stand-in: it's the one API purpose-built to track
        // exactly what dvh tracks (the collapsing address bar), so it's
        // right at least as often as reading a dvh-sized box would've
        // been, and its own 'resize' event plus the interaction-based
        // resettle listeners below correct anything it gets wrong at the
        // moment this first runs.
        var rect = section.getBoundingClientRect();
        var vh = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
        var maxW = rect.width * 0.86, maxH = vh * 0.72;
        frameW = Math.min(maxW, maxH * 2 * pageAspect);
        frameH = frameW / (2 * pageAspect);
        // bookShift is sized in real (on-screen) CSS pixels — everything
        // else (.pdfv__book-wrap clipping, the shift/zoom transform) keys
        // off this, same as before. .pdfv__book itself is dpr times
        // bigger and scaled back down (see the dpr comment above), so it
        // always displays at exactly this size too, just at full
        // resolution underneath.
        bookShift.style.width = frameW + 'px';
        bookShift.style.height = frameH + 'px';
        bookEl.style.width = (frameW * dpr) + 'px';
        bookEl.style.height = (frameH * dpr) + 'px';
      }

      function updateUi() {
        var current = pageFlip.getCurrentPageIndex();
        var last = pageFlip.getPageCount() - 1;
        zonePrev.setAttribute('data-disabled', current <= 0 ? 'true' : 'false');
        zoneNext.setAttribute('data-disabled', current >= last ? 'true' : 'false');
        arrowPrev.style.display = current <= 0 ? 'none' : '';
        arrowNext.style.display = current >= last ? 'none' : '';
        var orientation = pageFlip.getOrientation();
        var label;
        if (orientation === 'landscape' && current > 0 && current < last) {
          // Two pages are on screen together in a spread — figure out
          // which pair from the current (left-hand, even) page index.
          var left = current % 2 === 1 ? current : current - 1;
          label = (left + 1) + '–' + (left + 2);
        } else {
          label = String(current + 1);
        }
        countEl.textContent = label + ' / ' + numPages;

        // A single page (cover or back cover) always renders into one
        // specific half of the fixed spread-width frame — the cover into
        // the right half, the back cover into the left half (StPageFlip's
        // own convention: a lone recto page, then a lone verso page).
        // Shrinking the visible window to that one half — instead of just
        // repositioning the full frame — hides the empty other half
        // completely rather than leaving it sitting there unused; shifting
        // .pdfv__book by the same amount brings the occupied half inside
        // that window. The window shrinking is itself what keeps it
        // centered (flex parent), no separate centering math needed.
        var isSingle = current === 0 || (current === last && current !== 0);
        bookWrap.style.width = (isSingle ? frameW / 2 : frameW) + 'px';
        bookWrap.style.height = frameH + 'px';
        currentShift = current === 0 ? -50 : 0;
        applyBookTransform();
      }

      function turn(dir) {
        if (!pageFlip || isZoomed) return;
        if (dir > 0) pageFlip.flipNext(); else pageFlip.flipPrev();
      }
      zonePrev.addEventListener('click', function () { turn(-1); });
      zoneNext.addEventListener('click', function () { turn(1); });

      function setZoomOrigin(e) {
        // Origin is computed against .pdfv__book-wrap (the visible,
        // clipped window), not .pdfv__book-shift itself — that keeps its
        // full spread-width box even on a single page, so using its own
        // rect would measure against width that's half off-screen. The
        // zoom scale itself lives on .pdfv__book-shift (see
        // applyBookTransform), so that's what the origin has to be set on.
        var rect = bookWrap.getBoundingClientRect();
        bookShift.style.transformOrigin =
          (((e.clientX - rect.left) / rect.width) * 100) + '% ' + (((e.clientY - rect.top) / rect.height) * 100) + '%';
      }
      bookEl.addEventListener('click', function (e) {
        e.stopPropagation();
        isZoomed = !isZoomed;
        if (isZoomed) setZoomOrigin(e);
        bookShift.classList.toggle('is-zoomed', isZoomed);
        applyBookTransform();
      });
      bookEl.addEventListener('mousemove', function (e) { if (isZoomed) setZoomOrigin(e); });
      bookEl.addEventListener('mouseleave', function () {
        if (!isZoomed) return;
        isZoomed = false;
        bookShift.classList.remove('is-zoomed');
        applyBookTransform();
      });

      // Trackpad / Magic Mouse horizontal swipe — one clear horizontal
      // gesture turns to the next/previous view, then a short cooldown
      // ignores the rest of that same swipe instead of rifling through
      // several spreads at once.
      var wheelCooldown = false;
      section.addEventListener('wheel', function (e) {
        if (Math.abs(e.deltaX) < 24 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();
        if (wheelCooldown) return;
        wheelCooldown = true;
        turn(e.deltaX > 0 ? 1 : -1);
        setTimeout(function () { wheelCooldown = false; }, 700);
      }, { passive: false });

      var touchStartX = null;
      section.addEventListener('touchstart', function (e) { touchStartX = e.touches[0].clientX; }, { passive: true });
      section.addEventListener('touchend', function (e) {
        if (touchStartX == null) return;
        var dx = e.changedTouches[0].clientX - touchStartX;
        touchStartX = null;
        if (Math.abs(dx) > 50) turn(dx < 0 ? 1 : -1);
      }, { passive: true });
    }
  })();

  // --- Category cover photos: fade in + rise slightly once about half of
  // their tile has scrolled into view, then hold at that position — not
  // a one-off reveal, it un-reveals again once the tile leaves the
  // viewport (isIntersecting false), so scrolling away and back replays
  // the same fade+rise each time, rather than only ever once per page
  // load. Homepage only (#categories) — the hero tile plays no part in
  // this, it isn't inside #categories at all. ---
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var obj = entry.target.querySelector('.tile__object');
        if (obj) obj.classList.toggle('is-revealed', entry.isIntersecting);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('#categories .tile__media').forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    document.querySelectorAll('.tile__object').forEach(function (el) {
      el.classList.add('is-revealed');
    });
  }

  // --- Service tile's chair blueprint: draws itself once, the first time
  // it scrolls into view (unlike the photo fade above, it doesn't replay
  // on every re-entry — a several-second multi-stage draw-in is a once-off
  // flourish, not something that should re-run every time you scroll past
  // it again). ---
  var sketchEl = document.querySelector('.tile__sketch');
  if (sketchEl) {
    if ('IntersectionObserver' in window) {
      var sketchObserver = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            sketchEl.classList.add('is-drawn');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      sketchObserver.observe(sketchEl);
    } else {
      sketchEl.classList.add('is-drawn');
    }
  }

  // --- Mobile: nav bar slides away on scroll-down, back on scroll-up ---
  (function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var nav = document.querySelector('.nav');
    if (!nav) return;
    var navHeroOverlay = document.querySelector('.project-hero__overlay');
    var lastY = window.scrollY;
    var navTicking = false;
    function updateNavVisibility() {
      var isMobile = window.matchMedia('(max-width: 760px)').matches;
      var menuOpen = menuPanel && menuPanel.classList.contains('is-open');
      var y = window.scrollY;
      var hide = isMobile && !menuOpen && y > lastY && y > 80;
      var show = !isMobile || menuOpen || y < lastY;
      if (hide) {
        nav.classList.add('is-hidden');
      } else if (show) {
        nav.classList.remove('is-hidden');
      }
      // Docked project/category title lives visually inside the nav bar
      // once scrolled — hide/show it in the exact same frame as the nav
      // itself so the two never drift out of sync.
      if (navHeroOverlay) navHeroOverlay.classList.toggle('is-nav-hidden', hide);
      lastY = y;
      navTicking = false;
    }
    window.addEventListener('scroll', function () {
      if (!navTicking) {
        window.requestAnimationFrame(updateNavVisibility);
        navTicking = true;
      }
    }, { passive: true });
  })();

  // --- Scroll parallax: tile captions, hero zoom ---
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var parallaxEls = document.querySelectorAll('.tile__caption');
  var heroContent = document.querySelector('.hero-tile__content');
  var heroTile = document.querySelector('.hero-tile');

  // --- Stack pages (About/Awards): arm scroll-snap only for the
  // About→Awards "cover" transition, disarm it once Awards is reached, so
  // that transition still auto-completes on a partial scroll while the
  // rest of the page (Awards→footer) scrolls naturally, same as anywhere
  // else. See the CSS comment above .stack__panel for why a single static
  // scroll-snap-type can't give both behaviours at once. ---
  (function () {
    var stackEl = document.querySelector('.stack');
    if (!stackEl) return;
    var firstPanel = stackEl.querySelector(':scope > .stack__panel');
    if (!firstPanel) return;
    var armedThreshold = 0;
    function measureThreshold() { armedThreshold = firstPanel.offsetHeight; }
    measureThreshold();
    window.addEventListener('resize', measureThreshold);
    var snapTicking = false;
    function updateStackSnap() {
      var armed = window.scrollY < armedThreshold - 2;
      document.documentElement.style.scrollSnapType = armed ? 'y mandatory' : '';
      snapTicking = false;
    }
    window.addEventListener('scroll', function () {
      if (!snapTicking) {
        window.requestAnimationFrame(updateStackSnap);
        snapTicking = true;
      }
    }, { passive: true });
    updateStackSnap();

    var scrollCueBtn = document.getElementById('scrollCueBtn');
    if (scrollCueBtn) {
      scrollCueBtn.addEventListener('click', function () {
        window.scrollTo({ top: firstPanel.offsetHeight, behavior: 'smooth' });
      });
    }
    var scrollCueBtnUp = document.getElementById('scrollCueBtnUp');
    if (scrollCueBtnUp) {
      scrollCueBtnUp.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  })();
  var projectHero = document.querySelector('.project-hero__overlay');
  var projectHeroNav = document.querySelector('.nav__mark');
  // Distance over which the big overlay title docks into the nav bar — a
  // fixed value (not tied to the title's own height) so the motion feels
  // the same regardless of how long the title text is. Deliberately short
  // (rather than the old 200px): below this, the title sits in a single
  // static docked state the whole time you're scrolling the rest of the
  // page (see is-docked-static below) — scrolling up from deep in the
  // page doesn't grow it back until you're nearly at the very top.
  var PROJECT_DOCK_RANGE = 120;
  var projectHeroNatural = null;
  var projectHeroDock = null;
  var projectHeroTitleEl = projectHero ? projectHero.querySelector('.project-hero__title') : null;
  // Once fully docked, the title is switched to position:fixed at the
  // exact on-screen spot the live transform would otherwise keep
  // recomputing every frame to hold it at — mathematically identical
  // (verified below), but static, so it stops touching the DOM for
  // the entire rest of the scroll range instead of updating (and
  // fighting the compositor's own smooth native scroll) on every frame.
  // That per-frame churn while "parked" was the remaining source of the
  // reported jitter even after the docking math itself was correct.
  var projectHeroDockedStatic = null;
  function measureProjectHero() {
    if (!projectHero || !projectHeroTitleEl) return;
    var prevTransform = projectHeroTitleEl.style.transform;
    projectHeroTitleEl.style.position = '';
    projectHeroTitleEl.style.top = '';
    projectHeroTitleEl.style.left = '';
    projectHeroTitleEl.style.transform = 'none';
    projectHeroDockedStatic = null;
    // Measured on the title element itself, not the padded wrapper around
    // it — the wrapper's padding-top is what pushes the big title down
    // from the very top of the section, but transforming the wrapper
    // would scale that padding too, leaving the title's rendered position
    // offset from the docked target by (padding * scale) instead of
    // landing exactly on it. Transforming the title directly sidesteps
    // that entirely: its own top-left is the only thing that has to line
    // up with the docked target.
    var rect = projectHeroTitleEl.getBoundingClientRect();
    projectHeroNatural = {
      // Stored as document-relative (rect.top is viewport-relative at the
      // current scroll position) so it stays valid no matter when/where
      // we're scrolled to when this runs. left doesn't need the same
      // scrollY correction — horizontal scroll position never changes.
      top: rect.top + window.scrollY,
      left: rect.left,
      height: rect.height,
      fontSize: parseFloat(getComputedStyle(projectHeroTitleEl).fontSize)
    };
    projectHeroTitleEl.style.transform = prevTransform;
    // Docked target is measured once here (and again on resize/nav-hide
    // toggle) rather than every scroll frame — .nav__mark only actually
    // moves on resize or during the mobile show/hide transition (handled
    // separately via the .is-nav-hidden CSS transition), so re-reading
    // its rect on every single scroll tick was pure wasted layout work
    // and the main source of scroll lag on mobile.
    if (projectHeroNav) {
      var navRect = projectHeroNav.getBoundingClientRect();
      var navFontPx = parseFloat(getComputedStyle(projectHeroNav).fontSize) || 24;
      var targetFontPx = navFontPx * 2;
      var minScale = Math.min(1, targetFontPx / projectHeroNatural.fontSize);
      // Desktop docks to the right of the nav name instead of the title's
      // own natural left gutter, which would otherwise land both at the
      // same x position and read as overlapping/smashed-together text.
      // Mobile can't do the same thing — .nav__mark wraps to two shorter
      // lines there and the lang toggle/menu button sit much closer in,
      // so the same fixed offset runs straight into them — so instead it
      // docks in the clear band directly below the whole nav row (not
      // beside the name at all), using --nav-h as the row's real height
      // rather than nav__mark's own (shorter) box. That clear separation
      // is what actually matters: nav's own show/hide is driven by scroll
      // direction while the title's dock/undock is driven by scroll
      // position, so they can briefly disagree (e.g. a small scroll-up
      // deep in the page re-shows nav immediately but doesn't undock the
      // title) — docking beside the name meant that disagreement showed
      // up as the title sitting right on top of it.
      var isDesktop = window.matchMedia('(min-width: 761px)').matches;
      var navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 92;
      projectHeroDock = {
        // Top edges of both text boxes flush, not vertically centred.
        top: isDesktop ? navRect.top : navH + 12,
        left: isDesktop ? navRect.right + 24 : projectHeroNatural.left,
        scale: minScale
      };
    }
  }
  if (projectHero) {
    measureProjectHero();
    // Mobile browsers fire 'resize' while their address bar collapses/
    // expands during an ordinary scroll (most reliably scrolling back up,
    // when it re-expands) — that only changes window.innerHeight, never
    // innerWidth. Re-measuring on every one of those mid-scroll re-reads
    // the title's own rect and momentarily strips its transform (see
    // measureProjectHero above), fighting the same frame's scroll-driven
    // transform update and reading as the docked title jittering. An
    // actual orientation change or real viewport resize always changes
    // the width too, so gating on that keeps the genuine cases covered.
    var lastInnerWidth = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastInnerWidth) return;
      lastInnerWidth = window.innerWidth;
      measureProjectHero();
    });
    // Exposed for js/project.js (the /404.html fallback template): its
    // title starts empty and is filled in slightly after this script
    // already ran, so it needs to trigger a re-measurement once the real
    // title text (and therefore the element's real size) is in place.
    window.__remeasureProjectHero = measureProjectHero;
  }

  // Only tile captions actually near the viewport are tracked here — on a
  // category page with a couple dozen tiles, reading getBoundingClientRect
  // for every single one of them on every scroll frame (most of them
  // nowhere near the screen) was slow enough to overrun the frame budget
  // during scroll, and since the docking title's own transform update
  // below runs in this same rAF callback, that slowdown showed up as the
  // title stuttering/jittering while scrolling, not just the captions.
  var activeParallaxEls = [];
  if (parallaxEls.length) {
    if ('IntersectionObserver' in window) {
      var parallaxObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var idx = activeParallaxEls.indexOf(entry.target);
          if (entry.isIntersecting) {
            if (idx === -1) activeParallaxEls.push(entry.target);
          } else if (idx !== -1) {
            activeParallaxEls.splice(idx, 1);
          }
        });
      }, { rootMargin: '50% 0px 50% 0px' });
      parallaxEls.forEach(function (el) { parallaxObserver.observe(el); });
    } else {
      activeParallaxEls = Array.prototype.slice.call(parallaxEls);
    }
  }

  if (!reduceMotion && (parallaxEls.length || heroContent || projectHero)) {
    // A persistent rAF loop, not 'scroll'-event-triggered — on mobile,
    // 'scroll' events during momentum/inertial scrolling can fire less
    // often than the browser actually paints, so a handler gated on them
    // recalculates late and the JS-driven transform visibly steps/lags
    // behind the rest of the page, which scrolls smoothly via the
    // compositor regardless. Reading scrollY fresh on every rendered
    // frame instead keeps this in lockstep with native scrolling — this
    // was the real source of the docking title "jittering", worse on
    // scroll-up because that's usually the faster momentum phase.
    function updateParallax() {
      var vh = window.innerHeight;
      activeParallaxEls.forEach(function (el) {
        var rect = el.parentElement.getBoundingClientRect();
        var center = rect.top + rect.height / 2;
        var offset = (center - vh / 2) / vh; // -0.5 .. 0.5 roughly
        var px = Math.max(-16, Math.min(16, offset * 26));
        el.style.transform = 'translateY(' + px.toFixed(1) + 'px)';
      });
      if (heroContent && heroTile) {
        var heroHeight = heroTile.offsetHeight || vh;
        var progress = Math.max(0, Math.min(1, window.scrollY / heroHeight));
        var scale = 1 - progress * 0.14;
        heroContent.style.transform = 'scale(' + scale.toFixed(3) + ')';
      }
      if (projectHero && projectHeroNatural && projectHeroDock) {
        if (window.scrollY >= PROJECT_DOCK_RANGE) {
          // Fully docked and staying that way for the entire rest of the
          // scroll range below — park it as position:fixed at exactly
          // where the live transform (dockProgress === 1 case, below)
          // would otherwise keep landing it every single frame: dock.top/
          // left directly, scale(dock.scale), no translateY/scrollY term
          // needed at all since position:fixed already tracks the
          // viewport on its own. Written once per docked "session"
          // (guarded on the flag), not every frame.
          if (projectHeroDockedStatic !== true) {
            projectHeroTitleEl.style.position = 'fixed';
            projectHeroTitleEl.style.top = projectHeroDock.top.toFixed(1) + 'px';
            projectHeroTitleEl.style.left = projectHeroDock.left.toFixed(1) + 'px';
            projectHeroTitleEl.style.transform = 'scale(' + projectHeroDock.scale.toFixed(3) + ')';
            projectHeroDockedStatic = true;
          }
        } else {
          if (projectHeroDockedStatic !== false) {
            projectHeroTitleEl.style.position = '';
            projectHeroTitleEl.style.top = '';
            projectHeroTitleEl.style.left = '';
            projectHeroDockedStatic = false;
          }
          var dockProgress = Math.max(0, Math.min(1, window.scrollY / PROJECT_DOCK_RANGE));
          // Kept position:static (normal flow) the whole time this branch
          // runs — this transform both slides/shrinks it toward the
          // docked spot AND cancels the element's own natural scroll-away
          // drift as it approaches fully docked (translateY grows 1:1
          // with scrollY), which is what makes the handoff to the fixed
          // branch above seamless at dockProgress === 1. translateX has
          // no such drift to cancel (the page never scrolls horizontally)
          // — it just slides left→right toward the docked spot, same as
          // translateY does top→bottom.
          var translateX = dockProgress * (projectHeroDock.left - projectHeroNatural.left);
          var translateY = dockProgress * (projectHeroDock.top - projectHeroNatural.top) + window.scrollY;
          var scale = 1 - dockProgress * (1 - projectHeroDock.scale);
          projectHeroTitleEl.style.transform = 'translate(' + translateX.toFixed(1) + 'px, ' + translateY.toFixed(1) + 'px) scale(' + scale.toFixed(3) + ')';
        }
      }
      window.requestAnimationFrame(updateParallax);
    }
    updateParallax();
  }
});
