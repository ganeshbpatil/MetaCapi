# MetaCapi — Facebook Conversion API + Zoho CRM Integration

Server-side tracking middleware that sends CRM lifecycle events to Facebook Conversion API (CAPI) for closed-loop attribution and revenue optimization.

## Architecture

```
Website / FB Lead Ads / Instagram Lead Ads
        │
   Zoho CRM (Leads & Deals)
        │  Workflow Webhooks
        ▼
  Middleware (Node.js / Express)
  ├── Webhook receiver  ← validates Zoho/Meta signatures
  ├── Bull queue        ← async, retries with exponential backoff
  └── CAPI sender       ← hashes PII, builds payloads, sends to Graph API
        │
  Facebook Graph API  /v19.0/{pixel_id}/events
        │
  Events Manager → Ad Optimization
```

## Events Sent

| CRM Trigger | CAPI Event |
|---|---|
| Lead created | `Lead` |
| Lead status → Qualified | `QualifiedLead` (custom) |
| Deal created | `Schedule` |
| Deal → Closed Won | `Purchase` (with revenue value) |
| Deal → Closed Lost | `DealLost` (suppression signal) |
| Lead disqualified | `Disqualified` (custom) |

## Setup

### 1. Clone and install

```bash
git clone https://github.com/ganeshbpatil/metacapi.git
cd metacapi
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

Required variables:

| Variable | Description |
|---|---|
| `FB_PIXEL_ID` | Your Meta Pixel / Dataset ID |
| `FB_ACCESS_TOKEN` | System User long-lived access token |
| `FB_APP_SECRET` | Facebook App secret (webhook signature) |
| `ZOHO_WEBHOOK_SECRET` | Secret for signing Zoho webhook payloads |
| `REDIS_HOST` / `REDIS_PORT` | Redis connection for Bull queue |

### 3. Start Redis

```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### 4. Run the server

```bash
npm start          # production
npm run dev        # development (nodemon)
npm run worker     # standalone queue worker
```

### 5. Expose via HTTPS (development)

```bash
npx localtunnel --port 3000
```

Point your Zoho Workflow webhooks to `https://<tunnel>/webhooks/zoho`.

## Zoho CRM Webhook Payload

Your Zoho Workflow should POST to `/webhooks/zoho` with the header `X-Zoho-Signature` and body:

```json
{
  "event_type": "lead_created",
  "record_id": "ZOHO_LEAD_ID",
  "record_data": {
    "email": "user@example.com",
    "phone": "+91-9876543210",
    "firstName": "Priya",
    "lastName": "Sharma",
    "sourcePlatform": "instagram",
    "campaignId": "987654321",
    "adSetId": "111222333",
    "adId": "444555666",
    "formId": "777888999",
    "facebookLeadId": "2468013579135790"
  }
}
```

Supported `event_type` values: `lead_created`, `lead_qualified`, `lead_disqualified`, `deal_created`, `deal_won`, `deal_lost`.

## Deluge Functions (in-CRM)

The `deluge/` directory contains Zoho Deluge scripts for lightweight in-CRM CAPI sending (no middleware required). Suitable for < 500 leads/month.

| File | Purpose |
|---|---|
| `send_lead_event.deluge` | Fire `Lead` event on lead creation |
| `send_qualified_lead_event.deluge` | Fire `QualifiedLead` on status change |
| `send_purchase_event.deluge` | Fire `Purchase` on Deal Won |
| `send_deal_lost_event.deluge` | Fire `DealLost` on Deal Lost |
| `copy_attribution_to_deal.deluge` | Copy FB attribution from Lead → Deal |

Store `FB_Pixel_ID` and `FB_Access_Token` as **CRM Variables** (Setup → CRM Variables) — never hardcode them.

## Website Tracking

Include `website/tracking.js` on all pages with lead forms. It:
- Captures `fbclid` from URL into `sessionStorage`
- Constructs the `fbc` cookie value
- Reads the `_fbp` browser cookie set by Meta Pixel
- Fires `fbq('track', 'Lead', {}, { eventID })` on form submit for deduplication

Add `data-capi-form` attribute to your form elements, and hidden fields with IDs: `fbclid_field`, `fbc_field`, `fbp_field`, `capi_event_id`.

## Tests

```bash
npm test
```

## Health Check

```
GET /health
```

Returns queue stats (waiting, active, failed jobs) and overall status.

## Security

- Zoho webhook signature verified via HMAC-SHA256
- Meta webhook challenge/response verification
- Helmet.js security headers
- Rate limiting: 100 req/min per IP on webhook endpoints
- All PII hashed with SHA256 before transmission
- Credentials stored in environment variables only — never in code
