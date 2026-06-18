(function () {
  var STORAGE_KEY = "afterclick_cookie_consent_v1";
  var DEFAULT_META_PIXEL_ID = "1677975296859006";
  var pixelId = window.AFTERCLICK_META_PIXEL_ID || DEFAULT_META_PIXEL_ID;
  var pageEvents = Array.isArray(window.AFTERCLICK_PAGE_EVENTS) ? window.AFTERCLICK_PAGE_EVENTS : [];
  var metaLoaded = false;
  var eventsTracked = false;

  function readConsent() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeConsent(marketing) {
    var payload = {
      necessary: true,
      marketing: Boolean(marketing),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      window.__afterClickConsent = payload;
    }

    return payload;
  }

  function loadMetaPixel() {
    if (metaLoaded || !pixelId) return;
    metaLoaded = true;

    window.fbq = window.fbq || function () {
      window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq, arguments) : window.fbq.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = window.fbq;
    window.fbq.push = window.fbq;
    window.fbq.loaded = true;
    window.fbq.version = "2.0";
    window.fbq.queue = window.fbq.queue || [];

    var script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    var firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(script, firstScript);

    window.fbq("init", pixelId);
  }

  function trackPageEvents() {
    if (eventsTracked) return;
    eventsTracked = true;
    loadMetaPixel();
    if (!pixelId || !window.fbq) return;
    window.fbq("track", "PageView");

    pageEvents.forEach(function (event) {
      if (event && event.name) {
        window.fbq("track", event.name, event.params || {});
      }
    });
  }

  function applyConsent(consent) {
    if (consent && consent.marketing) {
      trackPageEvents();
    }
  }

  function renderBanner() {
    if (document.querySelector("[data-cookie-banner]")) return;

    var banner = document.createElement("section");
    banner.className = "cookie-banner";
    banner.setAttribute("data-cookie-banner", "");
    banner.setAttribute("aria-label", "Cookie preferences");
    banner.innerHTML =
      '<div class="cookie-banner-inner">' +
        '<div class="cookie-kicker"><span></span> Measurement choices</div>' +
        "<h2>Help us improve AfterClick</h2>" +
        '<p>We use necessary storage to keep this site working. If you accept, measurement and advertising cookies may help us understand which messages bring relevant ecommerce teams here.</p>' +
        '<p class="cookie-reassurance">No store passwords, private customer data or analytics dashboards are tracked here. You can reject or customize now and change this later.</p>' +
        '<div class="cookie-actions">' +
          '<button class="cookie-button primary" type="button" data-cookie-accept>Accept measurement</button>' +
          '<button class="cookie-button" type="button" data-cookie-reject>Reject non-essential</button>' +
          '<button class="cookie-button" type="button" data-cookie-customize>Customize</button>' +
        "</div>" +
        '<div class="cookie-panel" data-cookie-panel hidden>' +
          "<h2>Customize</h2>" +
          '<label class="cookie-option">' +
            '<input type="checkbox" checked disabled>' +
            '<span><strong>Necessary</strong><span>Required for basic page behavior and remembering your cookie choice.</span></span>' +
          "</label>" +
          '<label class="cookie-option">' +
            '<input type="checkbox" data-cookie-marketing>' +
            '<span><strong>Measurement and advertising</strong><span>Allows Meta Pixel measurement to load after consent.</span></span>' +
          "</label>" +
          '<div class="cookie-actions">' +
            '<button class="cookie-button primary" type="button" data-cookie-save>Save preferences</button>' +
          "</div>" +
        "</div>" +
      "</div>";

    document.body.appendChild(banner);

    var panel = banner.querySelector("[data-cookie-panel]");
    var marketingInput = banner.querySelector("[data-cookie-marketing]");

    banner.querySelector("[data-cookie-accept]").addEventListener("click", function () {
      applyConsent(writeConsent(true));
      banner.hidden = true;
    });

    banner.querySelector("[data-cookie-reject]").addEventListener("click", function () {
      writeConsent(false);
      banner.hidden = true;
    });

    banner.querySelector("[data-cookie-customize]").addEventListener("click", function () {
      panel.hidden = !panel.hidden;
    });

    banner.querySelector("[data-cookie-save]").addEventListener("click", function () {
      applyConsent(writeConsent(marketingInput.checked));
      banner.hidden = true;
    });
  }

  function openPreferences() {
    var existing = document.querySelector("[data-cookie-banner]");
    if (existing) existing.remove();
    renderBanner();
    var banner = document.querySelector("[data-cookie-banner]");
    var panel = banner && banner.querySelector("[data-cookie-panel]");
    var marketingInput = banner && banner.querySelector("[data-cookie-marketing]");
    var consent = readConsent();
    if (marketingInput && consent) marketingInput.checked = Boolean(consent.marketing);
    if (panel) panel.hidden = false;
  }

  document.addEventListener("click", function (event) {
    var trigger = event.target.closest("[data-cookie-preferences]");
    if (!trigger) return;
    event.preventDefault();
    openPreferences();
  });

  document.addEventListener("DOMContentLoaded", function () {
    var consent = readConsent();
    if (consent) {
      applyConsent(consent);
      return;
    }

    renderBanner();
  });
})();
