jest.mock('../../src/services/facebook');
jest.mock('../../src/db/models/facebook-config', () => ({
  findByAccountId: jest.fn(() => ({
    pixel_id: '123',
    access_token: 'tok',
    app_secret: null,
    test_event_code: null,
  })),
}));
jest.mock('../../src/db/models/event-log', () => ({
  insert: jest.fn(),
}));

const facebook = require('../../src/services/facebook');
const { processEvent } = require('../../src/queue/processor');

const mockJob = (event_type, record_id = 'rec_001', record_data = { email: 'a@b.com' }) => ({
  data: { accountId: 'acc_001', event_type, record_id, record_data },
  attemptsMade: 0,
});

beforeEach(() => jest.clearAllMocks());

test('lead_created calls sendLeadEvent', async () => {
  facebook.sendLeadEvent.mockResolvedValue({ events_received: 1 });
  await processEvent(mockJob('lead_created'));
  expect(facebook.sendLeadEvent).toHaveBeenCalled();
});

test('lead_qualified calls sendQualifiedLeadEvent', async () => {
  facebook.sendQualifiedLeadEvent.mockResolvedValue({ events_received: 1 });
  await processEvent(mockJob('lead_qualified'));
  expect(facebook.sendQualifiedLeadEvent).toHaveBeenCalled();
});

test('deal_created calls sendScheduleEvent', async () => {
  facebook.sendScheduleEvent.mockResolvedValue({ events_received: 1 });
  await processEvent(mockJob('deal_created'));
  expect(facebook.sendScheduleEvent).toHaveBeenCalled();
});

test('deal_won calls sendPurchaseEvent', async () => {
  facebook.sendPurchaseEvent.mockResolvedValue({ events_received: 1 });
  await processEvent(mockJob('deal_won'));
  expect(facebook.sendPurchaseEvent).toHaveBeenCalled();
});

test('deal_lost calls sendDealLostEvent', async () => {
  facebook.sendDealLostEvent.mockResolvedValue({ events_received: 1 });
  await processEvent(mockJob('deal_lost'));
  expect(facebook.sendDealLostEvent).toHaveBeenCalled();
});

test('lead_disqualified calls sendDisqualifiedEvent', async () => {
  facebook.sendDisqualifiedEvent.mockResolvedValue({ events_received: 1 });
  await processEvent(mockJob('lead_disqualified'));
  expect(facebook.sendDisqualifiedEvent).toHaveBeenCalled();
});

test('unknown event_type returns skipped result', async () => {
  const result = await processEvent(mockJob('unknown_event'));
  expect(result.skipped).toBe(true);
});
