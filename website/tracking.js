(function () {
  'use strict';

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function getQueryParam(key) {
    return new URLSearchParams(window.location.search).get(key);
  }

  function constructFbc(fbclid) {
    return 'fb.1.' + Math.floor(Date.now() / 1000) + '.' + fbclid;
  }

  function getFbc() {
    return getCookie('_fbc') || (getQueryParam('fbclid') ? constructFbc(getQueryParam('fbclid')) : null);
  }

  function getFbp() {
    return getCookie('_fbp');
  }

  function captureFbclid() {
    const fbclid = getQueryParam('fbclid');
    if (fbclid) {
      sessionStorage.setItem('fbclid', fbclid);
      sessionStorage.setItem('fbc', constructFbc(fbclid));
    }
  }

  function generateEventId() {
    return 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  function wireLeadForms() {
    document.querySelectorAll('form[data-capi-form]').forEach(function (form) {
      var fields = {
        fbclid_field: sessionStorage.getItem('fbclid') || getQueryParam('fbclid'),
        fbc_field: getFbc(),
        fbp_field: getFbp(),
      };
      Object.keys(fields).forEach(function (id) {
        var el = form.querySelector('#' + id);
        if (el && fields[id]) el.value = fields[id];
      });

      form.addEventListener('submit', function () {
        var eventId = generateEventId();
        var eventIdField = form.querySelector('#capi_event_id');
        if (eventIdField) eventIdField.value = eventId;
        if (typeof fbq === 'function') {
          fbq('track', 'Lead', {}, { eventID: eventId });
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    captureFbclid();
    wireLeadForms();
  });

  window.MetaCapi = { getFbc: getFbc, getFbp: getFbp, generateEventId: generateEventId };
})();
