/* ═══ 藤澤撮影スタジオ LP ═══ */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  /* ── gallery（figureはHTML側に静的に存在する） ── */
  var grid = document.getElementById('grid');
  var cells = grid ? Array.prototype.slice.call(grid.children) : [];
  var visible = cells.map(function (_, i) { return i; });

  function applyFilter(cat) {
    visible = [];
    cells.forEach(function (cell, i) {
      var hit = cat === 'all' || cell.dataset.cat === cat;
      cell.classList.toggle('is-hidden', !hit);
      if (hit) visible.push(i);
    });
  }

  /* ── filters ── */
  var filters = document.querySelectorAll('.filter');

  Array.prototype.forEach.call(filters, function (btn) {
    btn.addEventListener('click', function () {
      Array.prototype.forEach.call(filters, function (b) { b.classList.remove('is-active'); });
      btn.classList.add('is-active');
      applyFilter(btn.dataset.cat);
    });
  });

  /* ── lightbox ── */
  var lb = document.getElementById('lb');
  var lbImg = document.getElementById('lbImg');
  var cur = 0;

  function paint(i) {
    var cell = cells[i];
    lbImg.src = cell.dataset.src;
    lbImg.alt = cell.dataset.label + 'での撮影作例';
  }
  function show(idx) {
    if (!visible.length) return;
    var pos = visible.indexOf(idx);
    cur = visible[pos === -1 ? 0 : pos];
    paint(cur);
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function step(dir) {
    var pos = visible.indexOf(cur);
    pos = (pos + dir + visible.length) % visible.length;
    cur = visible[pos];
    paint(cur);
  }
  function close() {
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (grid) {
    grid.addEventListener('click', function (e) {
      var cell = e.target.closest('.cell');
      if (cell) show(Number(cell.dataset.i));
    });
  }
  document.getElementById('lbClose').addEventListener('click', close);
  document.getElementById('lbPrev').addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
  document.getElementById('lbNext').addEventListener('click', function (e) { e.stopPropagation(); step(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target === lbImg) close(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
  });

  /* ── header state ── */
  var head = document.getElementById('siteHead');
  var onScroll = function () {
    head.classList.toggle('is-stuck', window.scrollY > 60);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── mobile nav ── */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
  });
  Array.prototype.forEach.call(nav.querySelectorAll('a'), function (a) {
    a.addEventListener('click', function () {
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });

  /* ── reveal on scroll ── */
  var targets = document.querySelectorAll('.sec-head, .duo__item, .specbar dl, .plan, .eq__col, .rules__col, .access__info, .cta__inner, .uses li');
  Array.prototype.forEach.call(targets, function (el) { el.classList.add('rv'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(targets, function (el) { el.classList.add('is-in'); });
  }
})();
