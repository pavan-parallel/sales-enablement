/* deck-edit.js — hidden inline copy editor for the Sequoia decks.
   VIEW: every visitor loads published copy edits from copy-overrides.json.
   EDIT: open any deck with ?edit  → click text, edit, Save locally / Save & publish.
   Publish commits copy-overrides.json to GitHub via the API using a token you
   paste once per browser session (never stored in the file). Copy only. */
(function () {
  var OWNER = 'pavan-parallel', REPO = 'sales-enablement', BRANCH = 'main', FILE = 'copy-overrides.json';
  var PAGE = (location.pathname.split('/').pop() || 'index.html');
  var EDIT = /[?&]edit(=|&|$)/.test(location.search);

  /* Which elements count as editable copy. Running labels, page number and nav are never touched. */
  function hash(s) { var h = 5381, i = s.length; while (i) h = (h * 33) ^ s.charCodeAt(--i); return 'k' + (h >>> 0).toString(36); }
  function b64enc(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64dec(b) { try { return decodeURIComponent(escape(atob(b.replace(/\n/g, '')))); } catch (e) { return ''; } }

  function skip(el) {
    if (el.closest('#chrome') || el.closest('#edbar') || el.closest('#edtoast') || el.closest('.rl') || el.closest('.rr')) return true;
    if (/^(BUTTON|SVG|IMG|PATH|USE|INPUT|TABLE|THEAD|TBODY|TR|IFRAME)$/i.test(el.tagName)) return true;
    if (el.id === 'pgno') return true;
    return false;
  }
  function inlineDisp(el) {   /* judged by how it actually renders, not by tag */
    if (el.tagName === 'BR') return true;
    var d = getComputedStyle(el).display;
    return d === 'inline' || d === 'inline-block' || d === 'inline-flex' || d === 'contents';
  }
  function leafText(el) {   /* a single text field: has text, and any children only flow inline within it */
    if (!el.textContent.trim()) return false;
    for (var c = el.firstElementChild; c; c = c.nextElementSibling) { if (!inlineDisp(c)) return false; }
    return true;
  }

  /* Auto-detect every copy block inside the slides; key each by its pristine default (reorder-safe). */
  var seen = {}, map = {}, defaults = {};
  [].slice.call(document.querySelectorAll('.slide *')).forEach(function (el) {
    if (el.hasAttribute('data-ekey') || skip(el) || !leafText(el)) return;
    if (el.parentElement && el.parentElement.closest('[data-ekey]')) return;   /* one owner per block, no nesting */
    var t = el.textContent.trim();
    if (t.length < 2 || /^[\d.,%$/+\-\s:apmAPM]+$/.test(t)) return;             /* skip pure numbers / tiny labels */
    var d = el.innerHTML.trim(), k = hash(d);
    if (seen[k] != null) { seen[k]++; k = k + '_' + seen[k]; } else { seen[k] = 0; }
    el.setAttribute('data-ekey', k); map[k] = el; defaults[k] = d;
  });

  function apply(ov) { if (!ov) return; Object.keys(ov).forEach(function (k) { if (map[k]) map[k].innerHTML = ov[k]; }); }

  /* Local edits apply instantly (and win while you present); published edits fill in the rest. */
  var localOv = JSON.parse(localStorage.getItem('copyov:' + PAGE) || '{}');
  apply(localOv);
  fetch(FILE + '?t=' + Date.now()).then(function (r) { return r.ok ? r.json() : null; }).then(function (all) {
    if (all && all[PAGE]) { var rem = all[PAGE]; Object.keys(rem).forEach(function (k) { if (localOv[k] == null && map[k]) map[k].innerHTML = rem[k]; }); }
  }).catch(function () {});

  if (!EDIT) return;                     /* view mode stops here */

  /* ---------- EDIT MODE ---------- */
  var css = document.createElement('style');
  css.textContent =
    '[data-ekey]{cursor:text}' +
    '[data-ekey]:hover{outline:1.5px dashed rgba(78,97,214,.55);outline-offset:4px;border-radius:3px}' +
    '[data-ekey]:focus{outline:2px solid #4E61D6;outline-offset:4px;border-radius:3px;background:rgba(78,97,214,.07)}' +
    '#edbar{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;display:flex;align-items:center;gap:6px;' +
    'background:rgba(17,18,20,.9);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-radius:999px;padding:5px;' +
    'box-shadow:0 10px 30px -10px rgba(0,0,0,.5);font:600 12.5px/1 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif}' +
    '#edbar button{font:inherit;border:0;border-radius:999px;padding:8px 15px;cursor:pointer;color:#fff}' +
    '#edbar .save{background:#4E61D6}#edbar .loc{background:#33343a}#edbar .rst{background:transparent;color:#8b8b92;padding:8px 11px}' +
    '#edtoast{position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:99999;max-width:70vw;' +
    'background:#111214;color:#e8e8ee;font:500 12.5px/1.45 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;' +
    'padding:9px 14px;border-radius:10px;box-shadow:0 10px 30px -10px rgba(0,0,0,.5);opacity:0;transition:opacity .2s;pointer-events:none}' +
    '#edtoast.show{opacity:1}';
  document.head.appendChild(css);
  /* keep clicks + keystrokes inside the text box; the deck navigates on click/space/arrows otherwise */
  var stop = function (e) { e.stopPropagation(); };
  document.querySelectorAll('[data-ekey]').forEach(function (el) {
    el.setAttribute('contenteditable', 'true'); el.spellcheck = false;
    el.addEventListener('mousedown', stop); el.addEventListener('click', stop); el.addEventListener('keydown', stop);
  });

  var toast = document.createElement('div'); toast.id = 'edtoast'; document.body.appendChild(toast);
  var bar = document.createElement('div'); bar.id = 'edbar';
  bar.innerHTML = '<button class="rst" id="edrst" title="Reset local edits">Reset</button>' +
    '<button class="loc" id="edloc">Save locally</button><button class="save" id="edsave">Save &amp; publish</button>';
  document.body.appendChild(bar);
  [bar, toast].forEach(function (x) { x.addEventListener('mousedown', stop); x.addEventListener('click', stop); x.addEventListener('keydown', stop); });
  var tmr, msg = function (t) { toast.textContent = t; toast.classList.add('show'); clearTimeout(tmr); tmr = setTimeout(function () { toast.classList.remove('show'); }, 6000); };

  function collect() { var ov = {}; Object.keys(map).forEach(function (k) { var c = map[k].innerHTML.trim(); if (c !== defaults[k]) ov[k] = c; }); return ov; }

  document.getElementById('edloc').onclick = function () {
    var ov = collect(); localStorage.setItem('copyov:' + PAGE, JSON.stringify(ov));
    msg('saved locally — ' + Object.keys(ov).length + ' change(s), this browser only');
  };
  document.getElementById('edrst').onclick = function () {
    if (!confirm('Clear local copy edits on this page? (published copy stays)')) return;
    localStorage.removeItem('copyov:' + PAGE); location.reload();
  };
  document.getElementById('edsave').onclick = function () {
    var ov = collect(); localStorage.setItem('copyov:' + PAGE, JSON.stringify(ov));
    var token = sessionStorage.getItem('ghtoken');
    if (!token) {
      token = (prompt('Paste your GitHub token (kept only for this browser session):') || '').trim();
      if (!token) { msg('cancelled — saved locally only'); return; }
      sessionStorage.setItem('ghtoken', token);
    }
    msg('publishing…');
    var api = 'https://api.github.com/repos/' + OWNER + '/' + REPO + '/contents/' + FILE;
    var H = { Authorization: 'token ' + token, Accept: 'application/vnd.github+json' };
    fetch(api + '?ref=' + BRANCH + '&t=' + Date.now(), { headers: H })
      .then(function (r) { return r.status === 404 ? {} : r.json(); })
      .then(function (cur) {
        var sha = cur && cur.sha, all = {};
        if (cur && cur.content) { try { all = JSON.parse(b64dec(cur.content)) || {}; } catch (e) { all = {}; } }
        all[PAGE] = ov;
        var body = { message: 'copy edit via ?edit — ' + PAGE, content: b64enc(JSON.stringify(all, null, 2)), branch: BRANCH };
        if (sha) body.sha = sha;
        return fetch(api, { method: 'PUT', headers: H, body: JSON.stringify(body) });
      })
      .then(function (r) {
        if (r.ok) { msg('published ✓ — committing now, live in ~10 min. Keep presenting; don’t refresh until then.'); }
        else { if (r.status === 401 || r.status === 403) sessionStorage.removeItem('ghtoken'); r.json().then(function (e) { msg('publish failed: ' + (e.message || r.status) + ' — but saved locally'); }); }
      })
      .catch(function (e) { msg('publish error: ' + e.message + ' — but saved locally'); });
  };
})();
