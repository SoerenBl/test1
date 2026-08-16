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
  function probeGallerySequence(base, maxSlots) {
    var results = [];
    var consecutiveMisses = 0;
    var nextIndex = 1;
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

  var galleryGrids = document.querySelectorAll('.tile-grid--projects[data-fixed-layout]');
  galleryGrids.forEach(function (grid) {
    var base = grid.getAttribute('data-photo-path') || '';
    probeGallerySequence(base, MAX_GALLERY_PHOTOS).then(function (results) {
      var found = results.filter(function (url) { return url; });
      if (!found.length) {
        grid.innerHTML =
          '<div class="tile tile--full"><div class="tile__media"><div class="ph">' +
          '<span data-lang="de">Fotos folgen in Kürze</span><span data-lang="en">Photos coming soon</span>' +
          '</div></div></div>';
        grid.style.setProperty('--rows', 1);
        return;
      }
      var normalCount = found.length - 1;
      var html = '';
      found.forEach(function (url, idx) {
        var isLastOdd = idx > 0 && idx === found.length - 1 && normalCount % 2 === 1;
        var full = (idx === 0 || isLastOdd) ? ' tile--full' : '';
        html += '<div class="tile' + full + '"><div class="tile__media"><img src="' + url + '" alt=""></div></div>';
      });
      grid.innerHTML = html;
      grid.style.setProperty('--rows', 1 + Math.ceil(normalCount / 2));
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

  // --- Cutout objects: fade in like a soft cloud once ~1/3 of their
  // tile has scrolled into view, instead of being visible immediately. ---
  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var obj = entry.target.querySelector('.tile__object');
        if (obj) obj.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.33 });
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

  // --- Scroll parallax: tile captions, hero zoom, cutout product images ---
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var parallaxEls = document.querySelectorAll('.tile__caption');
  var objectEls = document.querySelectorAll('.tile__object');
  var heroContent = document.querySelector('.hero-tile__content');
  var heroTile = document.querySelector('.hero-tile');
  var exitPanel = document.querySelector('.stack__panel--exit');
  var exitBg = exitPanel ? exitPanel.querySelector('.stack__bg') : null;
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
      // we're scrolled to when this runs.
      top: rect.top + window.scrollY,
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
      projectHeroDock = {
        // Top edges of both text boxes flush, not vertically centred.
        top: navRect.top,
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

  if (!reduceMotion && (parallaxEls.length || objectEls.length || heroContent || exitBg || projectHero)) {
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
      objectEls.forEach(function (el) {
        var rect = el.parentElement.getBoundingClientRect();
        var center = rect.top + rect.height / 2;
        var offset = (center - vh / 2) / vh;
        // Range scales with the tile's own height, so a tall tile (e.g.
        // tile--tall) drifts proportionally more than a normal one instead
        // of the same fixed pixel range looking smaller inside it. The
        // 1.45 multiplier keeps the same saturation point as before
        // (full range only near the edges of the tile's transit) so the
        // motion still reads as continuous rather than snapping to max.
        var range = rect.height * 0.16;
        var px = Math.max(-range, Math.min(range, offset * range * 1.45));
        el.style.transform = 'translate(-50%, calc(-50% + ' + px.toFixed(1) + 'px))';
      });
      if (heroContent && heroTile) {
        var heroHeight = heroTile.offsetHeight || vh;
        var progress = Math.max(0, Math.min(1, window.scrollY / heroHeight));
        var scale = 1 - progress * 0.14;
        heroContent.style.transform = 'scale(' + scale.toFixed(3) + ')';
      }
      if (exitBg) {
        // A sticky element's "stuck" duration comes from how much normal-
        // flow content follows it, not from its own height — so the exit
        // window here is exactly the height of the invisible spacer that
        // follows this panel (see .stack__exit-spacer), not the panel's
        // own height. During that window only the background is nudged
        // upward — the title/text sit in a separate sibling we never
        // touch, so they stay exactly in place until the panel finally
        // releases and the footer takes over.
        var exitPanelTop = 0;
        var sib = exitPanel.previousElementSibling;
        while (sib) {
          if (sib.classList.contains('stack__panel')) exitPanelTop += sib.offsetHeight;
          sib = sib.previousElementSibling;
        }
        var spacer = exitPanel.nextElementSibling;
        var exitRange = spacer ? spacer.offsetHeight : 0;
        var exitProgress = exitRange > 0
          ? Math.max(0, Math.min(1, (window.scrollY - exitPanelTop) / exitRange))
          : 0;
        exitBg.style.transform = 'translateY(' + (-exitProgress * 100).toFixed(2) + '%)';
      }
      if (projectHero && projectHeroNatural && projectHeroDock) {
        var dockProgress = Math.max(0, Math.min(1, window.scrollY / PROJECT_DOCK_RANGE));
        // Kept position:absolute the whole time (see CSS) — this transform
        // both slides/shrinks it toward the docked spot AND cancels the
        // element's own natural scroll-away drift once fully docked
        // (translateY grows 1:1 with scrollY beyond that point), which is
        // what makes it read as "pinned in the nav" without ever switching
        // position modes. transform-origin is left/top, so this is a pure
        // vertical slide — the left edge never moves.
        var translateY = dockProgress * (projectHeroDock.top - projectHeroNatural.top) + window.scrollY;
        var scale = 1 - dockProgress * (1 - projectHeroDock.scale);
        projectHeroTitleEl.style.transform = 'translateY(' + translateY.toFixed(1) + 'px) scale(' + scale.toFixed(3) + ')';
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
