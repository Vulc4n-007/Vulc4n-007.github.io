/* Portfolio interactions: reveals, nav state, section spy, mobile sheet, contact form. */
(function () {
  'use strict';

  /* reveal on enter */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); ro.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    rv.forEach(function (el) { ro.observe(el); });
  } else {
    rv.forEach(function (el) { el.classList.add('in'); });
  }

  /* sticky nav border */
  var nav = document.querySelector('.nav');
  var sentinel = document.getElementById('top');
  if (nav && sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      nav.classList.toggle('is-stuck', !e[0].isIntersecting);
    }, { threshold: 0 }).observe(sentinel);
  }

  /* section spy */
  var links = [].slice.call(document.querySelectorAll('.nav__link'));
  var sections = links
    .map(function (l) { return document.querySelector(l.getAttribute('href')); })
    .filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (l) {
          l.classList.toggle('is-active', l.getAttribute('href') === '#' + e.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* mobile sheet */
  var burger = document.querySelector('.burger');
  var sheet = document.querySelector('.sheet');
  function setSheet(open) {
    if (!burger || !sheet) return;
    burger.classList.toggle('open', open);
    sheet.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('is-locked', open);
  }
  if (burger && sheet) {
    burger.addEventListener('click', function () { setSheet(!sheet.classList.contains('open')); });
    sheet.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setSheet(false); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setSheet(false); });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 860) setSheet(false);
    });
  }

  /* contact form */
  var form = document.getElementById('contact-form');
  if (form) {
    var note = form.querySelector('.form__note');
    var submit = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      note.className = 'form__note wait';
      note.textContent = 'Sending…';
      submit.disabled = true;
      try {
        var res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' }
        });
        if (!res.ok) throw new Error('failed');
        note.className = 'form__note ok';
        note.textContent = 'Thanks — your message is on its way.';
        form.reset();
      } catch (err) {
        note.className = 'form__note err';
        note.textContent = 'Could not send. Email OwaizKhan1111@gmail.com directly.';
      } finally {
        submit.disabled = false;
      }
    });
  }

  /* theme toggle — system by default, explicit choice persists and wins */
  var themer = document.getElementById('themer');
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  function activeTheme() {
    var set = document.documentElement.getAttribute('data-theme');
    if (set === 'dark' || set === 'light') return set;
    return systemDark.matches ? 'dark' : 'light';
  }

  function syncThemer() {
    if (!themer) return;
    var dark = activeTheme() === 'dark';
    themer.setAttribute('aria-pressed', String(dark));
    themer.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    themer.setAttribute('title', dark ? 'Switch to light theme' : 'Switch to dark theme');
    var meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) meta.setAttribute('content', dark ? '#0C0D10' : '#ffffff');
  }

  if (themer) {
    themer.addEventListener('click', function () {
      var next = activeTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* storage blocked */ }
      syncThemer();
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
    });
    syncThemer();
  }

  /* follow the system while no explicit choice is stored */
  var onSystem = function () {
    var stored = null;
    try { stored = localStorage.getItem('theme'); } catch (e) { /* storage blocked */ }
    if (stored === 'dark' || stored === 'light') return;
    syncThemer();
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: activeTheme() } }));
  };
  if (systemDark.addEventListener) systemDark.addEventListener('change', onSystem);
  else if (systemDark.addListener) systemDark.addListener(onSystem);

  /* stagger indices for bullets and tags — CSS reads --i for its delay */
  ['.job ul', '.proj ul', '.tags'].forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (list) {
      [].slice.call(list.children).forEach(function (child, i) {
        child.style.setProperty('--i', i);
      });
    });
  });

  /* read-progress rail in the nav */
  var prog = document.getElementById('nav-prog');
  if (prog) {
    var ticking = false;
    var paint = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      prog.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
    }, { passive: true });
    paint();
  }

  /* metrics count up once, the first time their band is seen */
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var counters = [].slice.call(document.querySelectorAll('[data-count]'));
  function countUp(el) {
    var to = parseFloat(el.dataset.count);
    var dec = parseInt(el.dataset.dec || '0', 10);
    if (isNaN(to)) return;
    if (calm) { el.textContent = to.toFixed(dec); return; }
    var start = null, dur = 1100;
    function step(now) {
      if (start === null) start = now;
      var k = Math.min((now - start) / dur, 1);
      var eased = 1 - Math.pow(1 - k, 3);
      el.textContent = (to * eased).toFixed(dec);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (counters.length && 'IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        co.unobserve(e.target);
        countUp(e.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* buttons lean toward the pointer, then settle back */
  if (window.matchMedia('(pointer: fine)').matches && !calm) {
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        btn.style.setProperty('--mx', (dx * 4).toFixed(2) + 'px');
        btn.style.setProperty('--my', (dy * 3).toFixed(2) + 'px');
      });
      btn.addEventListener('pointerleave', function () {
        btn.style.setProperty('--mx', '0px');
        btn.style.setProperty('--my', '0px');
      });
    });
  }

  /* ---------- liquid-glass pointer ----------
     Real glass has to sample the page behind it, and a `cursor: url()` image
     never can — it is a static bitmap the compositor stamps down. So the pane
     is a real fixed element carrying `backdrop-filter`, moved on pointermove.
     It tracks the raw coordinates with no easing, so it sits exactly under the
     pointer rather than swimming behind it the way a lerped cursor does. */
  (function () {
    if (!window.matchMedia('(pointer: fine)').matches) return;

    var ok = (window.CSS && CSS.supports)
      && (CSS.supports('backdrop-filter', 'blur(1px)') ||
          CSS.supports('-webkit-backdrop-filter', 'blur(1px)'));
    if (!ok) return;   /* leave the SVG cursor in place rather than a flat blob */

    var HX = 3, HY = 2;            /* the tip, in the shape's own 34px box */
    /* proportions traced off the reference: a vertical left edge, the nose
       out to the right at ~70% of the height, and a rounded point at the
       bottom rather than a flat cut */
    var D = 'M7.04 5.79L21.89 19.72A3.20 3.20 0 0 1 20.87 25.04L7.09 30.41' +
            'A3.00 3.00 0 0 1 3.00 27.61L3.00 7.54A2.40 2.40 0 0 1 7.04 5.79Z';

    var el = document.createElement('div');
    el.className = 'lgc';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="lgc__in">' +
        '<div class="lgc__pane"></div>' +
        '<svg class="lgc__rim" viewBox="0 0 34 34">' +
          '<defs><linearGradient id="lgc-spec" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-opacity=".92"/>' +
            '<stop offset=".5" stop-opacity=".55"/>' +
            '<stop offset="1" stop-opacity=".82"/>' +
          '</linearGradient></defs>' +
          '<path class="lgc__edge" d="' + D + '"/>' +
          '<path class="lgc__spec" d="' + D + '"/>' +
        '</svg>' +
      '</div>';
    document.body.appendChild(el);
    document.documentElement.classList.add('lgc-on');

    var HOT = 'a[href], button, label, summary, [role="button"], .tag';
    var TEXT = 'input, textarea, select';
    var x = -120, y = -120, queued = false, live = false;

    function paint() {
      queued = false;
      el.style.transform = 'translate3d(' + (x - HX) + 'px,' + (y - HY) + 'px,0)';
    }

    window.addEventListener('pointermove', function (e) {
      x = e.clientX; y = e.clientY;
      if (!live) { live = true; el.classList.add('is-live'); }
      var t = e.target;
      el.classList.toggle('is-hot', !!(t.closest && t.closest(HOT)));
      /* over a text field the caret matters more than the pane */
      el.classList.toggle('is-hidden', !!(t.closest && t.closest(TEXT)));
      if (!queued) { queued = true; requestAnimationFrame(paint); }
    }, { passive: true });

    /* Only a pointer that actually left the page hides the pane. Window blur is
       not that — it fires when focus moves to devtools or another app, and
       hiding on it strands the pane invisible until the mouse moves again. */
    document.addEventListener('mouseleave', function () {
      live = false;
      el.classList.remove('is-live');
    });
    document.addEventListener('mouseenter', function () {
      live = true;
      el.classList.add('is-live');
    });

    /* pressing gives the same swell as hovering, so a click has some weight */
    window.addEventListener('pointerdown', function () { el.classList.add('is-hot'); });
    window.addEventListener('pointerup', function (e) {
      var t = e.target;
      el.classList.toggle('is-hot', !!(t && t.closest && t.closest(HOT)));
    });
  })();

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
