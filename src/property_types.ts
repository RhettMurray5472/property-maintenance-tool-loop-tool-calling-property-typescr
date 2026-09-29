import { z } from "zod";

export const maintenanceRequestSchema = z.object({
  requestId: z.string().min(1),
  submittedAt: z.string().datetime(),
  unitId: z.string().min(1),
  tenant: z.object({
    tenantId: z.string().min(1),
    fullName: z.string().min(1),
    phone: z.string().min(1),
    hasMobilityRisk: z.boolean()
  }),
  issue: z.object({
    category: z.enum(["leak", "electrical", "hvac", "appliance", "other"]),
    summary: z.string().min(1),
    details: z.string().min(1),
    enteredUnitConsent: z.boolean()
  }),
  tenantDocuments: z.array(
    z.object({
      documentId: z.string().min(1),
      kind: z.enum(["lease", "photo", "inspection", "invoice", "other"]),
      note: z.string().min(1)
    })
  ),
  inspections: z.array(
    z.object({
      inspectionId: z.string().min(1),
      dueDate: z.string().datetime(),
      type: z.enum(["move-in", "move-out", "annual-safety", "filter-change"]),
      status: z.enum(["scheduled", "due", "done"])
    })
  )
});

export type MaintenanceRequest = z.infer<typeof maintenanceRequestSchema>;

export const dispatchPlanSchema = z.object({
  requestId: z.string(),
  urgency: z.enum(["routine", "priority", "emergency"]),
  action: z.enum(["dispatch_now", "schedule_visit", "request_more_info"]),
  notifyTenant: z.boolean(),
  reasons: z.array(z.string()),
  usedDocumentIds: z.array(z.string()),
  reminderFocus: z.string()
});

export type DispatchPlan = z.infer<typeof dispatchPlanSchema>;

export const reminderSchema = z.object({
  inspectionId: z.string(),
  reason: z.string(),
  scoreNote: z.string()
});

export type Reminder = z.infer<typeof reminderSchema>;

export const automationResultSchema = z.object({
  plan: dispatchPlanSchema,
  reminders: z.array(reminderSchema)
});

export type AutomationResult = z.infer<typeof automationResultSchema>;
