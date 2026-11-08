/* Heimshtut site script (Oct 30 2026): email links, weekly email signup, place-a-listing forms.
   Settings (Mailchimp link, Sola payment link, prices) live in config.js only. */
(function () {
  "use strict";
  var C = window.HEIMSHTUT_CONFIG || {}, d = document;
  var PHONE = C.phone || "845-414-8007", LISTINGS = C.listingsEmail || "classifieds@heimshtut.com", ADS = C.adsEmail || "ads@heimshtut.com";
  function $(s, r) { return (r || d).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function enc(s) { return encodeURIComponent(s); }
  function mailto(to, subject, body) { return "mailto:" + to + "?subject=" + enc(subject) + (body ? "&body=" + enc(body) : ""); }
  function money(n) { n = +n; return isFinite(n) && n > 0 ? "$" + n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : ""; }
  var fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- 1. email links: the email opens as usual; on a computer a small helper offers Gmail / Outlook / copy,
     for computers with no email program set up (there a mailto link does nothing). ---------- */
  var toast = null, toastT = null;
  function parseMailto(h) {
    var m = /^mailto:([^?]*)\??(.*)$/i.exec(h || ""); if (!m) return null;
    var q = {}; m[2].split("&").forEach(function (kv) { var p = kv.split("="); if (p[0]) q[p[0].toLowerCase()] = decodeURIComponent((p[1] || "").replace(/\+/g, "%20")); });
    return { to: decodeURIComponent(m[1]), subject: q.subject || "", body: q.body || "" };
  }
  function mailHelper(h) {
    var m = parseMailto(h); if (!m) return;
    if (!toast) { toast = d.createElement("div"); toast.className = "mail-toast"; toast.setAttribute("role", "status"); d.body.appendChild(toast); }
    var gm = "https://mail.google.com/mail/?view=cm&fs=1&to=" + enc(m.to) + "&su=" + enc(m.subject) + "&body=" + enc(m.body);
    var ol = "https://outlook.live.com/mail/0/deeplink/compose?to=" + enc(m.to) + "&subject=" + enc(m.subject) + "&body=" + enc(m.body);
    toast.innerHTML = '<span>Email didn\u2019t open? Write to <b>' + esc(m.to) + '</b> with</span>' +
      '<a href="' + esc(gm) + '" target="_blank" rel="noopener">Gmail</a><a href="' + esc(ol) + '" target="_blank" rel="noopener">Outlook</a>' +
      '<button type="button" data-copy>Copy address</button><button type="button" class="mt-x" aria-label="Close">\u00d7</button>';
    toast.classList.add("on");
    $("[data-copy]", toast).onclick = function () { var b = this; (navigator.clipboard ? navigator.clipboard.writeText(m.to) : Promise.reject()).then(function () { b.textContent = "Copied \u2713"; }, function () { b.textContent = m.to; }); };
    $(".mt-x", toast).onclick = function () { toast.classList.remove("on"); };
    clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove("on"); }, 12000);
  }
  if (fine) d.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="mailto:"]'); if (!a || e.defaultPrevented) return;
    setTimeout(function () { mailHelper(a.getAttribute("href")); }, 400);
  });
  function openMail(h) { location.href = h; if (fine) setTimeout(function () { mailHelper(h); }, 400); }

  /* ---------- 2. weekly email signup (home page) ---------- */
  $$("form[data-signup]").forEach(function (f) {
    var msg = $(".su-msg", f), btn = $("button[type=submit]", f);
    function say(t, kind, sub) { msg.textContent = t; msg.className = "su-msg " + (kind || ""); if (sub) { var sm = d.createElement("small"); sm.className = "su-sub"; sm.textContent = sub; msg.appendChild(sm); } }
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var HPN = C.mailchimpHoneypot || "b_c882a32780273e44ffaf06c38_1a14b3166f", hp = f.elements[HPN] || f.elements.b_hp;
      if (hp && hp.value) return;                                       // bots fill the hidden field
      var email = (f.elements.EMAIL.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say("Please type a valid email address.", "err"); f.elements.EMAIL.focus(); return; }
      var url = (C.mailchimpFormAction || "").trim();
      if (!/^https:\/\/[\w.-]+\.list-manage\.com\/subscribe\/post\?/.test(url)) {
        say("We opened an email so you can sign up.", "ok");
        openMail(mailto(ADS, "Subscribe", "Please add me to the weekly Heimshtut email.\n\nEmail: " + email));
        return;
      }
      btn.disabled = true; say("Signing you up\u2026");
      var cb = "hsMc" + Date.now(), s = d.createElement("script"), done = false;
      function fallback() {                                          // JSONP blocked: post the real Mailchimp form in a new tab
        if (done) return; done = true; cleanup();
        var g = d.createElement("form"); g.method = "post"; g.action = url; g.target = "_blank"; g.style.display = "none";
        [["EMAIL", email], [HPN, ""]].forEach(function (kv) { var i = d.createElement("input"); i.name = kv[0]; i.value = kv[1]; g.appendChild(i); });
        d.body.appendChild(g); g.submit(); g.remove(); btn.disabled = false; say("Almost done \u2014 finish in the Mailchimp tab that opened.", "ok");
      }
      function cleanup() { try { delete window[cb]; } catch (x) { window[cb] = null; } s.remove(); }
      window[cb] = function (r) {
        if (done) return; done = true; cleanup(); btn.disabled = false;
        var t = String((r && r.msg) || "").replace(/<[^>]+>/g, "").replace(/^\d+\s*-\s*/, "");
        if (r && r.result === "success") { say("\u2713 Subscribed.", "ok done"); f.reset(); }
        else if (/already subscribed/i.test(t)) say("You are already on the list. Thank you!", "ok");
        else if (/captcha|robot|too many/i.test(t)) { done = false; fallback(); }
        else say(t || "That didn\u2019t go through. Please try again.", "err");
      };
      s.src = url.replace("/subscribe/post?", "/subscribe/post-json?") + "&EMAIL=" + enc(email) + "&" + enc(HPN) + "=&c=" + cb;
      s.onerror = fallback; setTimeout(fallback, 9000); d.body.appendChild(s);
    });
  });

  /* ---------- 3. place a listing: live preview -> continue to payment (Sola PaymentSITE) ---------- */
  var KIND = {
    rental: { title: "Rental listing", pre: "R", price: function () { return C.prices && C.prices.rentalMonthly; }, per: " / month", recurring: true },
    classified: { title: "Classified ad", pre: "C", price: function () { return C.prices && C.prices.classified; }, per: "", recurring: false }
  };
  function val(f, n) { var el = f.elements[n]; if (!el) return ""; if (el.tagName === "SELECT") { var o = el.options[el.selectedIndex]; return o && o.value ? (o.hasAttribute("data-label") ? o.getAttribute("data-label") : o.text) : ""; } return (el.value || "").trim(); }
  function phoneFmt(p) { var x = String(p).replace(/\D/g, ""); if (x.length === 11 && x[0] === "1") x = x.slice(1); return x.length === 10 ? x.slice(0, 3) + "-" + x.slice(3, 6) + "-" + x.slice(6) : p; }
  function lines(t) { return esc(t).replace(/\n/g, "<br>"); }
  function rentalHTML(f, photo) {
    var type = val(f, "type"), beds = val(f, "rooms"), area = val(f, "area"), rent = val(f, "rent"), desc = val(f, "description"), ph = val(f, "phone"), em = val(f, "email"), nm = val(f, "name");
    var head = [type, beds].filter(Boolean).join(" \u00b7 ");
    return (photo ? '<div class="lp-photo"><img src="' + photo + '" alt=""></div>' : "") +
      '<div class="lp-body"><p class="lp-tag">' + (esc(head) || '<span class="lp-ph">Type \u00b7 rooms</span>') + '</p>' +
      '<p class="lp-price">' + (money(rent) ? esc(money(rent)) + '<small> / month</small>' : '<span class="lp-ph">$ rent / month</span>') + '</p>' +
      '<p class="lp-area">' + (esc(area) || '<span class="lp-ph">Address or area</span>') + '</p>' +
      '<p class="lp-desc" dir="auto">' + (lines(desc) || '<span class="lp-ph">Your description shows here.</span>') + '</p>' +
      '<p class="lp-contact">' + (nm ? esc(nm) + " \u00b7 " : "") + (ph ? '\u260e ' + esc(phoneFmt(ph)) : '<span class="lp-ph">\u260e phone</span>') + (em ? ' \u00b7 ' + esc(em) : "") + '</p></div>';
  }
  function classifiedHTML(f) {
    var sel = f.elements.category, o = sel && sel.options[sel.selectedIndex], yi = o && o.value ? o.getAttribute("data-yi") : "", en = o && o.value ? o.getAttribute("data-label") : "";
    var txt = val(f, "text"), ph = val(f, "phone"), em = val(f, "email"), nm = val(f, "name");
    return '<div class="lp-body"><p class="lp-cat">' + (en ? '<span lang="yi" dir="rtl">' + esc(yi) + '</span><span>' + esc(en) + '</span>' : '<span class="lp-ph">Category</span>') + '</p>' +
      '<p class="lp-text" dir="auto">' + (lines(txt) || '<span class="lp-ph">Your ad text shows here, the way it will be printed.</span>') + '</p>' +
      '<p class="lp-contact">' + (nm ? esc(nm) + " \u00b7 " : "") + (ph ? '\u260e ' + esc(phoneFmt(ph)) : '<span class="lp-ph">\u260e phone</span>') + (em ? ' \u00b7 ' + esc(em) : "") + '</p></div>';
  }
  function plainText(kind, f) {
    var L = [];
    if (kind === "rental") {
      L.push("Type: " + val(f, "type"), "Rooms: " + val(f, "rooms"), "Address / area: " + val(f, "area"), "Rent per month: " + (money(val(f, "rent")) || val(f, "rent")),
        "", "Description:", val(f, "description"), "", "Contact: " + [val(f, "name"), phoneFmt(val(f, "phone")), val(f, "email")].filter(Boolean).join(" \u00b7 "));
      if (f.elements.photo && f.elements.photo.files && f.elements.photo.files[0]) L.push("", "Photo: I will attach it to this email.");
    } else {
      var cs = f.elements.category, co = cs && cs.options[cs.selectedIndex];
      L.push("Category: " + (co && co.value ? co.text : ""), "", "Ad text:", val(f, "text"), "", "Contact: " + [val(f, "name"), phoneFmt(val(f, "phone")), val(f, "email")].filter(Boolean).join(" \u00b7 "));
    }
    return L.join("\n");
  }
  function makeRef(pre) {
    var t = new Date(), a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", r = "";
    for (var i = 0; i < 4; i++) r += a[Math.floor(Math.random() * a.length)];
    return pre + "-" + ("0" + (t.getMonth() + 1)).slice(-2) + ("0" + t.getDate()).slice(-2) + "-" + r;
  }
  function solaLink(base, amount, ref, kind, f) {
    // Sola (formerly Cardknox) PaymentSITE: fields prefill from the query string (docs.solapayments.com/products/paymentsite)
    var q = ["xAmount=" + enc((+amount).toFixed(2)), "xInvoice=" + enc(ref), "xDescription=" + enc(KIND[kind].title + " " + ref),
      "xCustom01=" + enc(ref), "xCustom02=" + enc(plainText(kind, f).replace(/\s+/g, " ").slice(0, 240))];
    var em = val(f, "email"), ph = val(f, "phone"); if (em) q.push("xEmail=" + enc(em)); if (ph) q.push("xBillPhone=" + enc(ph));
    q.push("xRedirectURL=" + enc(location.origin + location.pathname + "?paid=" + ref));
    return base + (base.indexOf("?") >= 0 ? "&" : "?") + q.join("&");
  }
  /* prices: sale (regular crossed out) + monthly cancel line, from config.js */
  function priceHTML(kind) {
    var P = C.prices || {}, h = "";
    if (kind === "classified") {
      var now = +P.classified || 0, reg = +P.classifiedRegular || 0;
      if (!(now > 0)) return "";
      if (reg > now) h = '<span class="pt-sale">Sale</span> <s class="pt-reg" aria-label="regular price ' + esc(money(reg)) + '">' + esc(money(reg)) + '</s> <b class="pt-now">' + esc(money(now)) + '</b><small class="pt-note"> per ad (reg. ' + esc(money(reg)) + ')</small>';
      else h = '<b class="pt-now">' + esc(money(now)) + '</b><small class="pt-note"> per ad</small>';
    } else if (kind === "rental") {
      var m = +P.rentalMonthly || 0;
      if (!(m > 0)) return "";
      h = '<b class="pt-now">' + esc(money(m)) + '</b><small class="pt-note"> / month</small>';
    }
    return h;
  }
  function cancelHTML() {
    var em = C.listingsEmail || "classifieds@heimshtut.com";
    return 'Billed monthly until you cancel. To cancel, call <a href="tel:+18454148007">' + esc(PHONE) + '</a> or email <a href="' + esc(mailto(em, "Cancel my rental listing")) + '">' + esc(em) + '</a>.';
  }
  $$("[data-price-tag]").forEach(function (el) {
    var kind = el.getAttribute("data-price-tag"), h = priceHTML(kind);
    if (!h) { el.hidden = true; var c0 = $("[data-cancel-line]", el.parentNode); if (c0) c0.hidden = true; return; }
    el.innerHTML = h; el.hidden = false;
    var c = $("[data-cancel-line]", el.parentNode); if (c) { if (kind === "rental") { c.innerHTML = cancelHTML(); c.hidden = false; } else c.hidden = true; }
  });

  $$("form[data-listing]").forEach(function (f) {
    var kind = f.getAttribute("data-listing"), K = KIND[kind], box = f.closest(".lst"), prev = $(".lp", box), step2 = $(".lst-pay", box), photoURL = "";
    function render() { prev.innerHTML = kind === "rental" ? rentalHTML(f, photoURL) : classifiedHTML(f); }
    f.addEventListener("input", render); f.addEventListener("change", render);
    $$("[data-msg]", f).forEach(function (el) { el.addEventListener("input", function () { el.setCustomValidity(""); }); });
    var cnt = $(".cnt", f), ta = f.elements.text;
    if (cnt && ta) { var upd = function () { cnt.textContent = ta.value.length + " / " + ta.maxLength; }; ta.addEventListener("input", upd); upd(); }
    if (f.elements.photo) f.elements.photo.addEventListener("change", function () {
      if (photoURL) URL.revokeObjectURL(photoURL); var file = this.files && this.files[0];
      photoURL = file && /^image\//.test(file.type) ? URL.createObjectURL(file) : ""; render();
    });
    render();
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      $$("[data-msg]", f).forEach(function (el) { el.setCustomValidity(el.required && !(el.value || "").trim() ? el.getAttribute("data-msg") : ""); });
      if (!f.checkValidity()) { f.reportValidity && f.reportValidity(); return; }
      var ref = makeRef(K.pre), price = +(K.price() || 0), base = (C.solaPaymentSiteUrl || "").trim(), canPay = price > 0 && /^https:\/\//.test(base);
      var subj = K.title + " " + ref, body = "Listing number: " + ref + (price > 0 ? "\nPrice: " + money(price) + (K.recurring ? " / month (billed monthly until cancelled)" : (+(C.prices || {}).classifiedRegular > price ? " (sale, reg. " + money(+C.prices.classifiedRegular) + ")" : "")) : "") + "\n\n" + plainText(kind, f) + "\n";
      var h = '<p class="eyebrow">Step 2 of 2</p><h3>Review &amp; payment</h3>' +
        '<div class="lp lp-final ' + (kind === "rental" ? "lp-rental" : "lp-classified") + '">' + prev.innerHTML + '</div>' +
        '<p class="ref">Listing number <b>' + esc(ref) + '</b></p>';
      if (price > 0) h += '<p class="pay-price price-tag">' + (priceHTML(kind) || esc(money(price)) + esc(K.per)) + '</p>' +
        (K.recurring ? '<p class="cancel-line">' + cancelHTML() + '</p>' : '');
      if (canPay) {
        h += '<a class="btn" href="' + esc(solaLink(base, price, ref, kind, f)) + '">Continue to secure card payment</a>' +
          '<p class="note">You will pay on our secure payment page (Sola). Have a photo? Email it with your listing number to <a href="' + esc(mailto(LISTINGS, subj + " photo", "Listing number: " + ref)) + '">' + esc(LISTINGS) + '</a>.</p>';
      } else {
        h += '<div class="soon"><b>Payment link coming soon \u2014 call <a href="tel:+18454148007">' + esc(PHONE) + '</a></b>' +
          '<p>Meanwhile, send us your listing by email and we will call you to finish.' + (kind === "rental" && photoURL ? " Please attach your photo to the email." : "") + '</p></div>' +
          '<div class="pay-acts"><a class="btn" data-mail href="' + esc(mailto(LISTINGS, subj, body)) + '">Email my listing</a>' +
          '<a class="btn btn-outline" href="tel:+18454148007">Call ' + esc(PHONE) + '</a></div>';
      }
      h += '<p><button type="button" class="linkbtn" data-back>\u2190 Back to edit</button></p>';
      step2.innerHTML = h; box.classList.add("paying"); step2.hidden = false;
      $("[data-back]", step2).onclick = function () { box.classList.remove("paying"); step2.hidden = true; f.scrollIntoView({ behavior: "smooth", block: "start" }); };
      step2.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  // back from the payment page
  var paid = /[?&]paid=([A-Z0-9-]{6,20})/.exec(location.search), pb = $(".paid-banner");
  if (paid && pb) { pb.hidden = false; $("b", pb).textContent = paid[1]; }
})();

/* Website chat (tawk.to), Oct 30 2026: loads the chat bubble (bottom-right) on every page that runs this file.
   The issue reader pages do not load site.js, so the bubble never covers the page-flip controls.
   IDs live in config.js (tawkPropertyId / tawkWidgetId); empty = no chat. */
(function () {
  "use strict";
  var C = window.HEIMSHTUT_CONFIG || {}, p = C.tawkPropertyId, w = C.tawkWidgetId;
  if (!p || !w || window.Tawk_API) return;
  window.Tawk_API = {}; window.Tawk_LoadStart = new Date();
  window.Tawk_API.customStyle = { visibility: {
    desktop: { position: "br", xOffset: 20, yOffset: 20 },
    mobile: { position: "br", xOffset: 12, yOffset: 12 } } };
  document.documentElement.classList.add("has-chat");
  var s = document.createElement("script");
  s.async = true; s.charset = "UTF-8"; s.setAttribute("crossorigin", "*");
  s.src = "https://embed.tawk.to/" + p + "/" + w;
  (document.body || document.head).appendChild(s);
})();
