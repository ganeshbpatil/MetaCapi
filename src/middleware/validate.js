const Joi = require('joi');

const zohoWebhookSchema = Joi.object({
  event_type: Joi.string()
    .valid('lead_created', 'lead_qualified', 'lead_disqualified', 'deal_created', 'deal_won', 'deal_lost')
    .required(),
  record_id: Joi.string().required(),
  record_data: Joi.object().required(),
}).unknown(true);

function validateZohoWebhook(req, res, next) {
  const { error } = zohoWebhookSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
}

module.exports = { validateZohoWebhook };
