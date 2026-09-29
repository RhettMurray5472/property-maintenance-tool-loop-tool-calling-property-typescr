import { MaintenanceRequest, DispatchPlan } from "./property_types";

export type ToolCall = {
  name: "lookupTenantDocs" | "listInspectionCandidates";
  arguments: Record<string, unknown>;
};

export type ToolResult = {
  name: ToolCall["name"];
  output: unknown;
};

export function planToolCalls(request: MaintenanceRequest): ToolCall[] {
  return [
    {
      name: "lookupTenantDocs",
      arguments: {
        tenantId: request.tenant.tenantId,
        unitId: request.unitId,
        issueCategory: request.issue.category
      }
    },
    {
      name: "listInspectionCandidates",
      arguments: {
        unitId: request.unitId,
        reminderFocus: request.issue.category
      }
    }
  ];
}

export function runToolCall(request: MaintenanceRequest, call: ToolCall): ToolResult {
  if (call.name === "lookupTenantDocs") {
    const docs = request.tenantDocuments.filter((doc) => {
      if (request.issue.category === "leak") {
        return doc.kind === "photo" || doc.kind === "inspection";
      }
      return doc.kind !== "invoice";
    });
    return {
      name: call.name,
      output: docs.map((doc) => ({
        documentId: doc.documentId,
        kind: doc.kind,
        note: doc.note
      }))
    };
  }

  const inspections = request.inspections
    .filter((inspection) => inspection.status !== "done")
    .map((inspection) => ({
      inspectionId: inspection.inspectionId,
      dueDate: inspection.dueDate,
      type: inspection.type,
      status: inspection.status
    }));

  return {
    name: call.name,
    output: inspections
  };
}

export function buildDispatchPlan(request: MaintenanceRequest, toolResults: ToolResult[]): DispatchPlan {
  const docResult = toolResults.find((item) => item.name === "lookupTenantDocs");
  const docs = Array.isArray(docResult?.output) ? docResult.output as Array<{ documentId: string; kind: string }> : [];

  const reasons: string[] = [];
  let urgency: DispatchPlan["urgency"] = "routine";
  let action: DispatchPlan["action"] = "schedule_visit";

  if (request.issue.category === "leak") {
    urgency = "priority";
    reasons.push("Water issues can spread quickly.");
  }

  const joinedText = `${request.issue.summary} ${request.issue.details}`.toLowerCase();
  if (joinedText.includes("ceiling") || joinedText.includes("active dripping") || joinedText.includes("sparks")) {
    urgency = "emergency";
    action = "dispatch_now";
    reasons.push("The report points to immediate property risk.");
  }

  if (request.tenant.hasMobilityRisk) {
    reasons.push("Tenant profile indicates added safety impact.");
    if (urgency === "routine") {
      urgency = "priority";
    }
  }

  if (!request.issue.enteredUnitConsent && action === "schedule_visit") {
    reasons.push("Entry consent is missing, so visit needs coordination.");
  }

  if (docs.some((doc) => doc.kind === "photo")) {
    reasons.push("Tenant photos were attached for technician context.");
  }

  return {
    requestId: request.requestId,
    urgency,
    action,
    notifyTenant: true,
    reasons,
    usedDocumentIds: docs.map((doc) => doc.documentId),
    reminderFocus: `${request.issue.category} follow-up for unit ${request.unitId}`
  };
}
