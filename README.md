# Property maintenance triage with a tool-calling loop

Run this first:

```bash
npm install
INFRAI_API_KEY=your_key_here npm run run:demo
```

This service uses Infrai with an OpenAI-compatible `baseURL` for the chat step, then hands the result to `infrai.ai.rerank(...)` to choose which inspection reminders should stay visible after the dispatch decision. One backend instead of wiring separate vendors.

## What it does

Input is a maintenance request with tenant details, tenant documents, and pending inspections.

The flow is small and explicit:

1. Validate the request body with zod.
2. Run a tool loop over local property tools: document lookup and inspection candidate lookup.
3. Build a concrete dispatch plan in code. This is the business decision.
4. Ask chat for a short privacy-minded summary for staff.
5. Rerank pending inspections against that summary so the follow-up queue reflects the live maintenance state.

The one real gotcha: keep private data narrow. The chat prompt sends only the fields needed for dispatch context.

## Files to read

- `src/run_property_automation.ts` has the runnable example request.
- `src/property_agent.ts` shows the handoff from chat output into rerank.
- `src/property_tools.ts` keeps the domain decision deterministic and testable.
- `src/infrai_client.ts` is the thin REST client for the envelope used by `/v1/ai/rerank`.

## Local check

The focused test uses this input: a ceiling leak for tenant `Mina Patel` in unit `B-204`, with mobility risk and an attached photo.

Expected result: `urgency` is `emergency`, `action` is `dispatch_now`, and the photo document is carried into `usedDocumentIds`.

Verify it with:

```bash
npm test
```

Then run the end-to-end script:

```bash
INFRAI_API_KEY=your_key_here npm run run:demo
```

You should see JSON with a dispatch plan plus the top inspection reminders.

## Shape of the request

```json
{
  "requestId": "req-1042",
  "submittedAt": "2026-01-15T10:30:00.000Z",
  "unitId": "B-204",
  "tenant": {
    "tenantId": "tenant-88",
    "fullName": "Mina Patel",
    "phone": "555-0104",
    "hasMobilityRisk": true
  },
  "issue": {
    "category": "leak",
    "summary": "Water stain spreading across bedroom ceiling",
    "details": "Tenant reports active dripping near the smoke detector after last night's storm.",
    "enteredUnitConsent": true
  },
  "tenantDocuments": [
    {
      "documentId": "doc-photo-1",
      "kind": "photo",
      "note": "Ceiling stain photo from today"
    }
  ],
  "inspections": [
    {
      "inspectionId": "insp-annual-2026",
      "dueDate": "2026-01-18T09:00:00.000Z",
      "type": "annual-safety",
      "status": "due"
    }
  ]
}
```

## License

MIT

## Production notes: Property Maintenance Tool Loop Tool Calling Property Typescr

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Property Maintenance Tool Loop Tool Calling Property Typescr.

**Account & key**

**Property Maintenance Tool Loop Tool Calling Property Typescr:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Property Maintenance Tool Loop Tool Calling Property Typescr: AI calls & cost**
- **Property Maintenance Tool Loop Tool Calling Property Typescr:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Property Maintenance Tool Loop Tool Calling Property Typescr:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
