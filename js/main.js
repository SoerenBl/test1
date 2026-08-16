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

  if (menuBtn) menuBtn.addEventListener('click', openMenu);
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
      // A single leftover photo spans full width — otherwise it would sit
      // alone in one column, leaving the other half of that row blank.
      if (resolved.length === 1) {
        grid.innerHTML = '<div class="tile tile--full"><div class="tile__media"><img src="' + resolved[0].url + '" alt=""></div></div>';
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
      lbMedia.appendChild(media.cloneNode(true));
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
    }).catch(function () { /* no PDF in this project's folder, or offline — leave the page as-is */ });

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
      var section = document.createElement('section');
      section.className = 'section--flush pdfv-section';
      section.innerHTML =
        '<div class="pdfv">' +
          '<div class="pdfv__zone pdfv__zone--prev" data-disabled="true"></div>' +
          '<div class="pdfv__zone pdfv__zone--next" data-disabled="true"></div>' +
          '<div class="pdfv__book-wrap"><div class="pdfv__book"></div></div>' +
          '<div class="pdfv__arrow pdfv__arrow--prev"></div>' +
          '<div class="pdfv__arrow pdfv__arrow--next"></div>' +
          '<div class="pdfv__count"></div>' +
        '</div>';
      heroSection.insertAdjacentElement('afterend', section);

      var zonePrev = section.querySelector('.pdfv__zone--prev');
      var zoneNext = section.querySelector('.pdfv__zone--next');
      var bookWrap = section.querySelector('.pdfv__book-wrap');
      var bookEl = section.querySelector('.pdfv__book');
      var arrowPrev = section.querySelector('.pdfv__arrow--prev');
      var arrowNext = section.querySelector('.pdfv__arrow--next');
      var countEl = section.querySelector('.pdfv__count');

      var pageFlip = null, numPages = 0, isZoomed = false, currentShift = 0;
      function applyBookTransform() {
        bookEl.style.transform = 'translateX(' + currentShift + '%) scale(' + (isZoomed ? 2.1 : 1) + ')';
      }

      pdfjsLib.getDocument(url).promise.then(function (doc) {
        numPages = doc.numPages;
        // Render every page once, up front, to its own image — StPageFlip
        // draws pages from plain image URLs, not from a PDF renderer of
        // its own. A page's pixel size is read from the PDF's own first
        // page, so the mockup's proportions always match the uploaded
        // format instead of a fixed ratio.
        var pages = [];
        for (var i = 1; i <= doc.numPages; i++) pages.push(i);
        return doc.getPage(1).then(function (firstPage) {
          var baseViewport = firstPage.getViewport({ scale: 1 });
          var pageAspect = baseViewport.width / baseViewport.height;
          return Promise.all(pages.map(function (n) { return renderPageToImage(doc, n); })).then(function (images) {
            return { images: images, pageAspect: pageAspect };
          });
        });
      }).then(function (result) {
        sizeBook(result.pageAspect);
        pageFlip = new PageFlip(bookEl, {
          width: 800,
          height: Math.round(800 / result.pageAspect),
          size: 'stretch',
          minWidth: 260,
          maxWidth: 900,
          minHeight: 260,
          maxHeight: 1200,
          autoSize: false,
          showCover: true,
          useMouseEvents: false,
          drawShadow: true,
          maxShadowOpacity: 0.5,
          flippingTime: 700,
          mobileScrollSupport: true
        });
        pageFlip.loadFromImages(result.images);
        pageFlip.on('flip', updateUi);
        pageFlip.on('init', updateUi);
        updateUi();
        window.addEventListener('resize', function () { sizeBook(result.pageAspect); updateUi(); });
      }).catch(function () { section.remove(); }); // unreadable PDF — don't leave a broken tile

      function renderPageToImage(doc, n) {
        return doc.getPage(n).then(function (page) {
          var baseViewport = page.getViewport({ scale: 1 });
          var targetWidth = 1100 * (window.devicePixelRatio || 1);
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
        var maxW = window.innerWidth * 0.86, maxH = window.innerHeight * 0.82;
        frameW = Math.min(maxW, maxH * 2 * pageAspect);
        frameH = frameW / (2 * pageAspect);
        bookEl.style.width = frameW + 'px';
        bookEl.style.height = frameH + 'px';
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
        // clipped window), not .pdfv__book itself — .pdfv__book keeps its
        // full spread-width box even on a single page, so using its own
        // rect would measure against width that's half off-screen.
        var rect = bookWrap.getBoundingClientRect();
        bookEl.style.transformOrigin =
          (((e.clientX - rect.left) / rect.width) * 100) + '% ' + (((e.clientY - rect.top) / rect.height) * 100) + '%';
      }
      bookEl.addEventListener('click', function (e) {
        e.stopPropagation();
        isZoomed = !isZoomed;
        if (isZoomed) setZoomOrigin(e);
        bookEl.classList.toggle('is-zoomed', isZoomed);
        applyBookTransform();
      });
      bookEl.addEventListener('mousemove', function (e) { if (isZoomed) setZoomOrigin(e); });
      bookEl.addEventListener('mouseleave', function () {
        if (!isZoomed) return;
        isZoomed = false;
        bookEl.classList.remove('is-zoomed');
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
  })();
  var projectHero = document.querySelector('.project-hero__overlay');
  var projectHeroNav = document.querySelector('.nav__mark');
  // Distance over which the big overlay title docks into the nav bar — a
  // fixed value (not tied to the title's own height) so the motion feels
  // the same regardless of how long the title text is.
  var PROJECT_DOCK_RANGE = 200;
  var projectHeroNatural = null;
  var projectHeroDock = null;
  var projectHeroTitleEl = projectHero ? projectHero.querySelector('.project-hero__title') : null;
  function measureProjectHero() {
    if (!projectHero || !projectHeroTitleEl) return;
    var prevTransform = projectHeroTitleEl.style.transform;
    projectHeroTitleEl.style.transform = 'none';
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
      // Desktop only: docks to the right of the nav name instead of the
      // title's own natural left gutter, which would otherwise land both
      // at the same x position and read as overlapping/smashed-together
      // text. Mobile is deferred to a separate pass — .nav__mark wraps to
      // two shorter lines there and the lang toggle/menu button sit much
      // closer in, so the same fixed offset runs straight into them
      // instead; natural-left keeps mobile at its prior (already known,
      // not-yet-addressed) behaviour rather than trading one overlap for
      // a worse one against the actually-clickable menu button.
      var isDesktop = window.matchMedia('(min-width: 761px)').matches;
      projectHeroDock = {
        // Top edges of both text boxes flush, not vertically centred.
        top: navRect.top,
        left: isDesktop ? navRect.right + 24 : projectHeroNatural.left,
        scale: minScale
      };
    }
  }
  if (projectHero) {
    measureProjectHero();
    window.addEventListener('resize', measureProjectHero);
    // Exposed for js/project.js (the /404.html fallback template): its
    // title starts empty and is filled in slightly after this script
    // already ran, so it needs to trigger a re-measurement once the real
    // title text (and therefore the element's real size) is in place.
    window.__remeasureProjectHero = measureProjectHero;
  }

  if (!reduceMotion && (parallaxEls.length || heroContent || projectHero)) {
    var ticking = false;
    function updateParallax() {
      var vh = window.innerHeight;
      parallaxEls.forEach(function (el) {
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
        var dockProgress = Math.max(0, Math.min(1, window.scrollY / PROJECT_DOCK_RANGE));
        // Kept position:absolute the whole time (see CSS) — this transform
        // both slides/shrinks it toward the docked spot AND cancels the
        // element's own natural scroll-away drift once fully docked
        // (translateY grows 1:1 with scrollY beyond that point), which is
        // what makes it read as "pinned in the nav" without ever switching
        // position modes. translateX has no such drift to cancel (the page
        // never scrolls horizontally) — it just slides left→right toward
        // the docked spot, same as translateY does top→bottom.
        var translateX = dockProgress * (projectHeroDock.left - projectHeroNatural.left);
        var translateY = dockProgress * (projectHeroDock.top - projectHeroNatural.top) + window.scrollY;
        var scale = 1 - dockProgress * (1 - projectHeroDock.scale);
        projectHeroTitleEl.style.transform = 'translate(' + translateX.toFixed(1) + 'px, ' + translateY.toFixed(1) + 'px) scale(' + scale.toFixed(3) + ')';
      }
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateParallax();
  }
});
