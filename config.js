/* =====================================================================
   HEIMSHTUT SITE SETTINGS — the ONE place to paste the Mailchimp form
   link, the Sola payment page link and the listing prices.
   Edit only the values between the quotes / after the colons.
   ===================================================================== */
window.HEIMSHTUT_CONFIG = {

  /* 1) WEEKLY EMAIL SIGNUP (home page)
     Mailchimp → Audience → Signup forms → Embedded form → copy the
     <form action="..."> link, it looks like:
     https://heimshtut.us20.list-manage.com/subscribe/post?u=XXXXXXXX&id=YYYYYYYY
     Connected Oct 30, 2026 (yossi's embed code). Empty = the form opens an email to ads@ instead. */
  mailchimpFormAction: "https://heimshtut.us20.list-manage.com/subscribe/post?u=c882a32780273e44ffaf06c38&id=1a14b3166f&f_id=0010cdedf0",
  mailchimpHoneypot: "b_c882a32780273e44ffaf06c38_1a14b3166f",   // Mailchimp's hidden anti-bot field name (from the same embed code)

  /* 2) SOLA (Cardknox) PAYMENTSITE — hosted payment page link from the Sola portal,
     it looks like: https://secure.cardknox.com/heimshtut
     The site adds the amount and the listing number to it (xAmount, xInvoice, xDescription).
     No API keys here, ever: this file is public.
     Empty = "Payment link coming soon — call 845-414-8007" + email the listing. */
  solaPaymentSiteUrl: "",

  /* 3) PRICES in US dollars (numbers, e.g. 25 or 150).
     null = no price is shown and the payment button stays off.
     classifiedRegular: the regular price, shown crossed out while
     "classified" is lower (a sale). Sale over = set classified back to 25
     (or set classifiedRegular to null). Set by yossi Oct 30, 2026. */
  prices: {
    classified: 15,          // one classified ad (sale price; this is the amount charged)
    classifiedRegular: 25,   // regular price, shown crossed out
    rentalMonthly: 45        // one rental listing, per month (charged monthly until cancelled)
  },

  /* 4) WEBSITE CHAT (tawk.to, free) — from the Heimshtut property's widget code
     https://embed.tawk.to/<tawkPropertyId>/<tawkWidgetId>. Set up Oct 30, 2026.
     Hours, the AI assistant and the after-hours message are set in dashboard.tawk.to.
     Empty both = no chat bubble on the site. */
  tawkPropertyId: "6ae4c20c37ce0d3469052d5d",
  tawkWidgetId: "1k66pc1je",

  /* Where listings and signups are emailed while there is no payment link */
  listingsEmail: "classifieds@heimshtut.com",
  adsEmail: "ads@heimshtut.com",
  phone: "845-414-8007"
};
