/**
 * MassaPro Affiliate Tracker v2.0
 * Embed this script on receptionist.massapro.com to track affiliate clicks and leads.
 *
 * Usage:
 *   <script src="https://YOUR_DASHBOARD_URL/massapro-affiliate-tracker.js"></script>
 *   <script>
 *     MassaProAffiliate.config({ dashboardUrl: 'https://YOUR_DASHBOARD_URL' });
 *   </script>
 *
 * API:
 *   MassaProAffiliate.trackLead({ lead_name, lead_email, plan_type })
 *   MassaProAffiliate.trackEvent(eventId)
 *   MassaProAffiliate.config({ dashboardUrl: '...' })
 */
(function (window) {
  'use strict';

  var COOKIE_NAME = 'massapro_affiliate';
  var SESSION_COOKIE = 'massapro_session';
  var FT_COOKIE = 'massapro_ft';  // First-touch UTMs (never overwritten)
  var COOKIE_EXPIRY_DAYS = 30;
  var DEFAULT_DASHBOARD_URL = '';

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
      setCookie(SESSION_COOKIE, sessionId, 1); // Session cookie, expires in 1 day
    }
    return sessionId;
  }

  function getAffiliateData() {
    var cookieData = getCookie(COOKIE_NAME);
    if (cookieData) {
      try {
        return JSON.parse(cookieData);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  function getFirstTouchData() {
    var cookieData = getCookie(FT_COOKIE);
    if (cookieData) {
      try {
        return JSON.parse(cookieData);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  function saveAffiliateData(data) {
    setCookie(COOKIE_NAME, JSON.stringify(data), COOKIE_EXPIRY_DAYS);
  }

  function saveFirstTouchData(data) {
    // Only save first-touch if not already set (never overwrite)
    if (!getCookie(FT_COOKIE)) {
      setCookie(FT_COOKIE, JSON.stringify(data), COOKIE_EXPIRY_DAYS);
    }
  }

  // ---- Tracking Functions ----

  function fireClickTracking(affid, utmParams, eventType, eventId) {
    var dashboardUrl = _config.dashboardUrl;
    if (!dashboardUrl) {
      console.warn('[MassaPro] Dashboard URL not configured. Call MassaProAffiliate.config({ dashboardUrl: "..." }) first.');
      return;
    }

    var sessionId = getOrCreateSessionId();

    // Use JSON POST for better data support
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

    // Use sendBeacon if available for reliability, fallback to fetch
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

  function trackLeadViaPost(data) {
    var dashboardUrl = _config.dashboardUrl;
    if (!dashboardUrl) {
      console.warn('[MassaPro] Dashboard URL not configured.');
      return Promise.reject(new Error('Dashboard URL not configured'));
    }

    var affiliateData = getAffiliateData();
    if (!affiliateData || !affiliateData.affid) {
      console.warn('[MassaPro] No affiliate attribution found. Lead will not be tracked.');
      return Promise.reject(new Error('No affiliate attribution found'));
    }

    var firstTouch = getFirstTouchData();

    var payload = {
      affid: affiliateData.affid,
      lead_name: data.lead_name || '',
      lead_email: data.lead_email || '',
      lead_phone: data.lead_phone || '',
      lead_company: data.lead_company || '',
      plan_type: data.plan_type || 'Basic',
      // First-touch UTMs
      ft_utm_source: firstTouch ? firstTouch.utm_source : (affiliateData.ft_utm_source || ''),
      ft_utm_medium: firstTouch ? firstTouch.utm_medium : (affiliateData.ft_utm_medium || ''),
      ft_utm_campaign: firstTouch ? firstTouch.utm_campaign : (affiliateData.ft_utm_campaign || ''),
      ft_utm_content: firstTouch ? firstTouch.utm_content : (affiliateData.ft_utm_content || ''),
      ft_utm_term: firstTouch ? firstTouch.utm_term : (affiliateData.ft_utm_term || ''),
      // Last-touch UTMs (current cookie values)
      lt_utm_source: affiliateData.utm_source || '',
      lt_utm_medium: affiliateData.utm_medium || '',
      lt_utm_campaign: affiliateData.utm_campaign || '',
      lt_utm_content: affiliateData.utm_content || '',
      lt_utm_term: affiliateData.utm_term || '',
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
        if (result.ok) {
          console.log('[MassaPro] Lead tracked successfully:', result.data);
        } else {
          console.error('[MassaPro] Lead tracking failed:', result.data);
        }
        return result;
      })
      .catch(function (error) {
        console.error('[MassaPro] Lead tracking error:', error);
        throw error;
      });
  }

  // ---- Auto-Initialization ----

  function init() {
    var urlParams = parseUrlParams();
    var affid = urlParams.affid;

    if (affid) {
      // New affiliate visit with affid in URL
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

      // Save first-touch data (only if not already set)
      saveFirstTouchData(utmData);

      // Save as last-touch (always updated)
      utmData.ft_utm_source = urlParams.utm_source || '';
      utmData.ft_utm_medium = urlParams.utm_medium || '';
      utmData.ft_utm_campaign = urlParams.utm_campaign || '';
      utmData.ft_utm_content = urlParams.utm_content || '';
      utmData.ft_utm_term = urlParams.utm_term || '';
      saveAffiliateData(utmData);

      // Fire click tracking pixel
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
      // No affid in URL - check if we have a cookie from a previous visit
      var existingData = getAffiliateData();
      if (existingData) {
        // Update last-touch UTMs from URL params if present
        var updated = false;
        if (urlParams.utm_source) { existingData.utm_source = urlParams.utm_source; updated = true; }
        if (urlParams.utm_medium) { existingData.utm_medium = urlParams.utm_medium; updated = true; }
        if (urlParams.utm_campaign) { existingData.utm_campaign = urlParams.utm_campaign; updated = true; }
        if (urlParams.utm_content) { existingData.utm_content = urlParams.utm_content; updated = true; }
        if (urlParams.utm_term) { existingData.utm_term = urlParams.utm_term; updated = true; }

        // Keep the cookie alive (extend expiry on return visits)
        saveAffiliateData(existingData);

        // Fire pageview tracking for return visits
        if (_config.dashboardUrl && updated) {
          fireClickTracking(existingData.affid, {
            utm_source: existingData.utm_source,
            utm_medium: existingData.utm_medium,
            utm_campaign: existingData.utm_campaign,
            utm_content: existingData.utm_content,
            utm_term: existingData.utm_term,
          });
        }
      }
    }
  }

  // ---- Public API ----

  var MassaProAffiliate = {
    /**
     * Configure the tracker with your dashboard URL
     * @param {Object} options - Configuration options
     * @param {string} options.dashboardUrl - The URL of your MassaPro Affiliate Dashboard
     */
    config: function (options) {
      if (options.dashboardUrl) {
        _config.dashboardUrl = options.dashboardUrl.replace(/\/+$/, '');
      }
    },

    /**
     * Track a lead submission. Call this when a visitor fills out a form.
     * @param {Object} data - Lead data
     * @param {string} data.lead_name - The lead's name
     * @param {string} data.lead_email - The lead's email
     * @param {string} data.lead_phone - The lead's phone (optional)
     * @param {string} data.lead_company - The lead's company (optional)
     * @param {string} [data.plan_type] - Plan type: "Enterprise", "Professional", or "Basic"
     * @param {string} [data.initial_status] - Initial status, defaults to "Lead"
     * @returns {Promise} Resolves with the API response
     */
    trackLead: function (data) {
      return trackLeadViaPost(data);
    },

    /**
     * Track a button click event. Call this when a visitor clicks a CTA button.
     * @param {string} eventId - The event identifier (e.g. "btn_hero_demo", "btn_pricing_tier")
     * @returns {void}
     */
    trackEvent: function (eventId) {
      var affiliateData = getAffiliateData();
      if (!affiliateData || !affiliateData.affid) {
        console.warn('[MassaPro] No affiliate attribution found. Event will not be tracked.');
        return;
      }

      fireClickTracking(affiliateData.affid, {
        utm_source: affiliateData.utm_source,
        utm_medium: affiliateData.utm_medium,
        utm_campaign: affiliateData.utm_campaign,
        utm_content: affiliateData.utm_content,
        utm_term: affiliateData.utm_term,
      }, 'button_click', eventId);
    },

    /**
     * Get the current affiliate attribution data from the cookie
     * @returns {Object|null} The affiliate data or null if not attributed
     */
    getAttribution: function () {
      return getAffiliateData();
    },

    /**
     * Get the first-touch attribution data (never overwritten)
     * @returns {Object|null} The first-touch data or null
     */
    getFirstTouch: function () {
      return getFirstTouchData();
    },

    /**
     * Get the current session ID
     * @returns {string} The session ID
     */
    getSessionId: function () {
      return getOrCreateSessionId();
    },
  };

  // Expose to global scope
  window.MassaProAffiliate = MassaProAffiliate;

  // Auto-init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      // Small delay to allow config() to be called first
      setTimeout(init, 100);
    });
  } else {
    setTimeout(init, 100);
  }
})(window);
