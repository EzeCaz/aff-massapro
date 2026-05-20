/**
 * MassaPro Affiliate Tracker v4.1
 * Captures ALL traffic — with or without an affiliate ID.
 * Traffic without an affid is attributed to the "no_affiliate" account.
 *
 * Usage:
 *   <script src="https://aff-massapro.space-z.ai/massapro-affiliate-tracker.js"></script>
 *   <script>
 *     MassaProAffiliate.config({ dashboardUrl: 'https://aff-massapro.space-z.ai' });
 *   </script>
 *
 * API:
 *   MassaProAffiliate.config({ dashboardUrl: '...' })
 *   MassaProAffiliate.trackEvent(eventId)
 *   MassaProAffiliate.trackLeadFormOpen()
 *   MassaProAffiliate.trackLead({ lead_name, lead_email, plan_type, initial_status })
 *   MassaProAffiliate.trackCart({ plan_type, quantity, cart_value })
 *   MassaProAffiliate.trackPurchase({ order_id, revenue, plan_type, customer_email, customer_name })
 *   MassaProAffiliate.trackFunnelStep(step_name, { ...extraData })
 *   MassaProAffiliate.getAttribution()
 *   MassaProAffiliate.getFirstTouch()
 *   MassaProAffiliate.getSessionId()
 *   MassaProAffiliate.getFunnelProgress()
 */
