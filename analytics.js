/* Heimshtut site analytics: Microsoft Clarity + Google Analytics 4.
   One file for every page. IDs live here only. Never shows anything on the page. */
(function () {
  "use strict";
  var GA_ID = "";              // Google Analytics 4 measurement id (G-XXXXXXX); empty = GA off
  var CLARITY_ID = "z5fycm4m0o"; // Microsoft Clarity project id
  var w = window, d = document;
  if (/^(localhost|127\.)/.test(location.hostname)) { w.__heimAnalyticsLocal = true; }

  var body = d.body || d.documentElement;
  var issue = (body && body.getAttribute("data-issue")) || "";
  var area = issue ? "reader" : (location.pathname.replace(/\/index\.html$/, "/").replace(/^\/+|\/+$/g, "") || "home");

  /* ---- Microsoft Clarity ---- */
  if (CLARITY_ID) {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(w, d, "clarity", "script", CLARITY_ID);
  }
  function cl() { try { if (w.clarity) w.clarity.apply(null, arguments); } catch (e) {} }

  /* ---- Google Analytics 4 ---- */
  w.dataLayer = w.dataLayer || [];
  function gtag() { w.dataLayer.push(arguments); }
  if (GA_ID) {
    w.gtag = gtag;
    var s = d.createElement("script"); s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    (d.head || body).appendChild(s);
    gtag("js", new Date());
    var cfg = { site_area: area };
    if (issue) cfg.issue = issue;
    gtag("config", GA_ID, cfg);
  }
  function ev(name, params, beacon) {
    params = params || {};
    if (issue && !params.issue) params.issue = issue;
    params.site_area = area;
    if (beacon) params.transport_type = "beacon";
    if (GA_ID) { try { gtag("event", name, params); } catch (e) {} }
    cl("event", name);
  }
  w.heimTrack = ev;

  cl("set", "site_area", area);
  if (issue) { cl("set", "issue", issue); ev("issue_view", {}); }

  /* ---- Reader: page views and time on each newspaper page ---- */
  var cur = null, curStart = 0, shown = !d.hidden, MAX = 600;
  function now() { return Date.now(); }
  function flush(beacon) {
    if (cur === null || !shown) return;
    var secs = Math.round((now() - curStart) / 1000);
    curStart = now();
    if (secs < 1) return;
    if (secs > MAX) secs = MAX;
    ev("page_time", { page_number: cur, seconds: secs }, beacon);
  }
  w.addEventListener("heimshtut:page", function (e) {
    var det = (e && e.detail) || {};
    var p = parseInt(det.page, 10);
    if (!p || p === cur) return;
    flush(false);
    cur = p; curStart = now();
    ev("page_view_in_issue", { page_number: p, issue: det.issue || issue });
    cl("set", "last_page", String(p));
  });
  d.addEventListener("visibilitychange", function () {
    if (d.hidden) { flush(true); shown = false; }
    else { shown = true; curStart = now(); }
  });
  if (w.heimshtutPage) { try { w.dispatchEvent(new CustomEvent("heimshtut:page", { detail: w.heimshtutPage })); } catch (e) {} }
  w.addEventListener("pagehide", function () { flush(true); shown = false; });

  /* ---- Clicks: PDF downloads, archive cards, outbound links, buttons ---- */
  function label(el) {
    var t = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();
    return t.slice(0, 80);
  }
  d.addEventListener("click", function (e) {
    var el = e.target && e.target.closest ? e.target.closest("a,button") : null;
    if (!el) return;
    var href = el.getAttribute("href") || "";
    var abs = el.href || "";
    var lab = label(el);
    if (/\.pdf(\?|#|$)/i.test(href)) {
      var m = href.match(/issues\/([^\/]+)\//);
      ev("pdf_download", { issue: m ? m[1] : (issue || ""), file_name: href.split("/").pop(), link_text: lab }, true);
      return;
    }
    var card = el.closest(".issue-card");
    if (card) {
      var mi = href.match(/issues\/([^\/#?]+)/);
      ev("archive_click", { issue: mi ? mi[1] : (card.querySelector(".ic-label") ? card.querySelector(".ic-label").textContent.trim().slice(0, 60) : ""), link_url: abs, link_text: lab }, true);
      return;
    }
    if (abs && el.tagName === "A" && el.host && el.host !== location.host && /^https?:/.test(abs)) {
      ev("outbound_click", { link_url: abs, link_domain: el.hostname, link_text: lab }, true);
      return;
    }
    if (/^(mailto|tel|sms):/i.test(href)) { ev("contact_click", { link_url: href.split("?")[0], link_text: lab }, true); return; }
    ev("ui_click", { link_text: lab, link_url: href.slice(0, 120) });
  }, true);
})();
