/**
 * Website tracking helpers for Facebook CAPI integration.
 * Include this script on all pages that have lead forms.
 */

(function () {
  'use strict';

  // ---------- Cookie helpers ----------

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  // ---------- fbclid / fbc / fbp ----------

  function getQueryParam(key) {
    return new URLSearchParams(window.location.search).get(key);
  }

  function constructFbc(fbclid) {
    const ts = Math.floor(Date.now() / 1000);
    return 'fb.1.' + ts + '.' + fbclid;
  }

  function getFbc() {
    return getCookie('_fbc') || (getQueryParam('fbclid') ? constructFbc(getQueryParam('fbclid')) : null);
  }

  function getFbp() {
    return getCookie('_fbp');
  }

  // ---------- Capture fbclid from URL into sessionStorage ----------

  function captureFbclid() {
    const fbclid = getQueryParam('fbclid');
    if (fbclid) {
      sessionStorage.setItem('fbclid', fbclid);
      sessionStorage.setItem('fbc', constructFbc(fbclid));
    }
  }

  // ---------- Populate hidden form fields ----------

  function populateHiddenFields(form) {
    const fields = {
      fbclid_field: sessionStorage.getItem('fbclid') || getQueryParam('fbclid'),
      fbc_field: getFbc(),
      fbp_field: getFbp(),
    };

    Object.entries(fields).forEach(function (entry) {
      const el = form.querySelector('#' + entry[0]);
      if (el && entry[1]) el.value = entry[1];
    });
  }

  // ---------- Event ID generation ----------

  function generateEventId() {
    return 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // ---------- Wire up all lead forms ----------

  function wireLeadForms() {
    document.querySelectorAll('form[data-capi-form]').forEach(function (form) {
      populateHiddenFields(form);

      form.addEventListener('submit', function () {
        const eventId = generateEventId();
        const eventIdField = form.querySelector('#capi_event_id');
        if (eventIdField) eventIdField.value = eventId;

        // Fire Pixel event with matching event_id for deduplication
        if (typeof fbq === 'function') {
          fbq('track', 'Lead', {}, { eventID: eventId });
        }
      });
    });
  }

  // ---------- Init ----------

  document.addEventListener('DOMContentLoaded', function () {
    captureFbclid();
    wireLeadForms();
  });

  // Expose helpers globally for custom integrations
  window.MetaCapi = {
    getFbc: getFbc,
    getFbp: getFbp,
    generateEventId: generateEventId,
  };
})();
