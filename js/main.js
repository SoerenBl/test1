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

  // --- Scroll parallax on tile captions + hero zoom + nav overlay->solid ---
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var parallaxEls = document.querySelectorAll('.tile__caption');
  var heroContent = document.querySelector('.hero-tile__content');
  var heroTile = document.querySelector('.hero-tile');
  var navEl = document.querySelector('.nav');

  function updateNav() {
    if (!navEl || !heroTile) return;
    var heroHeight = heroTile.offsetHeight || window.innerHeight;
    navEl.classList.toggle('nav--solid', window.scrollY > heroHeight - (navEl.offsetHeight || 0));
  }

  if (heroTile) {
    updateNav();
    window.addEventListener('scroll', updateNav, { passive: true });
    window.addEventListener('resize', updateNav);
  }

  if (!reduceMotion && (parallaxEls.length || heroContent)) {
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