(function (window) {
  'use strict';

  var COOKIE_NAME = 'massapro_affiliate';
  var SESSION_COOKIE = 'massapro_session';
  var FT_COOKIE = 'massapro_ft';  // First-touch UTMs (never overwritten)
  var FUNNEL_COOKIE = 'massapro_funnel'; // Funnel progress tracking
  var COOKIE_EXPIRY_DAYS = 30;
  var DEFAULT_DASHBOARD_URL = '';
  var NO_AFFILIATE_ID = 'no_affiliate'; // Fallback for traffic without an affid

  var _config = {
    dashboardUrl: DEFAULT_DASHBOARD_URL,
  };

  // ---- Utility Functions ----

  function getCookie(name) {
    var matches = document.cookie.match(
      new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)')
    );
    return matches ? decodeURIComponent(matches[1]) : null;
  }

  function setCookie(name, value, days) {
    var expires = '';
    if (days) {
      var date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + date.toUTCString();
    }
    document.cookie =
      name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax';
  }

  function parseUrlParams() {
    var params = {};
    var search = window.location.search.substring(1);
    if (!search) return params;
    var pairs = search.split('&');
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i].split('=');
      var key = decodeURIComponent(pair[0]);
      var value = pair[1] ? decodeURIComponent(pair[1]) : '';
      params[key] = value;
    }
    return params;
  }

  function getOrCreateSessionId() {
    var sessionId = getCookie(SESSION_COOKIE);
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      setCookie(SESSION_COOKIE, sessionId, 1);
    }
    return sessionId;
  }

  function getAffiliateData() {
    var cookieData = getCookie(COOKIE_NAME);
    if (cookieData) {
      try { return JSON.parse(cookieData); }
      catch (e) { return null; }
    }
    return null;
  }

  function getFirstTouchData() {
    var cookieData = getCookie(FT_COOKIE);
    if (cookieData) {
      try { return JSON.parse(cookieData); }
      catch (e) { return null; }
    }
    return null;
  }

  function saveAffiliateData(data) {
    setCookie(COOKIE_NAME, JSON.stringify(data), COOKIE_EXPIRY_DAYS);
  }

  function saveFirstTouchData(data) {
    if (!getCookie(FT_COOKIE)) {
      setCookie(FT_COOKIE, JSON.stringify(data), COOKIE_EXPIRY_DAYS);
    }
  }

  // Funnel step tracking via cookie
  function getFunnelData() {
    var cookieData = getCookie(FUNNEL_COOKIE);
    if (cookieData) {
      try { return JSON.parse(cookieData); }
      catch (e) { return { steps: [] }; }
    }
    return { steps: [] };
  }

  function saveFunnelStep(stepName) {
    var funnel = getFunnelData();
    if (funnel.steps.indexOf(stepName) === -1) {
      funnel.steps.push(stepName);
      setCookie(FUNNEL_COOKIE, JSON.stringify(funnel), COOKIE_EXPIRY_DAYS);
    }
  }

  // Get the effective affid — real affiliate or 'no_affiliate'
  function getEffectiveAffid() {
    var affiliateData = getAffiliateData();
    if (affiliateData && affiliateData.affid) {
      return affiliateData.affid;
    }
    return NO_AFFILIATE_ID;
  }

  // Check if the visitor has a real affiliate attribution
  function hasAffiliateAttribution() {
    var affiliateData = getAffiliateData();
    return !!(affiliateData && affiliateData.affid && affiliateData.affid !== NO_AFFILIATE_ID);
  }

  // Build attribution payload (affid + UTMs) — ALWAYS returns data, even for non-affiliate traffic
  function buildAttributionPayload() {
    var affiliateData = getAffiliateData();
    var firstTouch = getFirstTouchData();
    var effectiveAffid = getEffectiveAffid();

    // Get UTMs from affiliate cookie or from URL params
    var urlParams = parseUrlParams();

    return {
      affid: effectiveAffid,
      session_id: getOrCreateSessionId(),
      is_direct: !hasAffiliateAttribution(),
      // First-touch UTMs
      ft_utm_source: firstTouch ? firstTouch.utm_source : (affiliateData ? affiliateData.ft_utm_source : '') || urlParams.utm_source || '',
      ft_utm_medium: firstTouch ? firstTouch.utm_medium : (affiliateData ? affiliateData.ft_utm_medium : '') || urlParams.utm_medium || '',
      ft_utm_campaign: firstTouch ? firstTouch.utm_campaign : (affiliateData ? affiliateData.ft_utm_campaign : '') || urlParams.utm_campaign || '',
      ft_utm_content: firstTouch ? firstTouch.utm_content : (affiliateData ? affiliateData.ft_utm_content : '') || urlParams.utm_content || '',
      ft_utm_term: firstTouch ? firstTouch.utm_term : (affiliateData ? affiliateData.ft_utm_term : '') || urlParams.utm_term || '',
      // Last-touch UTMs
      lt_utm_source: (affiliateData ? affiliateData.utm_source : '') || urlParams.utm_source || '',
      lt_utm_medium: (affiliateData ? affiliateData.utm_medium : '') || urlParams.utm_medium || '',
      lt_utm_campaign: (affiliateData ? affiliateData.utm_campaign : '') || urlParams.utm_campaign || '',
      lt_utm_content: (affiliateData ? affiliateData.utm_content : '') || urlParams.utm_content || '',
      lt_utm_term: (affiliateData ? affiliateData.utm_term : '') || urlParams.utm_term || '',
      page_url: window.location.href,
    };
  }

  // ---- Tracking Functions ----

  function fireClickTracking(affid, utmParams, eventType, eventId) {
    var dashboardUrl = _config.dashboardUrl;
    if (!dashboardUrl) {
      console.warn('[MassaPro] Dashboard URL not configured.');
      return;
    }

    var sessionId = getOrCreateSessionId();

    var payload = {
      affid: affid,
      utm_source: utmParams.utm_source || '',
      utm_medium: utmParams.utm_medium || '',
      utm_campaign: utmParams.utm_campaign || '',
      utm_content: utmParams.utm_content || '',
      utm_term: utmParams.utm_term || '',
      page_url: window.location.href,
      event_type: eventType || 'pageview',
      event_id: eventId || '',
      session_id: sessionId,
    };

    if (navigator.sendBeacon) {
      var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(dashboardUrl + '/api/track/click', blob);
    } else {
      fetch(dashboardUrl + '/api/track/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {});
    }

    // Also fire pixel for backward compatibility
    var pixelUrl = dashboardUrl + '/api/track/click?affid=' + encodeURIComponent(affid);
    if (utmParams.utm_source) pixelUrl += '&utm_source=' + encodeURIComponent(utmParams.utm_source);
    if (utmParams.utm_medium) pixelUrl += '&utm_medium=' + encodeURIComponent(utmParams.utm_medium);
    if (utmParams.utm_campaign) pixelUrl += '&utm_campaign=' + encodeURIComponent(utmParams.utm_campaign);
    if (utmParams.utm_content) pixelUrl += '&utm_content=' + encodeURIComponent(utmParams.utm_content);
    if (utmParams.utm_term) pixelUrl += '&utm_term=' + encodeURIComponent(utmParams.utm_term);
    pixelUrl += '&page_url=' + encodeURIComponent(window.location.href);
    pixelUrl += '&session_id=' + encodeURIComponent(sessionId);
    if (eventType) pixelUrl += '&event_type=' + encodeURIComponent(eventType);
    if (eventId) pixelUrl += '&event_id=' + encodeURIComponent(eventId);

    var img = new Image();
    img.src = pixelUrl;
    img.style.display = 'none';
    img.width = 1;
    img.height = 1;
    img.alt = '';
    document.body.appendChild(img);
  }

  // Event tracking via dedicated /api/track/event pixel endpoint
  function fireEventTracking(eventName) {
    var dashboardUrl = _config.dashboardUrl;
    if (!dashboardUrl) {
      console.warn('[MassaPro] Dashboard URL not configured.');
      return;
    }
    var effectiveAffid = getEffectiveAffid();
    var affiliateData = getAffiliateData();
    var pixelUrl = dashboardUrl + '/api/track/event?event=' + encodeURIComponent(eventName);
    pixelUrl += '&affid=' + encodeURIComponent(effectiveAffid);
    if (affiliateData && affiliateData.utm_campaign) {
      pixelUrl += '&utm_campaign=' + encodeURIComponent(affiliateData.utm_campaign);
    }
    pixelUrl += '&page_url=' + encodeURIComponent(window.location.href);

    var img = new Image();
    img.src = pixelUrl;
    img.style.display = 'none';
    img.width = 1;
    img.height = 1;
    img.alt = '';
    document.body.appendChild(img);
  }

  function trackLeadViaPost(data) {
    var dashboardUrl = _config.dashboardUrl;
    if (!dashboardUrl) {
      console.warn('[MassaPro] Dashboard URL not configured.');
      return Promise.reject(new Error('Dashboard URL not configured'));
    }

    var attribution = buildAttributionPayload();

    var payload = {
      affid: attribution.affid,
      is_direct: attribution.is_direct,
      lead_name: data.lead_name || '',
      lead_email: data.lead_email || '',
      lead_phone: data.lead_phone || '',
      lead_company: data.lead_company || '',
      plan_type: data.plan_type || 'Basic',
      ft_utm_source: attribution.ft_utm_source,
      ft_utm_medium: attribution.ft_utm_medium,
      ft_utm_campaign: attribution.ft_utm_campaign,
      ft_utm_content: attribution.ft_utm_content,
      ft_utm_term: attribution.ft_utm_term,
      lt_utm_source: attribution.lt_utm_source,
      lt_utm_medium: attribution.lt_utm_medium,
      lt_utm_campaign: attribution.lt_utm_campaign,
      lt_utm_content: attribution.lt_utm_content,
      lt_utm_term: attribution.lt_utm_term,
      initial_status: data.initial_status || 'Lead',
    };

    return fetch(dashboardUrl + '/api/track/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, status: response.status, data: data };
        });
      })
      .then(function (result) {
        if (result.ok) { console.log('[MassaPro] Lead tracked:', result.data); }
        else { console.error('[MassaPro] Lead tracking failed:', result.data); }
        return result;
      })
      .catch(function (error) {
        console.error('[MassaPro] Lead tracking error:', error);
        throw error;
      });
  }

  // Cart tracking - fires when a user adds a plan to cart
  function trackCartViaPost(data) {
    var dashboardUrl = _config.dashboardUrl;
    if (!dashboardUrl) {
      console.warn('[MassaPro] Dashboard URL not configured.');
      return Promise.reject(new Error('Dashboard URL not configured'));
    }

    var attribution = buildAttributionPayload();

    // Save funnel step
    saveFunnelStep('add_to_cart');

    var payload = {
      affid: attribution.affid,
      is_direct: attribution.is_direct,
      session_id: getOrCreateSessionId(),
      event_type: 'add_to_cart',
      plan_type: data.plan_type || 'Basic',
      quantity: data.quantity || 1,
      cart_value: data.cart_value || 0,
      currency: data.currency || 'USD',
      // UTMs (first-touch + last-touch)
      ft_utm_source: attribution.ft_utm_source,
      ft_utm_medium: attribution.ft_utm_medium,
      ft_utm_campaign: attribution.ft_utm_campaign,
      ft_utm_content: attribution.ft_utm_content,
      ft_utm_term: attribution.ft_utm_term,
      lt_utm_source: attribution.lt_utm_source,
      lt_utm_medium: attribution.lt_utm_medium,
      lt_utm_campaign: attribution.lt_utm_campaign,
      lt_utm_content: attribution.lt_utm_content,
      lt_utm_term: attribution.lt_utm_term,
      page_url: window.location.href,
      funnel_steps: getFunnelData().steps,
    };

    // Fire the event pixel for immediate tracking
    fireEventTracking('add_to_cart_' + (data.plan_type || 'basic'));

    return fetch(dashboardUrl + '/api/track/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, status: response.status, data: data };
        });
      })
      .then(function (result) {
        if (result.ok) { console.log('[MassaPro] Cart event tracked:', result.data); }
        else { console.error('[MassaPro] Cart tracking failed:', result.data); }
        return result;
      })
      .catch(function (error) {
        console.error('[MassaPro] Cart tracking error:', error);
        throw error;
      });
  }

  // Purchase tracking - fires when a purchase is completed
  function trackPurchaseViaPost(data) {
    var dashboardUrl = _config.dashboardUrl;
    if (!dashboardUrl) {
      console.warn('[MassaPro] Dashboard URL not configured.');
      return Promise.reject(new Error('Dashboard URL not configured'));
    }

    var attribution = buildAttributionPayload();

    // Save funnel step
    saveFunnelStep('purchase');

    var payload = {
      affid: attribution.affid,
      is_direct: attribution.is_direct,
      session_id: getOrCreateSessionId(),
      event_type: 'purchase',
      order_id: data.order_id || '',
      revenue: data.revenue || 0,
      currency: data.currency || 'USD',
      plan_type: data.plan_type || 'Basic',
      customer_email: data.customer_email || '',
      customer_name: data.customer_name || '',
      // UTMs (first-touch + last-touch)
      ft_utm_source: attribution.ft_utm_source,
      ft_utm_medium: attribution.ft_utm_medium,
      ft_utm_campaign: attribution.ft_utm_campaign,
      ft_utm_content: attribution.ft_utm_content,
      ft_utm_term: attribution.ft_utm_term,
      lt_utm_source: attribution.lt_utm_source,
      lt_utm_medium: attribution.lt_utm_medium,
      lt_utm_campaign: attribution.lt_utm_campaign,
      lt_utm_content: attribution.lt_utm_content,
      lt_utm_term: attribution.lt_utm_term,
      page_url: window.location.href,
      funnel_steps: getFunnelData().steps,
    };

    // Fire the event pixel for immediate tracking
    fireEventTracking('purchase_' + (data.plan_type || 'basic'));

    return fetch(dashboardUrl + '/api/track/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (response) {
        return response.json().then(function (data) {
          return { ok: response.ok, status: response.status, data: data };
        });
      })
      .then(function (result) {
        if (result.ok) { console.log('[MassaPro] Purchase tracked:', result.data); }
        else { console.error('[MassaPro] Purchase tracking failed:', result.data); }
        return result;
      })
      .catch(function (error) {
        console.error('[MassaPro] Purchase tracking error:', error);
        throw error;
      });
  }

  // Generic funnel step tracking
  function trackFunnelStepViaPost(stepName, extraData) {
    var dashboardUrl = _config.dashboardUrl;
    if (!dashboardUrl) {
      console.warn('[MassaPro] Dashboard URL not configured.');
      return;
    }

    // Save funnel step to cookie
    saveFunnelStep(stepName);

    // Fire event pixel
    fireEventTracking('funnel_' + stepName);

    // Also fire click tracking with funnel event type — ALWAYS, using effective affid
    var effectiveAffid = getEffectiveAffid();
    var affiliateData = getAffiliateData();
    fireClickTracking(effectiveAffid, {
      utm_source: (affiliateData ? affiliateData.utm_source : '') || '',
      utm_medium: (affiliateData ? affiliateData.utm_medium : '') || '',
      utm_campaign: (affiliateData ? affiliateData.utm_campaign : '') || '',
      utm_content: (affiliateData ? affiliateData.utm_content : '') || '',
      utm_term: (affiliateData ? affiliateData.utm_term : '') || '',
    }, 'funnel_step', 'funnel_' + stepName);

    console.log('[MassaPro] Funnel step tracked: ' + stepName + ' | Progress: ' + JSON.stringify(getFunnelData().steps));
  }

  // ---- Auto-Initialization ----

  function init() {
    var urlParams = parseUrlParams();
    var affid = urlParams.affid;

    if (affid) {
      // Visitor arrived via an affiliate link
      var utmData = {
        affid: affid,
        utm_source: urlParams.utm_source || '',
        utm_medium: urlParams.utm_medium || '',
        utm_campaign: urlParams.utm_campaign || '',
        utm_content: urlParams.utm_content || '',
        utm_term: urlParams.utm_term || '',
        landing_page: window.location.href,
        timestamp: new Date().toISOString(),
      };

      saveFirstTouchData(utmData);

      utmData.ft_utm_source = urlParams.utm_source || '';
      utmData.ft_utm_medium = urlParams.utm_medium || '';
      utmData.ft_utm_campaign = urlParams.utm_campaign || '';
      utmData.ft_utm_content = urlParams.utm_content || '';
      utmData.ft_utm_term = urlParams.utm_term || '';
      saveAffiliateData(utmData);

      // Track the initial landing as a funnel step
      saveFunnelStep('landing');

      if (_config.dashboardUrl) {
        fireClickTracking(affid, {
          utm_source: urlParams.utm_source,
          utm_medium: urlParams.utm_medium,
          utm_campaign: urlParams.utm_campaign,
          utm_content: urlParams.utm_content,
          utm_term: urlParams.utm_term,
        });
      }
    } else {
      var existingData = getAffiliateData();

      if (existingData && existingData.affid) {
        // Returning visitor with existing affiliate cookie
        var updated = false;
        if (urlParams.utm_source) { existingData.utm_source = urlParams.utm_source; updated = true; }
        if (urlParams.utm_medium) { existingData.utm_medium = urlParams.utm_medium; updated = true; }
        if (urlParams.utm_campaign) { existingData.utm_campaign = urlParams.utm_campaign; updated = true; }
        if (urlParams.utm_content) { existingData.utm_content = urlParams.utm_content; updated = true; }
        if (urlParams.utm_term) { existingData.utm_term = urlParams.utm_term; updated = true; }

        saveAffiliateData(existingData);

        if (_config.dashboardUrl && updated) {
          fireClickTracking(existingData.affid, {
            utm_source: existingData.utm_source,
            utm_medium: existingData.utm_medium,
            utm_campaign: existingData.utm_campaign,
            utm_content: existingData.utm_content,
            utm_term: existingData.utm_term,
          });
        }
      } else {
        // NO affiliate attribution — direct traffic
        // Still capture UTM params and track the pageview as 'no_affiliate'
        var directUtmData = {
          affid: NO_AFFILIATE_ID,
          utm_source: urlParams.utm_source || '',
          utm_medium: urlParams.utm_medium || '',
          utm_campaign: urlParams.utm_campaign || '',
          utm_content: urlParams.utm_content || '',
          utm_term: urlParams.utm_term || '',
          landing_page: window.location.href,
          timestamp: new Date().toISOString(),
          is_direct: true,
        };

        // Save first-touch for direct traffic too
        saveFirstTouchData(directUtmData);
        saveAffiliateData(directUtmData);
        saveFunnelStep('landing');

        if (_config.dashboardUrl) {
          fireClickTracking(NO_AFFILIATE_ID, {
            utm_source: urlParams.utm_source,
            utm_medium: urlParams.utm_medium,
            utm_campaign: urlParams.utm_campaign,
            utm_content: urlParams.utm_content,
            utm_term: urlParams.utm_term,
          });
        }
      }
    }
  }

  // ---- Public API ----

  var MassaProAffiliate = {
    config: function (options) {
      if (options.dashboardUrl) {
        _config.dashboardUrl = options.dashboardUrl.replace(/\/+$/, '');
      }
    },

    /**
     * Track a CTA button click event.
     * @param {string} eventId - e.g. "btn_hero_demo", "btn_buy_basic"
     */
    trackEvent: function (eventId) {
      var effectiveAffid = getEffectiveAffid();
      var affiliateData = getAffiliateData();

      // Fire dedicated event pixel — ALWAYS
      fireEventTracking(eventId);

      // Fire click tracking with button_click event type — ALWAYS
      fireClickTracking(effectiveAffid, {
        utm_source: (affiliateData ? affiliateData.utm_source : '') || '',
        utm_medium: (affiliateData ? affiliateData.utm_medium : '') || '',
        utm_campaign: (affiliateData ? affiliateData.utm_campaign : '') || '',
        utm_content: (affiliateData ? affiliateData.utm_content : '') || '',
        utm_term: (affiliateData ? affiliateData.utm_term : '') || '',
      }, 'button_click', eventId);
    },

    /**
     * Track when the lead form is opened/displayed to the user.
     * Call this when the lead form modal appears or the form page loads.
     * This tracks the pre-submission step: user sees the form.
     */
    trackLeadFormOpen: function () {
      var effectiveAffid = getEffectiveAffid();
      var affiliateData = getAffiliateData();

      // Save funnel step
      saveFunnelStep('lead_form_open');

      // Fire event pixel
      fireEventTracking('lead_form_open');

      // Fire click tracking with button_click event type for dashboard metrics
      fireClickTracking(effectiveAffid, {
        utm_source: (affiliateData ? affiliateData.utm_source : '') || '',
        utm_medium: (affiliateData ? affiliateData.utm_medium : '') || '',
        utm_campaign: (affiliateData ? affiliateData.utm_campaign : '') || '',
        utm_content: (affiliateData ? affiliateData.utm_content : '') || '',
        utm_term: (affiliateData ? affiliateData.utm_term : '') || '',
      }, 'button_click', 'lead_form_open');

      console.log('[MassaPro] Lead form open tracked');
    },

    /**
     * Track a lead form submission.
     * Now also works for direct traffic (attributed to 'no_affiliate').
     * @param {Object} data - { lead_name, lead_email, lead_phone, lead_company, plan_type, initial_status }
     * @returns {Promise}
     */
    trackLead: function (data) {
      saveFunnelStep('lead_form');
      return trackLeadViaPost(data);
    },

    /**
     * Track an add-to-cart event. Call when a user selects a plan or adds to cart.
     * @param {Object} data - { plan_type, quantity, cart_value, currency }
     * @returns {Promise}
     */
    trackCart: function (data) {
      return trackCartViaPost(data);
    },

    /**
     * Track a completed purchase. Call when payment is confirmed.
     * @param {Object} data - { order_id, revenue, currency, plan_type, customer_email, customer_name }
     * @returns {Promise}
     */
    trackPurchase: function (data) {
      return trackPurchaseViaPost(data);
    },

    /**
     * Track a custom funnel step. Use for any step in the customer journey.
     * @param {string} stepName - e.g. "view_pricing", "view_demo", "checkout_start"
     * @param {Object} [extraData] - Optional extra data to log
     */
    trackFunnelStep: function (stepName, extraData) {
      trackFunnelStepViaPost(stepName, extraData);
    },

    /**
     * Get the current funnel progress from the cookie.
     * @returns {Object} - { steps: ["landing", "view_pricing", "add_to_cart", ...] }
     */
    getFunnelProgress: function () {
      return getFunnelData();
    },

    getAttribution: function () {
      return getAffiliateData();
    },

    getFirstTouch: function () {
      return getFirstTouchData();
    },

    getSessionId: function () {
      return getOrCreateSessionId();
    },

    /**
     * Check if the current visitor has a real affiliate attribution.
     * @returns {boolean}
     */
    hasAffiliate: function () {
      return hasAffiliateAttribution();
    },
  };

  window.MassaProAffiliate = MassaProAffiliate;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(init, 100);
    });
  } else {
    setTimeout(init, 100);
  }
})(window);
