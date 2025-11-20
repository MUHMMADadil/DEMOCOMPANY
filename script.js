// Theme toggle with persistence and wide browser support
(function themeToggle() {
  var btn = document.getElementById('theme-toggle');
  var root = document.documentElement;
  var stored = localStorage.getItem('theme');
  var prefersDark = false;

  try {
    prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (_) {}

  var startTheme = stored || (prefersDark ? 'dark' : 'light');
  root.setAttribute('data-theme', startTheme);
  if (btn) btn.setAttribute('aria-pressed', startTheme === 'dark');

  if (btn) {
    btn.addEventListener('click', function () {
      var now = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', now);
      try { localStorage.setItem('theme', now); } catch (_) {}
      btn.setAttribute('aria-pressed', now === 'dark');
    });
  }
})();

// Mobile nav
(function mobileNav() {
  var burger = document.getElementById('hamburger');
  var nav = document.getElementById('site-nav');
  if (!burger || !nav) return;

  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.classList.toggle('active', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  var links = nav.querySelectorAll('a');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function () {
      nav.classList.remove('open');
      burger.classList.remove('active');
      burger.setAttribute('aria-expanded', 'false');
    });
  }
})();

// Hero slider
(function slider() {
  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  if (!slides.length) return;

  var prev = document.getElementById('prev');
  var next = document.getElementById('next');
  var dotsWrap = document.getElementById('slider-dots');
  var i = 0, timer;

  function setDotActive(idx, on) {
    if (!dotsWrap) return;
    var dot = dotsWrap.children[idx];
    if (dot) {
      if (on) dot.classList.add('active');
      else dot.classList.remove('active');
    }
  }

  function go(n) {
    slides[i].classList.remove('is-active');
    setDotActive(i, false);
    i = (n + slides.length) % slides.length;
    slides[i].classList.add('is-active');
    setDotActive(i, true);
    restart();
  }

  function restart() {
    clearInterval(timer);
    timer = setInterval(function () { go(i + 1); }, 6000);
  }

  // Dots
  if (dotsWrap) {
    for (var d = 0; d < slides.length; d++) {
      (function(idx){
        var b = document.createElement('button');
        b.type = 'button';
        if (idx === 0) b.classList.add('active');
        b.addEventListener('click', function () { go(idx); });
        dotsWrap.appendChild(b);
      })(d);
    }
  }

  if (prev) prev.addEventListener('click', function () { go(i - 1); });
  if (next) next.addEventListener('click', function () { go(i + 1); });

  restart();

  // Pause on hover
  var hero = document.querySelector('.hero');
  if (hero) {
    hero.addEventListener('mouseenter', function () { clearInterval(timer); });
    hero.addEventListener('mouseleave', restart);
  }
})();

// Counters (animate when visible)
(function counters() {
  var nums = document.querySelectorAll('.num[data-target]');
  if (!nums.length) return;

  if (!('IntersectionObserver' in window)) {
    for (var k = 0; k < nums.length; k++) nums[k].textContent = nums[k].dataset.target;
    return;
  }
  var duration = 1200;
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var target = +el.getAttribute('data-target');
      var start = performance.now();
      function tick(t) {
        var p = Math.min(1, (t - start) / duration);
        el.textContent = Math.round(p * target);
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
      obs.unobserve(el);
    });
  }, { threshold: 0.3 });
  nums.forEach(function (n) { obs.observe(n); });
})();

// Reveal on scroll
(function reveal() {
  var items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach(function (i) { i.classList.add('revealed'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.25 });
  items.forEach(function (i) { io.observe(i); });
})();

// Footer year
var y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();

// Case Study Modal (open template content by key)
(function caseModal() {
  var modal = document.getElementById('case-modal');
  var contentSlot = document.getElementById('case-content');
  if (!modal || !contentSlot) return;

  var lastFocus = null;

  function openCase(key) {
    var tpl = document.getElementById('tpl-case-' + key);
    if (!tpl) return;
    // Inject content
    contentSlot.innerHTML = '';
    contentSlot.appendChild(tpl.content.cloneNode(true));

    lastFocus = document.activeElement;
    document.body.classList.add('no-scroll');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    // Focus first interactive in dialog
    setTimeout(function () {
      var focusTarget = modal.querySelector('.modal-close') || modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusTarget) focusTarget.focus();
    }, 0);
  }

  function closeCase() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    contentSlot.innerHTML = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // Delegated open
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('.read-case');
    if (trigger) {
      e.preventDefault();
      var key = trigger.getAttribute('data-case');
      if (key) openCase(key);
    }
    if (e.target.hasAttribute('data-close') || e.target.closest('[data-close]')) {
      e.preventDefault(); closeCase();
    }
  });

  // Close on ESC
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeCase();
  });

  // Basic focus trap inside modal
  modal.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var focusables = modal.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusables = Array.prototype.slice.call(focusables).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();

