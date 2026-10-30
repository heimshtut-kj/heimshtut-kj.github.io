
(function () {
  var cfg = JSON.parse(document.getElementById("issue-data").textContent);
  var N = cfg.pages, ratio = cfg.h / cfg.w, book = document.getElementById("book");
  // page images: pNNN.jpg = display page (1600 px tall since Oct 29 2026); z/pNNN.webp = 3200 px zoom page, loaded only on zoom.
  // cfg.iv = image version (cache-buster), cfg.zoom = the issue has zoom pages.
  var IV = cfg.iv ? "?v=" + cfg.iv : "", pad = function (p) { return ("00" + p).slice(-3); };
  var B = cfg.base || "";   // archive issues: page images live in an archive repo (e.g. /archive-1/<id>/)
  function dispSrc(p) { return B + "p" + pad(p) + ".jpg" + IV; }
  function hiSrc(p) { return B + "z/p" + pad(p) + ".webp" + IV; }
  var webp = false, hiOK = false;            // hiOK: zoom pages exist AND this browser shows WebP (iPad Safari 14+)
  (function () { var t = new Image(); t.onload = function () { webp = t.width > 0; hiOK = webp && !!cfg.zoom; if (hiOK && bookHi) upgradeVisible(); };
    t.src = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA"; })();
  // fetch the zoom page in the background, then hand its URL over (no blank flash; on a slow line the display page stays meanwhile)
  var hiCache = {};
  function getHi(p, cb) {
    if (!hiOK) return false;
    if (hiCache[p] === true) { cb(hiSrc(p)); return true; }
    var w = hiCache[p]; if (!w) { w = hiCache[p] = []; var im = new Image(); im.decoding = "async";
      im.onload = function () { var q = hiCache[p]; hiCache[p] = true; (q || []).forEach(function (f) { f(hiSrc(p)); }); };
      im.onerror = function () { delete hiCache[p]; }; im.src = hiSrc(p); }
    if (w !== true) w.push(cb); return true;
  }
  // Yiddish paper reads right-to-left: build the pages in reverse so page 1 sits on the right of the spine
  var libToPage = function (i) { return N - i; };            // library index -> printed page number
  for (var i = 0; i < N; i++) {
    var p = libToPage(i), d = document.createElement("div");
    d.className = "page"; if (p === 1 || p === N) d.setAttribute("data-density", "hard");
    var im = document.createElement("img"); im.alt = "Page " + p; im.setAttribute("data-src", dispSrc(p)); im.setAttribute("data-p", p); im.decoding = "async";
    im.draggable = false; d.appendChild(im); book.appendChild(d);
  }
  var stage = document.querySelector(".stage");
  var Z = { s: 1, tx: 0, ty: 0, base: null, c: null };   // mouse-wheel zoom of the book itself (Oct 30 2026)
  var availH = stage.clientHeight - 40, availW = stage.clientWidth - 8;
  // two pages side by side only when that does not shrink the pages much (iPad portrait shows ONE big page, Oct 30 2026)
  function twoUp(w, h) { if (w < 700) return false; return Math.min(h, (w / 2) * ratio) >= 0.75 * Math.min(h, w * ratio); }
  var landscape = twoUp(availW, availH);
  var pageH = Math.min(availH, (landscape ? availW / 2 : availW) * ratio), pageW = pageH / ratio;
  function startLib() { var m = /p(\d+)/.exec(location.hash); var p = m ? Math.max(1, Math.min(N, +m[1])) : 1; return N - p; }
  var pf = new St.PageFlip(book, {
    width: Math.round(pageW), height: Math.round(pageH), size: "fixed",
    showCover: true, usePortrait: !landscape, startPage: startLib(), drawShadow: true, maxShadowOpacity: 0.45,
    flippingTime: 700, mobileScrollSupport: false, swipeDistance: 25, showPageCorners: true, disableFlipByClick: true
  });
  if (!landscape) pf.getSettings && (pf.getSettings().usePortrait = true);
  pf.loadFromHTML(book.querySelectorAll(".page"));
  var imgs = book.querySelectorAll(".page img");
  // a retina screen showing the pages bigger than the display image (big desktop monitors) gets the zoom pages in the book itself
  var bookHi = pageH * (window.devicePixelRatio || 1) > 1900;
  function load(i) { if (i < 0 || i >= N) return; var im = imgs[i]; if (im && !im.getAttribute("src")) im.src = im.getAttribute("data-src"); }
  function unload(i) {         // pages far from the open spread give their memory back (iPad Safari); they reload from cache
    var im = imgs[i]; if (im && im.getAttribute("src")) { im.removeAttribute("src"); im.removeAttribute("data-hi"); }
  }
  function upgrade(i) {        // swap a page in the book to its zoom image (pinch on the book, or a big retina screen)
    var im = imgs[i]; if (!im || im.getAttribute("data-hi")) return;
    var p = +im.getAttribute("data-p");
    im.setAttribute("data-hi", "1");
    if (!getHi(p, function (u) { if (im.getAttribute("data-hi")) im.src = u; })) im.removeAttribute("data-hi");
  }
  function upgradeVisible() { visible().forEach(upgrade); }
  function visible() {
    var i = pf.getCurrentPageIndex();
    if (pf.getOrientation() === "portrait") return [i];
    if (i === 0 || i === N - 1) return [i];
    return [i, i + 1];
  }
  var count = document.querySelector(".count"), next = document.getElementById("next"), prev = document.getElementById("prev");
  function update() {
    var v = visible(), cur = pf.getCurrentPageIndex();
    for (var k = cur - 4; k <= cur + 5; k++) load(k);
    for (var j = 0; j < N; j++) if (j < cur - 12 || j > cur + 13) unload(j);
    // only the open page(s) keep a sharp zoom image; others go back to the display image (iPad memory)
    for (var q = 0; q < N; q++) { var qi = imgs[q]; if (qi && qi.getAttribute("data-hi") && v.indexOf(q) < 0) { qi.removeAttribute("data-hi"); if (qi.getAttribute("src")) qi.src = qi.getAttribute("data-src"); } }
    if (bookHi || pinched() || Z.s > 1.2) upgradeVisible();
    var pages = v.map(libToPage).sort(function (a, b) { return a - b; });
    count.textContent = (pages.length > 1 ? pages[0] + "–" + pages[1] : pages[0]);
    count.setAttribute("aria-label", "Page " + count.textContent + " — type a page number to jump");
    try { history.replaceState(null, "", "#p" + pages[0]); } catch (e) {}
    next.disabled = pages[0] === N || pages[pages.length - 1] === N && pages.length > 1;
    prev.disabled = pages[0] === 1;
    if (coverBtn) coverBtn.disabled = pages[0] === 1;
    placeOverlay();
    announce(pages);
  }
  // analytics hook: one "heimshtut:page" event each time the visible page(s) change (flip, arrows, cover, #p link, first open).
  // The latest detail also stays on window.heimshtutPage for a script that loads after the first one fired.
  var ISSUE = document.body.getAttribute("data-issue") || (location.pathname.split("/").filter(Boolean).pop() || ""), lastKey = "";
  function announce(pages) {
    var key = pages.join(","); if (key === lastKey) return; lastKey = key;
    var detail = { issue: ISSUE, page: pages[0], pages_visible: pages.slice(), total: N };
    window.heimshtutPage = detail;
    try { window.dispatchEvent(new CustomEvent("heimshtut:page", { detail: detail })); } catch (e) {}
  }
  // overlay over the book: center fold (two-page spread only) + the left/right flip strips' hover hint. pointer-events: none.
  var ov = document.createElement("div"); ov.className = "bk-ov"; ov.setAttribute("aria-hidden", "true");
  var ARROW_L = '<svg viewBox="0 0 24 24"><path d="M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12z"/></svg>', ARROW_R = '<svg viewBox="0 0 24 24"><path d="M8.6 5.4 10 4l8 8-8 8-1.4-1.4 6.6-6.6z"/></svg>';
  ov.innerHTML = '<div class="crease"></div><div class="hz hz-l"><span>' + ARROW_L + '</span></div><div class="hz hz-r"><span>' + ARROW_R + '</span></div>';
  stage.appendChild(ov);
  var crease = ov.querySelector(".crease"), hzL = ov.querySelector(".hz-l"), hzR = ov.querySelector(".hz-r");
  var state = "read", vis = null;
  function blockRect() { var b = book.querySelector(".stf__block") || book; return b.getBoundingClientRect(); }
  function visRect() {         // screen rectangle of the page(s) showing now (the library's block; one half of it for a cover alone)
    var b = blockRect(); if (!b.width) return null;
    var r = { left: b.left, right: b.right, top: b.top, bottom: b.bottom }, v = visible();
    if (pf.getOrientation() !== "portrait" && v.length === 1) {
      var mid = b.left + b.width / 2;
      if (v[0] === N - 1) r.right = mid; else r.left = mid;   // front cover sits left of the spine (RTL), back cover right
    }
    return r;
  }
  function placeOverlay() {
    if (state !== "read") return;
    var s = stage.getBoundingClientRect(), v = visRect(); if (!v) return;
    vis = v;
    ov.style.left = (v.left - s.left) + "px"; ov.style.top = (v.top - s.top) + "px";
    ov.style.width = (v.right - v.left) + "px"; ov.style.height = (v.bottom - v.top) + "px";
    var spread = pf.getOrientation() !== "portrait" && visible().length === 2;
    ov.classList.toggle("spread", spread);
    var sw = stripW(); hzL.style.left = "0"; hzL.style.width = sw + "px"; hzR.style.right = "0"; hzR.style.width = sw + "px";
  }
  function stripW() { return Math.round((pf.getOrientation() === "portrait" ? pageW : 2 * pageW) * 0.18); }
  function zoneAt(x, y) {      // "l" | "r" | null — the outer strip of the visible page(s) under this point
    var v = vis || visRect(); if (!v || y < v.top || y > v.bottom || x < v.left || x > v.right) return null;
    var sw = Math.min(stripW(), (v.right - v.left) * 0.4);
    if (x <= v.left + sw) return "l"; if (x >= v.right - sw) return "r"; return null;
  }
  pf.on("flip", update); pf.on("changeOrientation", update);
  pf.on("changeState", function (e) {
    state = e.data; ov.classList.toggle("moving", state !== "read");
    if (state !== "read") { hzL.classList.remove("on"); hzR.classList.remove("on"); } else placeOverlay();
  });
  var coverBtn = document.getElementById("cover");
  update();
  // reading "next" = library previous (the page turns from the left over to the right)
  function go(dir) {           // dir +1 = next page in reading order
    var v = visible(), lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
    var t = dir > 0 ? lo - 1 : hi + 1;
    if (t < 0 || t >= N) return;
    hideHint();
    if (pf.getOrientation() === "portrait") {
      if (dir < 0) { pf.flipNext("bottom"); return; }
      dragRight();               // the library's portrait flipPrev() does not animate; a drag from the left edge does
      return;
    }
    pf.flip(t, "bottom");
  }
  var dragging = false;
  function dragRight() {
    if (dragging) return; dragging = true;
    var r = book.getBoundingClientRect(), y = r.top + r.height * 0.62, x0 = r.left + 12, x1 = r.left + r.width * 0.95, k = 0, steps = 14;
    var target = document.elementFromPoint(x0, y) || book;
    function ev(type, x, el) { (el || target).dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pageX: x + window.scrollX, pageY: y + window.scrollY, button: 0, buttons: type === "mouseup" ? 0 : 1, view: window })); }
    ev("mousedown", x0);
    (function step() {
      k++; var x = x0 + (x1 - x0) * k / steps; ev("mousemove", x, target); ev("mousemove", x, window.document);
      if (k < steps) requestAnimationFrame(step); else { ev("mouseup", x1, target); ev("mouseup", x1, window.document); setTimeout(function () { dragging = false; }, 750); }
    })();
  }
  // ONE click/tap = ONE flip (Oct 29 2026 fix; yossi: "each click, two pages at a time").
  // page-flip 2.0.7 turns the page BY ITSELF when a page corner is clicked or held-tapped (>250 ms), even with
  // disableFlipByClick; the corners sit inside our flip strips, so the strip used to flip a second time after it.
  // Every flip the library starts (its own corner/drag/swipe or ours) bumps flipSeq; a click/tap remembers flipSeq at
  // press time and the strip only acts if nothing has flipped since. Requests closer than GAP ms are one request.
  var flipSeq = 0, lastFlipAt = 0, lastReqAt = 0, lastTouchEnd = 0, pendT = null, GAP = 500;   // 500 ms = the usual double-click time
  pf.on("changeState", function (e) { if (e.data === "flipping" || e.data === "user_fold") { flipSeq++; lastFlipAt = Date.now(); } });
  function request(dir) {      // every page move from a button, strip, or key comes through here
    if (zoomed()) resetZoom();
    var now = Date.now();
    if (now - lastReqAt < GAP || now - lastFlipAt < GAP) return;   // double-click / bounce / a flip just started: once
    lastReqAt = now; clearTimeout(pendT);
    // a deliberate next click while the page is still turning: run it once the book is at rest
    (function w() { if (state === "read" && !dragging) go(dir); else if (Date.now() - now < 1200) pendT = setTimeout(w, 40); })();
  }
  next.onclick = function (e) { e.stopPropagation(); request(1); };
  prev.onclick = function (e) { e.stopPropagation(); request(-1); };
  // run a page move once the book is at rest (a corner curl may still be settling after a click)
  function whenIdle(fn) { var t0 = Date.now(); (function w() { if (state === "read" && !dragging) fn(); else if (Date.now() - t0 < 900) setTimeout(w, 40); })(); }
  // front-cover button: straight back to page 1
  function goCover() {
    var v = visible(); if (v.indexOf(N - 1) >= 0) return;
    hideHint();
    pf.flip(N - 1, "bottom");
    setTimeout(function () { if (visible().indexOf(N - 1) < 0 && state === "read") { pf.turnToPage(N - 1); update(); } }, 1200);
  }
  if (coverBtn) coverBtn.onclick = function (e) { e.stopPropagation(); if (zoomed()) resetZoom(); var n = Date.now(); if (n - lastReqAt < GAP) return; lastReqAt = n; whenIdle(goCover); };
  // go to a typed page (Oct 30 2026, yossi: "jump to a specific page when typing the page number").
  // Printed page N = flipbook page N. Same guard as every other move: one request per GAP, run when the book is at rest.
  function jumpTo(p) {
    p = Math.max(1, Math.min(N, p | 0)); if (!p) return;
    if (zoomed()) resetZoom();
    var n = Date.now(); if (n - lastReqAt < GAP || n - lastFlipAt < GAP) return; lastReqAt = n; clearTimeout(pendT);
    whenIdle(function () {
      if (visible().map(libToPage).indexOf(p) >= 0) return;
      hideHint(); pf.turnToPage(N - p); lastFlipAt = Date.now(); update();
    });
  }
  var gotoForm = document.querySelector(".goto"), gotoInput = gotoForm && gotoForm.querySelector("input");
  function openGoto(first) {
    if (!gotoForm) return;
    gotoForm.hidden = false; count.classList.add("editing");
    gotoInput.value = first || ""; gotoInput.setAttribute("max", N); gotoInput.focus();
    if (first) { try { gotoInput.setSelectionRange(first.length, first.length); } catch (e) {} }
  }
  function closeGoto() { if (!gotoForm || gotoForm.hidden) return; gotoForm.hidden = true; count.classList.remove("editing"); }
  count.addEventListener("click", function (e) { e.stopPropagation(); openGoto(""); });
  if (gotoForm) {
    gotoForm.addEventListener("submit", function (e) {
      e.preventDefault(); var v = parseInt(gotoInput.value, 10); closeGoto(); gotoInput.blur();
      if (!isNaN(v)) jumpTo(v);
    });
    gotoInput.addEventListener("keydown", function (e) { e.stopPropagation(); if (e.key === "Escape") { closeGoto(); gotoInput.blur(); } });
    gotoInput.addEventListener("input", function () { gotoInput.value = gotoInput.value.replace(/\D/g, "").slice(0, 4); });
    gotoInput.addEventListener("blur", function () { setTimeout(closeGoto, 150); });
  }
  // the whole outer strip on each side flips (left = next, right = back, like the arrows); the center stays for zoom and swipe
  function stripFlip(z, seq, idx) {  // a strip click/tap: flip only if the library has not already flipped for this same press
    setTimeout(function () { if (flipSeq === seq && pf.getCurrentPageIndex() === idx) request(z === "l" ? 1 : -1); }, 60);
  }
  // a press that lands right after a flip (the 2nd click of a double-click, or the mouse events a touch screen adds after a
  // tap) never reaches the library, so its corner-click flip cannot run a second time
  function tooSoon(touch) { var n = Date.now(); return n - lastFlipAt < GAP || n - lastReqAt < GAP || (!touch && n - lastTouchEnd < 800); }
  var down = null;
  book.addEventListener("mousedown", function (e) {
    if (!e.isTrusted) return;                                // our own portrait drag (dragRight) must reach the library
    if (tooSoon(false)) { e.stopPropagation(); down = null; return; }
    down = { x: e.clientX, y: e.clientY, seq: flipSeq, idx: pf.getCurrentPageIndex() };
  }, true);
  book.addEventListener("click", function (e) {
    var d = down; down = null;
    if (Date.now() - lastTouchEnd < 800) return;           // the mouse "click" a touch screen adds after a tap: already handled
    if (!d || Math.abs(e.clientX - d.x) > 6 || Math.abs(e.clientY - d.y) > 6) return;
    var z = zoneAt(e.clientX, e.clientY); if (!z) return;
    stripFlip(z, d.seq, d.idx);
  });
  var tStart = null, stripTap = false;
  book.addEventListener("touchstart", function (e) {
    var soon = e.touches.length === 1 && tooSoon(true); if (soon) e.stopPropagation();   // a tap right after a flip: ignored whole
    var t = e.changedTouches[0]; tStart = (e.touches.length === 1 && t && !soon) ? { x: t.clientX, y: t.clientY, at: Date.now(), seq: flipSeq, idx: pf.getCurrentPageIndex() } : null;
  }, { passive: true, capture: true });
  book.addEventListener("touchend", function (e) {
    stripTap = false; lastTouchEnd = Date.now(); var t = e.changedTouches[0]; if (!tStart || !t) return;
    var moved = Math.abs(t.clientX - tStart.x) > 12 || Math.abs(t.clientY - tStart.y) > 12, quick = Date.now() - tStart.at < 450;
    var dx = t.clientX - tStart.x, dy = Math.abs(t.clientY - tStart.y), seq = tStart.seq, idx = tStart.idx;
    if (moved && Math.abs(dx) > 25 && dy < 60 && Date.now() - tStart.at < 400) {
      // a quick sideways swipe the library did not turn (phone portrait, finger to the right = next page): turn it once
      tStart = null;
      setTimeout(function () { if (flipSeq === seq && pf.getCurrentPageIndex() === idx && state === "read") request(dx > 0 ? 1 : -1); }, 80);
      return;
    }
    var z = !moved && quick ? zoneAt(tStart.x, tStart.y) : null; tStart = null; if (!z) return;
    stripTap = true;
    stripFlip(z, seq, idx);
  }, { capture: true });
  if (window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    book.addEventListener("mousemove", function (e) {
      var z = state === "read" ? zoneAt(e.clientX, e.clientY) : null;
      var can = z === "l" ? !next.disabled : z === "r" ? !prev.disabled : false;
      hzL.classList.toggle("on", z === "l" && can); hzR.classList.toggle("on", z === "r" && can);
      book.style.cursor = can ? "pointer" : "";
    });
    book.addEventListener("mouseleave", function () { hzL.classList.remove("on"); hzR.classList.remove("on"); book.style.cursor = ""; });
  }
  // a #p deep link typed or tapped while the reader is open
  window.addEventListener("hashchange", function () {   // (our own page moves use replaceState, which never fires this)
    if (state !== "read") return;
    var m = /p(\d+)/.exec(location.hash); if (!m) return; var p = Math.max(1, Math.min(N, +m[1]));
    if (visible().map(libToPage).indexOf(p) >= 0) return; pf.turnToPage(N - p); update();
  });
  document.addEventListener("keydown", function (e) {
    if (zoomer.classList.contains("on")) { if (e.key === "Escape") closeZoom(); return; }
    if (e.target && e.target === gotoInput) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (/^[0-9]$/.test(e.key)) { e.preventDefault(); openGoto(e.key); return; }        // just type a page number
    if (e.key === "Escape" && zoomed()) { resetZoom(); return; }
    if (e.key === "+" || e.key === "=") { zoomBy(1.4); return; }
    if (e.key === "-" || e.key === "_") { zoomBy(1 / 1.4); return; }
    if (e.key === "ArrowLeft") request(1); else if (e.key === "ArrowRight") request(-1);
  });
  var hints = document.querySelectorAll(".hint");
  function hideHint() { for (var h = 0; h < hints.length; h++) hints[h].style.opacity = 0; }
  setTimeout(function () { var d = document.querySelector(".hint-desk"); if (d) d.style.opacity = 0; }, 7000);
  pf.on("changeState", function (e) { if (e.data === "user_fold" || e.data === "flipping") hideHint(); });
  // zoom: the visible page(s) full-width, scrollable, pinch-zoom; tap a page for 2x
  var zoomer = document.querySelector(".zoomer"), zp = zoomer.querySelector(".zp"), zhint = zoomer.querySelector(".zc span");
  var zText = zhint.textContent, zLoading = "Loading the sharp page…";
  document.getElementById("zoom").onclick = function () {
    zp.innerHTML = ""; var waiting = 0;
    visible().map(libToPage).sort(function (a, b) { return a - b; }).forEach(function (p) {
      var im = document.createElement("img"); im.src = dispSrc(p); im.alt = "Page " + p; im.decoding = "async";
      im.onclick = zoomTap; zp.appendChild(im);
      // the sharp 3200 px page replaces the display page as soon as it has downloaded
      if (getHi(p, function (u) { if (im.parentNode) im.src = u; done(); })) { waiting++; }
    });
    zhint.textContent = zText;
    function done() { if (--waiting <= 0) zhint.textContent = zText; }
    if (waiting) setTimeout(function () { if (waiting > 0) zhint.textContent = zLoading; }, 250);
    zoomer.classList.remove("big", "huge"); zoomer.classList.add("on"); zoomer.scrollTo(0, 0);
  };
  // tap the zoomed page: fit -> 2.5x -> 4x (phones; 2000 / 2600 px wide on big screens) -> fit, keeping the tapped spot
  // under the finger, so small photo captions can be read (yossi, Oct 29: page 65 captions)
  function zoomTap(e) {
    var im = e.currentTarget, r = im.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    var big = zoomer.classList.contains("big"), huge = zoomer.classList.contains("huge");
    zoomer.classList.toggle("big", !big && !huge); zoomer.classList.toggle("huge", big);
    if (huge) return;
    var r2 = im.getBoundingClientRect();
    zoomer.scrollLeft += (r2.left + fx * r2.width) - e.clientX; zoomer.scrollTop += (r2.top + fy * r2.height) - e.clientY;
  }
  function closeZoom() { zoomer.classList.remove("on"); }
  zoomer.querySelector("button").onclick = closeZoom;
  // double-tap on the book also opens the zoom
  var lastTap = 0;
  book.addEventListener("touchend", function () { if (stripTap) { lastTap = 0; return; } var t = Date.now(); if (t - lastTap < 300) document.getElementById("zoom").click(); lastTap = t; });
  book.addEventListener("dblclick", function (e) { if (zoomed()) { resetZoom(); return; } if (zoneAt(e.clientX, e.clientY)) return; document.getElementById("zoom").click(); });

  // ---- mouse-wheel zoom on the book (Oct 30 2026, yossi: "scroll the mouse to zoom in and out") ----
  // The wheel over the page(s) zooms the book in place toward the cursor (1x to 5x); the sharp 3200 px zoom pages load
  // past 1.2x. While zoomed: drag to move around, double-click / Esc / Reset back to normal; any page turn resets first.
  // The library never sees mouse events while zoomed, so a pan or a click cannot turn a page.
  var MAXZ = 5, zbadge = document.querySelector(".zbadge"), zpct = zbadge && zbadge.querySelector("span");
  function zoomed() { return Z.s > 1.001; }
  function contentRect() { var v = visRect(); return v; }
  function applyZ() {
    var on = zoomed();
    book.style.transformOrigin = "0 0";
    book.style.transform = on ? "translate(" + Z.tx.toFixed(1) + "px," + Z.ty.toFixed(1) + "px) scale(" + Z.s.toFixed(4) + ")" : "";
    stage.classList.toggle("zoomed", on); ov.style.visibility = on ? "hidden" : "";
    if (zbadge) { zbadge.hidden = !on; if (zpct) zpct.textContent = Math.round(Z.s * 100) + "%"; }
    if (Z.s > 1.2) upgradeVisible();
  }
  function clampPan() {
    if (!Z.base || !Z.c) return;
    var S = stage.getBoundingClientRect(), pad = 8;
    function ax(start, size, cOff, cSize, t) {           // keep the visible page(s) on screen
      var w = cSize * Z.s, L = start + t + cOff * Z.s, lo, hi;
      if (w <= size.len - 2 * pad) { lo = size.lo + pad; hi = size.lo + size.len - pad - w; } else { lo = size.lo + size.len - pad - w; hi = size.lo + pad; }
      L = Math.max(lo, Math.min(hi, L)); return L - start - cOff * Z.s;
    }
    Z.tx = ax(Z.base.left, { lo: S.left, len: S.width }, Z.c.l, Z.c.w, Z.tx);
    Z.ty = ax(Z.base.top, { lo: S.top, len: S.height }, Z.c.t, Z.c.h, Z.ty);
  }
  function zoomAt(cx, cy, ns) {
    if (state !== "read") return;
    if (!zoomed()) {
      var b = book.getBoundingClientRect(), v = contentRect(); if (!b.width || !v) return;
      Z.base = { left: b.left, top: b.top }; Z.c = { l: v.left - b.left, t: v.top - b.top, w: v.right - v.left, h: v.bottom - v.top };
      hzL.classList.remove("on"); hzR.classList.remove("on"); hideHint();
    }
    ns = Math.max(1, Math.min(MAXZ, ns));
    var bx = (cx - Z.base.left - Z.tx) / Z.s, by = (cy - Z.base.top - Z.ty) / Z.s;
    Z.tx = cx - Z.base.left - bx * ns; Z.ty = cy - Z.base.top - by * ns; Z.s = ns;
    if (ns <= 1.02) { Z.s = 1; Z.tx = 0; Z.ty = 0; } else clampPan();
    applyZ();
  }
  function zoomBy(f) {
    var v = zoomed() && Z.base ? null : contentRect(), S = stage.getBoundingClientRect();
    var cx = v ? (v.left + v.right) / 2 : S.left + S.width / 2, cy = v ? (v.top + v.bottom) / 2 : S.top + S.height / 2;
    zoomAt(cx, cy, Z.s * f);
  }
  function resetZoom() { if (!zoomed() && !book.style.transform) return; Z.s = 1; Z.tx = 0; Z.ty = 0; pan = null; stage.classList.remove("panning"); applyZ(); placeOverlay(); }
  function overPages(x, y) { var v = vis || visRect(); return !!v && x >= v.left && x <= v.right && y >= v.top && y <= v.bottom; }
  stage.addEventListener("wheel", function (e) {
    if (zoomer.classList.contains("on")) return;
    if (!zoomed() && !overPages(e.clientX, e.clientY)) return;     // off the book: the wheel does nothing special
    e.preventDefault();
    var dy = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
    dy = Math.max(-150, Math.min(150, dy));
    zoomAt(e.clientX, e.clientY, Z.s * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0022)));
  }, { passive: false });
  var pan = null;
  stage.addEventListener("mousedown", function (e) {
    if (!zoomed() || !e.isTrusted) return;
    if (e.target.closest && e.target.closest(".zbadge")) return;
    e.preventDefault(); e.stopPropagation();
    if (e.button !== 0) return;
    pan = { x: e.clientX, y: e.clientY, tx: Z.tx, ty: Z.ty }; stage.classList.add("panning");
  }, true);
  window.addEventListener("mousemove", function (e) {
    if (!zoomed()) return;
    if (pan) { Z.tx = pan.tx + e.clientX - pan.x; Z.ty = pan.ty + e.clientY - pan.y; clampPan(); applyZ(); }
    if (stage.contains(e.target)) e.stopPropagation();          // no corner curl / hover strips while zoomed
  }, true);
  window.addEventListener("mouseup", function (e) {
    if (pan) { pan = null; stage.classList.remove("panning"); e.stopPropagation(); }
  }, true);
  book.addEventListener("touchstart", function () { if (zoomed()) resetZoom(); }, { passive: true, capture: true });
  if (zbadge) zbadge.querySelector("button").addEventListener("click", function (e) { e.stopPropagation(); resetZoom(); });
  var zin = document.getElementById("zin"), zout = document.getElementById("zout");
  if (zin) zin.onclick = function (e) { e.stopPropagation(); zoomBy(1.4); };
  if (zout) zout.onclick = function (e) { e.stopPropagation(); zoomBy(1 / 1.4); };
  // the controls bar lines up with the book's edges (--bw)
  function setBW() { var w = book.getBoundingClientRect().width; if (w) document.documentElement.style.setProperty("--bw", Math.round(w) + "px"); }
  setBW();
  // pinch-zoom on the book itself (the browser's own zoom): the visible pages switch to the sharp zoom images
  function pinched() { var vv = window.visualViewport; return !!(vv && vv.scale > 1.15); }
  if (window.visualViewport) visualViewport.addEventListener("resize", function () { if (pinched()) upgradeVisible(); });
  var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () {
    var nl = twoUp(stage.clientWidth - 8, stage.clientHeight - 40); if (nl !== landscape) location.reload(); else { resetZoom(); placeOverlay(); setBW(); } }, 400); });
})();
