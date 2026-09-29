import test from "node:test";
import assert from "node:assert/strict";
import { maintenanceRequestSchema } from "../src/property_types";
import { buildDispatchPlan, planToolCalls, runToolCall } from "../src/property_tools";

test("ceiling leak with mobility risk becomes emergency dispatch and carries photo context", () => {
  const input = maintenanceRequestSchema.parse({
    requestId: "req-1042",
    submittedAt: "2026-01-15T10:30:00.000Z",
    unitId: "B-204",
    tenant: {
      tenantId: "tenant-88",
      fullName: "Mina Patel",
      phone: "555-0104",
      hasMobilityRisk: true
    },
    issue: {
      category: "leak",
      summary: "Water stain spreading across bedroom ceiling",
      details: "Tenant reports active dripping near the smoke detector after last night's storm.",
      enteredUnitConsent: true
    },
    tenantDocuments: [
      { documentId: "doc-photo-1", kind: "photo", note: "Ceiling stain photo from today" },
      { documentId: "doc-insp-1", kind: "inspection", note: "Annual safety inspection from last month" }
    ],
    inspections: [
      {
        inspectionId: "insp-annual-2026",
        dueDate: "2026-01-18T09:00:00.000Z",
        type: "annual-safety",
        status: "due"
      }
    ]
  });

  const toolResults = planToolCalls(input).map((call) => runToolCall(input, call));
  const plan = buildDispatchPlan(input, toolResults);

  assert.equal(plan.urgency, "emergency");
  assert.equal(plan.action, "dispatch_now");
  assert.deepEqual(plan.usedDocumentIds, ["doc-photo-1", "doc-insp-1"]);
  assert.ok(plan.reasons.includes("Tenant photos were attached for technician context."));
});
