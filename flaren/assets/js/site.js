/* ============================================================
   site.js — 共通スクリプト
   - 計測: data-analytics 属性 → dataLayer push（GTM経由・要件§5-2）
     ※GTMコンテナIDは【要確認: T-10】未設定。ID設定までpushは
       dataLayer配列に蓄積されるのみで外部送信されない（デモ計測なし）
   - ヘッダードロワー / タブ / フォーム検証・送信スタブ
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 計測基盤（GTM dataLayer） ---------- */
  window.dataLayer = window.dataLayer || [];
  function track(eventName, params) {
    var payload = Object.assign({ event: eventName, page_path: location.pathname }, params || {});
    window.dataLayer.push(payload);
  }

  // data-analytics="イベント名" の要素クリックで発火（システム§10）
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-analytics]');
    if (!el) return;
    var params = {};
    if (el.dataset.service) params.service_name = el.dataset.service;
    if (el.dataset.category) params.works_category = el.dataset.category;
    if (el.dataset.position) params.band_position = el.dataset.position;
    track(el.dataset.analytics, params);
  });

  // thanksページ到達で form_submit_* を発火（要件§5-2）
  var thanksEvent = document.body.getAttribute('data-thanks-event');
  if (thanksEvent) track(thanksEvent);

  /* ---------- SPドロワー（§6-2） ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  var drawer = document.getElementById('drawer');
  if (menuBtn && drawer) {
    menuBtn.addEventListener('click', function () {
      var open = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!open));
      menuBtn.setAttribute('aria-label', open ? 'メニューを開く' : 'メニューを閉じる');
      drawer.classList.toggle('is-open', !open);
      document.body.classList.toggle('drawer-open', !open);
    });
  }

  /* ---------- タブ（§6-9: works / faq 共用） ---------- */
  document.querySelectorAll('[data-tabs]').forEach(function (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    // フィルタ型（works）は全タブが同一パネルを共有するためパネルの出し分けをしない
    var filterMode = tabs.some(function (t) { return t.dataset.filter !== undefined; });

    function activate(tab, setFocus) {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        t.tabIndex = selected ? 0 : -1;
        if (!filterMode) {
          var panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !selected;
        }
      });
      if (setFocus) tab.focus();
      // works: カテゴリフィルタ
      var filter = tab.dataset.filter;
      if (filter !== undefined) {
        document.querySelectorAll('[data-works-card]').forEach(function (card) {
          card.hidden = filter !== 'all' && card.dataset.worksCard !== filter;
        });
        if (tab.dataset.analyticsTab) track(tab.dataset.analyticsTab, { works_category: tab.dataset.categoryLabel || filter });
        if (history.replaceState) history.replaceState(null, '', '#' + filter);
      }
      // faq: タブ連動CV切替（要件§2-8: 画面上に同時に見えるCVは常に1つ）
      var cvId = tab.dataset.cv;
      if (cvId) {
        document.querySelectorAll('[data-cv-band]').forEach(function (band) {
          band.hidden = band.id !== cvId;
        });
      }
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { activate(tab, false); });
      tab.addEventListener('keydown', function (e) { // キーボード左右移動（§6-9）
        var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        activate(tabs[(i + dir + tabs.length) % tabs.length], true);
      });
    });

    // works: 件数をタブ横に動的表示（実カード数から算出。T4§1）
    if (tablist.dataset.tabs === 'works') {
      tabs.forEach(function (tab) {
        var filter = tab.dataset.filter;
        var count = filter === 'all'
          ? document.querySelectorAll('[data-works-card]').length
          : document.querySelectorAll('[data-works-card="' + filter + '"]').length;
        var span = tab.querySelector('.count');
        if (span) span.textContent = count;
      });
      // URLハッシュからの初期タブ復元
      var hash = location.hash.replace('#', '');
      var initial = tabs.filter(function (t) { return t.dataset.filter === hash; })[0];
      if (initial) activate(initial, false);
    }

    // faq: /faq/#recruit で求職者タブを初期表示（完了画面等からの導線用）
    if (tablist.dataset.tabs === 'faq') {
      var fhash = location.hash.replace('#', '');
      var finitial = tabs.filter(function (t) { return t.dataset.hash === fhash; })[0];
      if (finitial) activate(finitial, false);
    }
  });

  /* ---------- 印刷ボタン（/company/ §9） ---------- */
  document.querySelectorAll('[data-print]').forEach(function (btn) {
    btn.addEventListener('click', function () { window.print(); });
  });

  /* ---------- フォーム: 検証＋送信スタブ（§6-12・要件§3-1/3-2） ---------- */
  document.querySelectorAll('form[data-form-stub]').forEach(function (form) {
    var summary = form.querySelector('.form-summary');
    var started = false;

    // form_start: 最初の項目へのフォーカスで一度だけ発火（要件§5-2）
    form.addEventListener('focusin', function (e) {
      if (started) return;
      if (e.target.matches('input, select, textarea')) {
        started = true;
        track('form_start', { form_id: form.id });
      }
    });

    function setError(field, message) {
      var wrap = field.closest('.field');
      if (!wrap) return;
      var err = wrap.querySelector('.field__error');
      if (message) {
        wrap.classList.add('is-error');
        field.setAttribute('aria-invalid', 'true');
        if (err) { err.textContent = ''; err.appendChild(document.createTextNode(message)); }
      } else {
        wrap.classList.remove('is-error');
        field.removeAttribute('aria-invalid');
      }
    }

    function validate() {
      var errors = [];
      form.querySelectorAll('[data-label]').forEach(function (field) {
        var label = field.dataset.label;
        var value = field.type === 'checkbox' ? (field.checked ? '1' : '') : field.value.trim();
        var message = '';
        if (field.required && !value) {
          // エラー文言は原稿正本（contact.md / recruit-entry.md）
          message = field.type === 'checkbox' ? label + 'にチェックしてください' : label + 'をご入力ください';
          if (field.tagName === 'SELECT') message = label + 'をご選択ください';
        } else if (value && field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          message = 'メールアドレスの形式をご確認ください';
        } else if (value && field.dataset.minAge && Number(value) < Number(field.dataset.minAge)) {
          message = '18歳以上の方が対象です';
        }
        setError(field, message);
        if (message) errors.push({ field: field, message: message });
      });
      return errors;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var errors = validate();
      if (errors.length) {
        if (summary) {
          summary.innerHTML = '';
          var h = document.createElement('h4');
          h.textContent = '入力内容をご確認ください';
          summary.appendChild(h);
          errors.forEach(function (err) {
            var a = document.createElement('a');
            a.href = '#' + err.field.id;
            a.textContent = err.message;
            a.addEventListener('click', function (ev) { ev.preventDefault(); err.field.focus(); });
            summary.appendChild(a);
          });
          summary.classList.add('is-visible');
          summary.focus();
        }
        errors[0].field.focus();
        return;
      }
      if (summary) summary.classList.remove('is-visible');

      // TODO【要確認: T-05】送信先未確定のため送信スタブ（要件§3-1）。
      // 本公開時: 送信方式確定後にここを実送信へ差し替え＋スパム対策(reCAPTCHA等)を導入する。
      var btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = '送信しています…'; }
      setTimeout(function () {
        location.href = form.dataset.formStub; // thanks画面へ遷移（計測はthanks到達側で発火）
      }, 600);
    });

    // 入力し直したらエラー解除
    form.addEventListener('input', function (e) {
      if (e.target.matches('[data-label]') && e.target.closest('.field.is-error')) {
        var errs = validate();
        if (!errs.length && summary) summary.classList.remove('is-visible');
      }
    });
  });
})();
