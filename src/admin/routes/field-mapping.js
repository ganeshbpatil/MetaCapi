const express = require('express');
const router = express.Router({ mergeParams: true });
const accountModel = require('../../db/models/account');
const fieldMappingModel = require('../../db/models/field-mapping');

router.use(express.urlencoded({ extended: true }));

router.get('/', (req, res) => {
  const account = accountModel.findById(req.params.id);
  if (!account) return res.status(404).renderPage('error', { message: 'Account not found' });

  const mappings = fieldMappingModel.findByAccount(req.params.id);
  const flash = req.session.flash;
  const flashError = req.session.flash_error;
  delete req.session.flash;
  delete req.session.flash_error;

  res.renderPage('field-mapping', {
    account,
    mappings,
    fbFields: fieldMappingModel.FB_FIELDS,
    defaultZohoNames: fieldMappingModel.DEFAULT_ZOHO_NAMES,
    flash,
    flashError,
  });
});

router.post('/save', (req, res) => {
  const { id: accountId } = req.params;
  const { mapping } = req.body;

  // mapping is { email: 'Email', phone: 'Mobile', ... }
  fieldMappingModel.save(accountId, mapping || {});
  req.session.flash = 'Field mappings saved successfully';
  req.session.save(() => res.redirect(`/admin/accounts/${accountId}/field-mapping`));
});

module.exports = router;