// Header constellation effect (no HTML changes)
(function headerConstellation() {
  // Respect OS "reduce motion"
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var header = document.querySelector('.site-header');
  if (!header) return;

  var c = document.createElement('canvas');
  c.className = 'header-net';
  header.appendChild(c);

  var ctx = c.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var w = 0, h = 0, points = [];
  var mouse = { x: null, y: null, active: false };

  function getRgbFromVar(name, fallback) {
    var col = (getComputedStyle(document.documentElement).getPropertyValue(name) || fallback || '#0b1f2a').trim();
    if (col.startsWith('#')) {
      var hex = col.slice(1);
      if (hex.length === 3) hex = hex.split('').map(function (ch) { return ch + ch; }).join('');
      var num = parseInt(hex, 16);
      return [ (num >> 16) & 255, (num >> 8) & 255, num & 255 ];
    }
    var m = col.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    return m ? [ +m[1], +m[2], +m[3] ] : [11, 31, 42];
  }
  var rgb = getRgbFromVar('--text');

  // Update color when theme changes
  var mo = new MutationObserver(function () { rgb = getRgbFromVar('--text'); });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function resize() {
    var r = header.getBoundingClientRect();
    w = r.width; h = r.height;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.max(1, Math.floor(w * DPR));
    c.height = Math.max(1, Math.floor(h * DPR));
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Seed points based on area (density scaled for header height)
    var count = Math.max(20, Math.floor((w * h) / 2600));
    points = [];
    for (var i = 0; i < count; i++) {
      points.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45
      });
    }
  }
  resize();
  window.addEventListener('resize', resize);

  header.addEventListener('mousemove', function (e) {
    var rect = header.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  });
  header.addEventListener('mouseleave', function () { mouse.active = false; });

  function step() {
    ctx.clearRect(0, 0, w, h);

    var lineBase = function (alpha) { return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')'; };
    var dotCol = lineBase(0.38);

    // Move points
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      p.x += p.vx; p.y += p.vy;

      // bounce
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      // slight attraction to mouse when close
      if (mouse.active) {
        var dx = mouse.x - p.x, dy = mouse.y - p.y, d2 = dx*dx + dy*dy;
        if (d2 < 140*140) { p.vx += dx * 0.0005; p.vy += dy * 0.0005; }
      }
    }

    // Lines between close points
    var maxD = 120;
    ctx.lineWidth = 1;
    for (var a = 0; a < points.length; a++) {
      for (var b = a + 1; b < points.length; b++) {
        var dx = points[a].x - points[b].x;
        var dy = points[a].y - points[b].y;
        var d2 = dx*dx + dy*dy;
        if (d2 < maxD * maxD) {
          var alpha = 0.25 * (1 - Math.sqrt(d2) / maxD);
          ctx.strokeStyle = lineBase(alpha);
          ctx.beginPath();
          ctx.moveTo(points[a].x, points[a].y);
          ctx.lineTo(points[b].x, points[b].y);
          ctx.stroke();
        }
      }
    }

    // Lines to mouse and mouse dot
    if (mouse.active) {
      for (var k = 0; k < points.length; k++) {
        var dxm = mouse.x - points[k].x;
        var dym = mouse.y - points[k].y;
        var dist = Math.sqrt(dxm*dxm + dym*dym);
        if (dist < 140) {
          ctx.strokeStyle = lineBase(0.35 * (1 - dist / 140));
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(points[k].x, points[k].y);
          ctx.stroke();
        }
      }
      ctx.fillStyle = lineBase(0.55);
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 2.4, 0, Math.PI * 2); ctx.fill();
    }

    // Draw dots
    ctx.fillStyle = dotCol;
    for (var i2 = 0; i2 < points.length; i2++) {
      ctx.beginPath(); ctx.arc(points[i2].x, points[i2].y, 1.6, 0, Math.PI * 2); ctx.fill();
    }

    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();

