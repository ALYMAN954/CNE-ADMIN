(function () {
  'use strict';
  var STAGE_W = 1920, STAGE_H = 1080, POLL_MS = 60000, KEY = 'cne_screen_last';
  var cfgSrc = (window.HUB && window.HUB.attendance && window.HUB.attendance.api) || '';
  var stage = document.getElementById('stage');

  function place() {
    var s = Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
    var x = (window.innerWidth - STAGE_W * s) / 2, y = (window.innerHeight - STAGE_H * s) / 2;
    stage.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
  }
  window.addEventListener('resize', place); place();

  // Shrink the text until it fits its box (28px minimum, 72px maximum)
  function fit(el, text) {
    el.textContent = text || '—';
    var box = el.parentNode, max = box.clientHeight - 44, size = 72;
    el.style.fontSize = size + 'px';
    while (size > 28 && (el.scrollHeight > max || el.scrollWidth > el.clientWidth + 1)) { size -= 2; el.style.fontSize = size + 'px'; }
  }
  var cur = { topic: '', speaker: '' };
  function show(d) {
    cur = { topic: d.topic || '', speaker: d.speaker || '' };
    fit(document.getElementById('topic'), cur.topic);
    fit(document.getElementById('speaker'), cur.speaker);
  }
  function refit() { show(cur); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);

  try { var last = JSON.parse(localStorage.getItem(KEY) || 'null'); if (last) show(last); else show(cur); } catch (e) { show(cur); }

  function poll() {
    if (!cfgSrc) return;
    fetch(cfgSrc + (cfgSrc.indexOf('?') > -1 ? '&' : '?') + 'action=config&_=' + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (c) {
        if (!c || !c.ok) return;
        var d = { topic: c.topic || '', speaker: c.speaker || '' };
        if (d.topic !== cur.topic || d.speaker !== cur.speaker) show(d);
        try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
      }).catch(function () { /* keep showing the last names */ });
  }
  poll(); setInterval(poll, POLL_MS);
})();
