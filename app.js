(function () {
  'use strict';
  var H = window.HUB, sec = null, data = null, busy = false;
  function $(id) { return document.getElementById(id); }
  function show(id, on) { $(id).classList.toggle('hidden', !on); }
  function note(id, msg) { var e = $(id); e.textContent = msg || ''; e.classList.toggle('hidden', !msg); }
  function key() { return 'cne_hub_pw_' + sec; }
  function getPw() { try { return sessionStorage.getItem(key()) || ''; } catch (e) { return ''; } }
  function setPw(v) { try { if (v) sessionStorage.setItem(key(), v); else sessionStorage.removeItem(key()); } catch (e) {} }

  function call(extra) {
    var c = H[sec];
    var body = Object.assign({ action: c.report, password: getPw() }, extra || {});
    return fetch(c.api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }

  /* ---------- routing: #attendance / #evaluation / (home) ---------- */
  function route() {
    var h = location.hash.replace('#', '');
    if (H[h]) openSection(h); else goHome();
  }
  function goHome() {
    sec = null; data = null;
    show('home', true); show('sec', false);
    document.title = 'CNE Admin | Security Forces Hospital Dammam';
    window.scrollTo(0, 0);
  }
  function openSection(name) {
    sec = name; data = null;
    show('home', false); show('sec', true);
    $('sec-title').textContent = H[name].title;
    $('l-admin').href = H[name].admin; $('l-form').href = H[name].form; $('l-screen').href = H[name].screen;
    note('login-err', ''); note('data-err', '');
    $('pw').value = '';
    document.title = 'CNE ' + H[name].title + ' | Security Forces Hospital Dammam';
    window.scrollTo(0, 0);
    if (getPw()) { show('login', false); show('data', false); load(); }
    else { show('login', true); show('data', false); }
  }

  /* ---------- loading data ---------- */
  function fail(r, where) {
    var m = (r && (r.message || r.error)) || 'Could not load the data.';
    if (r && r.ok && !r.sheets) m = 'The Google Apps Script for this file has not been updated yet. Paste the new Code.gs and deploy a new version.';
    if (r && /unknown action|bad request/i.test(String(r.message || r.error))) m = 'The Google Apps Script for this file has not been updated yet. Paste the new Code.gs and deploy a new version.';
    return m;
  }
  function load(tab) {
    if (busy) return Promise.resolve();
    busy = true; note('data-err', '');
    var name = sec;
    return call(tab ? { tab: tab } : {}).then(function (r) {
      busy = false;
      if (sec !== name) return;
      if (!r || !r.ok || !r.sheets) {
        var m = fail(r);
        if (r && !r.ok && /password|AUTH|LOCKED|too many/i.test(String(r.error || '') + String(r.message || ''))) {
          setPw(''); show('data', false); show('login', true); note('login-err', m);
        } else if (!data) { show('login', true); show('data', false); note('login-err', m); }
        else note('data-err', m);
        return;
      }
      data = r; show('login', false); show('data', true); render();
    }).catch(function () {
      busy = false;
      var m = 'Could not reach the server. Check your connection and try again.';
      if (!data) { show('login', true); show('data', false); note('login-err', m); } else note('data-err', m);
    });
  }

  /* ---------- rendering ---------- */
  function locIndex(h) { for (var i = 0; i < h.length; i++) if (/^Location/i.test(h[i])) return i; return -1; }
  function render() {
    var s = data.sheets[0];
    var sel = $('tab'); sel.innerHTML = '';
    if (!data.tabs.length) {
      var o = document.createElement('option'); o.textContent = 'No lectures yet'; sel.appendChild(o);
      sel.disabled = true;
    } else {
      sel.disabled = false;
      data.tabs.forEach(function (t) {
        var o = document.createElement('option'); o.value = t; o.textContent = t + (t === data.current ? '  (current)' : '');
        if (s && t === s.name) o.selected = true; sel.appendChild(o);
      });
    }
    var counts = { total: 0, inside: 0, outside: 0, refused: 0, 'no signal': 0 };
    if (s) {
      var li = locIndex(s.header);
      s.rows.forEach(function (r) { counts.total++; var v = String(r[li] || '').toLowerCase(); if (counts[v] !== undefined) counts[v]++; });
    }
    var st = $('stats'); st.innerHTML = '';
    [['Total', counts.total], ['Inside', counts.inside], ['Outside', counts.outside], ['Refused', counts.refused], ['No signal', counts['no signal']]].forEach(function (x) {
      var d = document.createElement('div'); d.className = 'stat'; d.appendChild(document.createTextNode(x[0]));
      var b = document.createElement('b'); b.textContent = x[1]; d.appendChild(b); st.appendChild(d);
    });
    drawTable();
  }
  function drawTable() {
    var s = data.sheets[0], th = $('thead'), tb = $('tbody');
    th.innerHTML = ''; tb.innerHTML = '';
    if (!s) { $('count-note').textContent = 'No data yet.'; return; }
    var q = $('filter').value.trim().toLowerCase();
    var hr = document.createElement('tr');
    ['#'].concat(s.header).forEach(function (h) { var c = document.createElement('th'); c.textContent = h; c.title = h; hr.appendChild(c); });
    th.appendChild(hr);
    var shown = 0;
    s.rows.forEach(function (r, i) {
      if (q && r.join(' ').toLowerCase().indexOf(q) < 0) return;
      shown++;
      var tr = document.createElement('tr');
      [String(i + 1)].concat(r).forEach(function (v) { var c = document.createElement('td'); c.textContent = v; c.title = v; tr.appendChild(c); });
      tb.appendChild(tr);
    });
    $('count-note').textContent = q ? ('Showing ' + shown + ' of ' + s.rows.length + ' rows.') : (s.rows.length + (s.rows.length === 1 ? ' row' : ' rows') + ' in this lecture.');
  }

  /* ---------- downloads (one file per section, never merged) ---------- */
  function safe(n) { return String(n).replace(/[\\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'lecture'; }
  $('dl-one').addEventListener('click', function () {
    if (!data || !data.sheets.length) { note('data-err', 'Nothing to download yet.'); return; }
    note('data-err', '');
    CNE_XLSX.download('CNE-' + H[sec].title + ' - ' + safe(data.sheets[0].name) + '.xlsx', data.sheets);
  });
  $('dl-all').addEventListener('click', function () {
    var b = this; b.disabled = true; note('data-err', '');
    call({ all: true }).then(function (r) {
      b.disabled = false;
      if (!r || !r.ok || !r.sheets) { note('data-err', fail(r)); return; }
      if (!r.sheets.length) { note('data-err', 'Nothing to download yet.'); return; }
      CNE_XLSX.download('CNE-' + H[sec].title + ' - all lectures.xlsx', r.sheets);
    }).catch(function () { b.disabled = false; note('data-err', 'Could not reach the server. Try again.'); });
  });

  /* ---------- events ---------- */
  document.querySelectorAll('[data-sec]').forEach(function (b) {
    b.addEventListener('click', function () { location.hash = b.getAttribute('data-sec'); });
  });
  $('back').addEventListener('click', function () { if (location.hash) history.back(); else goHome(); });
  window.addEventListener('hashchange', route);
  function signIn() {
    var v = $('pw').value;
    if (!v) { note('login-err', 'Enter the password.'); return; }
    setPw(v); note('login-err', ''); load();
  }
  $('login-btn').addEventListener('click', signIn);
  $('pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') signIn(); });
  $('tab').addEventListener('change', function () { $('filter').value = ''; load($('tab').value); });
  $('filter').addEventListener('input', function () { if (data) drawTable(); });
  $('refresh').addEventListener('click', function () { load(data && data.sheets[0] ? data.sheets[0].name : ''); });
  $('logout').addEventListener('click', function () { setPw(''); data = null; show('data', false); show('login', true); $('pw').value = ''; });

  route();
})();