// Hero slider constellation effect (draws lines/dots inside .hero)
(function heroConstellation() {
  // Respect user's reduced motion preference
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var hero = document.querySelector('.hero');
  if (!hero) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'hero-net';
  hero.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var w = 0, h = 0, pts = [];
  var mouse = { x: 0, y: 0, active: false };

  function getRgbFromVar(name, fallback) {
    var col = (getComputedStyle(document.documentElement).getPropertyValue(name) || fallback || '#0b1f2a').trim();
    if (col.startsWith('#')) {
      var hex = col.slice(1);
      if (hex.length === 3) hex = hex.split('').map(function (c) { return c + c; }).join('');
      var num = parseInt(hex, 16);
      return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
    }
    var m = col.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    return m ? [ +m[1], +m[2], +m[3] ] : [11, 31, 42];
  }
  var rgb = getRgbFromVar('--text');

  // Update color when theme toggles
  var mo = new MutationObserver(function () { rgb = getRgbFromVar('--text'); });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  function resize() {
    var r = hero.getBoundingClientRect();
    w = Math.max(1, Math.floor(r.width));
    h = Math.max(1, Math.floor(r.height));

    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * DPR;
    canvas.height = h * DPR;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // density relative to area, clamped
    var count = Math.max(40, Math.min(120, Math.floor((w * h) / 7000)));
    pts = [];
    for (var i = 0; i < count; i++) {
      pts.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45
      });
    }
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  hero.addEventListener('mousemove', function (e) {
    var r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.active = true;
  });
  hero.addEventListener('mouseleave', function () { mouse.active = false; });

  function rgba(a) { return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')'; }

  function tick() {
    ctx.clearRect(0, 0, w, h);

    // move points
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      p.x += p.vx; p.y += p.vy;

      // bounce on edges
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      // gentle attraction to mouse
      if (mouse.active) {
        var dx = mouse.x - p.x, dy = mouse.y - p.y, d2 = dx*dx + dy*dy;
        if (d2 < 150*150) { p.vx += dx * 0.0005; p.vy += dy * 0.0005; }
      }
    }

    // draw lines between close points
    var maxD = 130;
    ctx.lineWidth = 1;
    for (var a = 0; a < pts.length; a++) {
      for (var b = a + 1; b < pts.length; b++) {
        var dx = pts[a].x - pts[b].x;
        var dy = pts[a].y - pts[b].y;
        var d2 = dx*dx + dy*dy;
        if (d2 < maxD * maxD) {
          var alpha = 0.22 * (1 - Math.sqrt(d2) / maxD);
          ctx.strokeStyle = rgba(alpha);
          ctx.beginPath();
          ctx.moveTo(pts[a].x, pts[a].y);
          ctx.lineTo(pts[b].x, pts[b].y);
          ctx.stroke();
        }
      }
    }

    // connect mouse to nearby points + draw mouse node
    if (mouse.active) {
      for (var k = 0; k < pts.length; k++) {
        var dxm = mouse.x - pts[k].x;
        var dym = mouse.y - pts[k].y;
        var dist = Math.sqrt(dxm*dxm + dym*dym);
        if (dist < 150) {
          ctx.strokeStyle = rgba(0.32 * (1 - dist / 150));
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(pts[k].x, pts[k].y);
          ctx.stroke();
        }
      }
      ctx.fillStyle = rgba(0.5);
      ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 2.6, 0, Math.PI * 2); ctx.fill();
    }

    // draw dots
    ctx.fillStyle = rgba(0.38);
    for (var i2 = 0; i2 < pts.length; i2++) {
      ctx.beginPath(); ctx.arc(pts[i2].x, pts[i2].y, 1.7, 0, Math.PI * 2); ctx.fill();
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

// Contact form -> send to Flask + SQLite (single handler, guarded)
(function contactFormSubmit() {
  var form = document.querySelector('.contact-form.modern');
  if (!form) return;

  // Prevent double-binding if the script is included twice
  if (window.__contactSubmitBound) return;
  window.__contactSubmitBound = true;

  // Local dev backend
  var BACKEND = 'http://127.0.0.1:5000';

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = form.querySelector('button[type="submit"]');
    var prev = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    try {
      var data = new FormData(form);
      var res = await fetch(BACKEND + '/api/contact', { method: 'POST', body: data });
      var json = {};
      try { json = await res.json(); } catch (_) {}

      if (!res.ok || !json.ok) throw new Error((json && json.error) || 'Request failed');
      if (btn) btn.textContent = 'Sent!';
      form.reset();
      setTimeout(function(){ if (btn){ btn.disabled=false; btn.textContent=prev; } }, 1200);
    } catch (err) {
      console.error('Submit error:', err);
      alert('Network error: ' + err.message);
      if (btn) { btn.disabled = false; btn.textContent = prev; }
    }
  });
})();