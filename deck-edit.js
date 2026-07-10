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
  var SEL = [
    '.h-cover', '.ttl', '.ln2', '.h-div', '.h-state', '.h-sec', '.kwhead', '.lead',
    '.overline', '.kick', '.vbig', '.vwhy span', '.toc .t', '.toc .sub', '.cap',
    '.bname', '.aname', '.mname', '.clsub', '.devlab', '.pl', '.vt', '.vd'
  ].join(',');
  var skip = function (el) { return el.closest('#chrome') || el.closest('#edbar') || el.closest('.rl') || el.closest('.rr') || el.id === 'pgno'; };

  function hash(s) { var h = 5381, i = s.length; while (i) h = (h * 33) ^ s.charCodeAt(--i); return 'k' + (h >>> 0).toString(36); }
  function b64enc(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64dec(b) { try { return decodeURIComponent(escape(atob(b.replace(/\n/g, '')))); } catch (e) { return ''; } }

  /* Assign each copy element a stable key from its pristine default (survives reordering). */
  var seen = {}, map = {}, defaults = {};
  [].slice.call(document.querySelectorAll(SEL))
    .filter(function (el) { return !skip(el) && el.textContent.trim(); })
    .forEach(function (el) {
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
    '#edbar{position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#111214;color:#fff;' +
    'font:500 13px/1.4 -apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;display:flex;' +
    'align-items:center;gap:14px;padding:12px 18px;box-shadow:0 -8px 30px -12px rgba(0,0,0,.55)}' +
    '#edbar b{color:#98A6F4}#edbar .sp{flex:1}#edbar .msg{color:#c9c9d1;font-weight:400}' +
    '#edbar button{font:inherit;font-weight:600;border:0;border-radius:8px;padding:9px 16px;cursor:pointer}' +
    '#edbar .save{background:#4E61D6;color:#fff}#edbar .loc{background:#2a2a30;color:#fff}#edbar .rst{background:transparent;color:#8b8b92}';
  document.head.appendChild(css);
  /* keep clicks + keystrokes inside the text box; the deck navigates on click/space/arrows otherwise */
  var stop = function (e) { e.stopPropagation(); };
  document.querySelectorAll('[data-ekey]').forEach(function (el) {
    el.setAttribute('contenteditable', 'true'); el.spellcheck = false;
    el.addEventListener('mousedown', stop); el.addEventListener('click', stop); el.addEventListener('keydown', stop);
  });

  var bar = document.createElement('div'); bar.id = 'edbar';
  bar.addEventListener('mousedown', stop); bar.addEventListener('click', stop); bar.addEventListener('keydown', stop);
  bar.innerHTML = '<b>Edit mode</b><span class="msg" id="edmsg">click any highlighted text to edit</span>' +
    '<span class="sp"></span><button class="rst" id="edrst">Reset local</button>' +
    '<button class="loc" id="edloc">Save locally</button><button class="save" id="edsave">Save &amp; publish</button>';
  document.body.appendChild(bar);
  var msg = function (t) { document.getElementById('edmsg').textContent = t; };

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
