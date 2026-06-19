const express = require('express');
const router = express.Router({ mergeParams: true });
const accountModel = require('../../db/models/account');
const zohoConfigModel = require('../../db/models/zoho-config');
const fieldMappingModel = require('../../db/models/field-mapping');
const { fetchAllFields } = require('../../services/zoho-fields');

router.use(express.urlencoded({ extended: true }));

router.get('/', async (req, res) => {
  const account = accountModel.findById(req.params.id);
  if (!account) return res.status(404).renderPage('error', { message: 'Account not found' });

  const mappings = fieldMappingModel.findByAccount(req.params.id);
  const flash = req.session.flash;
  const flashError = req.session.flash_error;
  delete req.session.flash;
  delete req.session.flash_error;

  // Fetch Zoho fields if connected
  let zohoFields = [];
  const zohoCfg = zohoConfigModel.findByAccountId(req.params.id);
  if (zohoCfg && zohoCfg.status === 'active') {
    try {
      zohoFields = await fetchAllFields(req.params.id);
    } catch (e) {
      // Non-fatal — fall back to free-text input
    }
  }

  res.renderPage('field-mapping', {
    account,
    mappings,
    fbFields: fieldMappingModel.FB_FIELDS,
    defaultZohoNames: fieldMappingModel.DEFAULT_ZOHO_NAMES,
    zohoFields,
    zohoConnected: zohoCfg?.status === 'active',
    flash,
    flashError,
  });
});

router.post('/save', (req, res) => {
  const { id: accountId } = req.params;
  const { mapping } = req.body;
  fieldMappingModel.save(accountId, mapping || {});
  req.session.flash = 'Field mappings saved successfully';
  req.session.save(() => res.redirect(`/admin/accounts/${accountId}/field-mapping`));
});

module.exports = router;
