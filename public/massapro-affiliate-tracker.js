/**
 * MassaPro Affiliate Tracker
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
 *   MassaProAffiliate.config({ dashboardUrl: '...' })
 */
(function (window) {
  'use strict';

  var COOKIE_NAME = 'massapro_affiliate';
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

  function saveAffiliateData(data) {
    setCookie(COOKIE_NAME, JSON.stringify(data), COOKIE_EXPIRY_DAYS);
  }

  // ---- Tracking Functions ----

  function fireClickTracking(affid, utmParams) {
    var dashboardUrl = _config.dashboardUrl;
    if (!dashboardUrl) {
      console.warn('[MassaPro] Dashboard URL not configured. Call MassaProAffiliate.config({ dashboardUrl: "..." }) first.');
      return;
    }

    // Build pixel URL with UTM params
    var pixelUrl = dashboardUrl + '/api/track/click?affid=' + encodeURIComponent(affid);
    if (utmParams.utm_source) pixelUrl += '&utm_source=' + encodeURIComponent(utmParams.utm_source);
    if (utmParams.utm_medium) pixelUrl += '&utm_medium=' + encodeURIComponent(utmParams.utm_medium);
    if (utmParams.utm_campaign) pixelUrl += '&utm_campaign=' + encodeURIComponent(utmParams.utm_campaign);
    if (utmParams.utm_content) pixelUrl += '&utm_content=' + encodeURIComponent(utmParams.utm_content);
    pixelUrl += '&page_url=' + encodeURIComponent(window.location.href);

    // Fire tracking pixel (1x1 transparent GIF)
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

    var payload = {
      affid: affiliateData.affid,
      lead_name: data.lead_name || '',
      lead_email: data.lead_email || '',
      plan_type: data.plan_type || 'Basic',
      utm_campaign: affiliateData.utm_campaign || '',
      utm_content: affiliateData.utm_content || '',
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
      var affiliateData = {
        affid: affid,
        utm_source: urlParams.utm_source || '',
        utm_medium: urlParams.utm_medium || '',
        utm_campaign: urlParams.utm_campaign || '',
        utm_content: urlParams.utm_content || '',
        landing_page: window.location.href,
        timestamp: new Date().toISOString(),
      };

      // Save to cookie (30-day attribution)
      saveAffiliateData(affiliateData);

      // Fire click tracking pixel
      if (_config.dashboardUrl) {
        fireClickTracking(affid, {
          utm_source: urlParams.utm_source,
          utm_medium: urlParams.utm_medium,
          utm_campaign: urlParams.utm_campaign,
          utm_content: urlParams.utm_content,
        });
      }
    } else {
      // No affid in URL - check if we have a cookie from a previous visit
      var existingData = getAffiliateData();
      if (existingData) {
        // Keep the cookie alive (extend expiry on return visits)
        saveAffiliateData(existingData);
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
     * @param {string} [data.plan_type] - Plan type: "Enterprise", "Professional", or "Basic"
     * @param {string} [data.initial_status] - Initial status, defaults to "Lead"
     * @returns {Promise} Resolves with the API response
     */
    trackLead: function (data) {
      return trackLeadViaPost(data);
    },

    /**
     * Get the current affiliate attribution data from the cookie
     * @returns {Object|null} The affiliate data or null if not attributed
     */
    getAttribution: function () {
      return getAffiliateData();
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
