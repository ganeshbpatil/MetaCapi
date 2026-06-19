jest.mock('../../src/services/facebook');
const facebook = require('../../src/services/facebook');
const { processEvent } = require('../../src/queue/processor');

const mockJob = (event_type, record_id = 'rec_001', record_data = { email: 'a@b.com' }) => ({
  data: { event_type, record_id, record_data },
  attemptsMade: 0,
});

beforeEach(() => jest.clearAllMocks());

test('lead_created calls sendLeadEvent', async () => {
  facebook.sendLeadEvent.mockResolvedValue({ success: true });
  await processEvent(mockJob('lead_created'));
  expect(facebook.sendLeadEvent).toHaveBeenCalledWith(expect.objectContaining({ zohoId: 'rec_001' }));
});

test('lead_qualified calls sendQualifiedLeadEvent', async () => {
  facebook.sendQualifiedLeadEvent.mockResolvedValue({ success: true });
  await processEvent(mockJob('lead_qualified'));
  expect(facebook.sendQualifiedLeadEvent).toHaveBeenCalled();
});

test('deal_won calls sendPurchaseEvent', async () => {
  facebook.sendPurchaseEvent.mockResolvedValue({ success: true });
  await processEvent(mockJob('deal_won'));
  expect(facebook.sendPurchaseEvent).toHaveBeenCalled();
});

test('deal_lost calls sendDealLostEvent', async () => {
  facebook.sendDealLostEvent.mockResolvedValue({ success: true });
  await processEvent(mockJob('deal_lost'));
  expect(facebook.sendDealLostEvent).toHaveBeenCalled();
});

test('unknown event_type returns skipped result', async () => {
  const result = await processEvent(mockJob('unknown_event'));
  expect(result.skipped).toBe(true);
});
