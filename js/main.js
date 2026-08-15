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

  // --- Randomize project tile sizes (1x1 / 1x2) on each load ---
  // Order of projects always stays as written in the HTML — only which
  // tiles render tall is randomized, and only once there are 3+ of them.
  document.querySelectorAll('.tile-grid--projects:not([data-fixed-layout])').forEach(function (grid) {
    var tiles = grid.querySelectorAll(':scope > .tile');
    if (tiles.length < 3) return;
    tiles.forEach(function (tile) {
      tile.classList.remove('tile--tall', 'tile--full');
      if (Math.random() < 0.32) tile.classList.add('tile--tall');
    });
  });

  // --- Project photo lightbox: click to enlarge, click again to zoom + follow mouse ---
  var galleryMedia = document.querySelectorAll('.tile-grid--projects[data-fixed-layout] .tile__media');
  if (galleryMedia.length) {
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

    galleryMedia.forEach(function (media) {
      media.addEventListener('click', function () { openLightbox(media); });
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

  // --- Scroll parallax: tile captions, hero zoom, cutout product images ---
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var parallaxEls = document.querySelectorAll('.tile__caption');
  var objectEls = document.querySelectorAll('.tile__object');
  var heroContent = document.querySelector('.hero-tile__content');
  var heroTile = document.querySelector('.hero-tile');

  if (!reduceMotion && (parallaxEls.length || objectEls.length || heroContent)) {
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
        var px = Math.max(-18, Math.min(18, offset * 30));
        el.style.transform = 'translate(-50%, calc(-50% + ' + px.toFixed(1) + 'px))';
      });
      if (heroContent && heroTile) {
        var heroHeight = heroTile.offsetHeight || vh;
        var progress = Math.max(0, Math.min(1, window.scrollY / heroHeight));
        var scale = 1 - progress * 0.14;
        heroContent.style.transform = 'scale(' + scale.toFixed(3) + ')';
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
