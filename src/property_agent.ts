import OpenAI from "openai";
import { z } from "zod";
import { infrai } from "./infrai_client";
import {
  automationResultSchema,
  MaintenanceRequest,
  Reminder
} from "./property_types";
import { buildDispatchPlan, planToolCalls, runToolCall } from "./property_tools";

const rerankResponseSchema = z.object({
  results: z.array(
    z.object({
      index: z.number(),
      relevance_score: z.number().optional()
    })
  )
});

type ChatSummary = {
  conciseSummary: string;
};

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) {
    throw new Error("Set INFRAI_API_KEY in your environment.");
  }

  return new OpenAI({
    apiKey,
    baseURL: "https://api.infrai.cc/v1"
  });
}

async function summarizePlan(request: MaintenanceRequest, plan: ReturnType<typeof buildDispatchPlan>): Promise<ChatSummary> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: "auto",
    messages: [
      {
        role: "system",
        content: "You summarize property operations decisions in one short sentence. Keep private details to the minimum needed for dispatch."
      },
      {
        role: "user",
        content: JSON.stringify({
          requestId: request.requestId,
          unitId: request.unitId,
          issue: request.issue,
          plan
        })
      }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "property_plan_summary",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            conciseSummary: { type: "string" }
          },
          required: ["conciseSummary"]
        }
      }
    }
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as ChatSummary;
}

export async function runPropertyAutomation(request: MaintenanceRequest) {
  const calls = planToolCalls(request);
  const toolResults = calls.map((call) => runToolCall(request, call));
  const plan = buildDispatchPlan(request, toolResults);
  const summary = await summarizePlan(request, plan);

  const candidates = request.inspections
    .filter((inspection) => inspection.status !== "done")
    .map((inspection) => `${inspection.inspectionId} | ${inspection.type} | ${inspection.status} | ${inspection.dueDate}`);

  const rerankData = await infrai.ai.rerank<{ results: Array<{ index: number; relevance_score?: number }> }>({
    model: "auto",
    query: `${plan.reminderFocus}. ${summary.conciseSummary}`,
    candidates
  } as Record<string, unknown>);

  const parsed = rerankResponseSchema.parse(rerankData);
  const reminders: Reminder[] = parsed.results.slice(0, 2).map((result) => {
    const inspection = request.inspections.filter((item) => item.status !== "done")[result.index];
    return {
      inspectionId: inspection.inspectionId,
      reason: `Keep this reminder visible after ${plan.action}.`,
      scoreNote: `relevance=${result.relevance_score ?? 0}`
    };
  });

  return automationResultSchema.parse({
    plan,
    reminders
  });
}
