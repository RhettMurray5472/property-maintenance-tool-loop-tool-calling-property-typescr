import { maintenanceRequestSchema } from "./property_types";
import { runPropertyAutomation } from "./property_agent";

async function main() {
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
      { documentId: "doc-insp-1", kind: "inspection", note: "Annual safety inspection from last month" },
      { documentId: "doc-lease-1", kind: "lease", note: "Current signed lease" }
    ],
    inspections: [
      {
        inspectionId: "insp-annual-2026",
        dueDate: "2026-01-18T09:00:00.000Z",
        type: "annual-safety",
        status: "due"
      },
      {
        inspectionId: "insp-filter-2026-01",
        dueDate: "2026-01-25T09:00:00.000Z",
        type: "filter-change",
        status: "scheduled"
      },
      {
        inspectionId: "insp-movein-archived",
        dueDate: "2025-11-01T09:00:00.000Z",
        type: "move-in",
        status: "done"
      }
    ]
  });

  const result = await runPropertyAutomation(input);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
