import type { ExternalItem } from "@pia/shared";
import type { OpenAITool } from "../llm/client";

import { listExternalItems } from "../../services/integrationService";
import { syncGoogleCalendarForUser } from "../../services/googleCalendarSyncService";
import { listWorkflows, getWorkflowRunById } from "../../services/workflowService";
import { executeWorkflow } from "../../services/orchestrationService";
import { createCalendarEvent } from "../../services/googleCalendarSyncService";
import { getSupabaseClient } from "../../services/supabaseClient";

export function getAssistantTools(userTimezone: string): OpenAITool[] {
  return [
    {
      type: "function",
      function: {
        name: "get_calendar_day",
        description: "Get calendar events for a specific date. Syncs calendar if needed.",
        parameters: {
          type: "object",
          properties: {
            date: { type: "string", description: "Date in YYYY-MM-DD format" }
          },
          required: ["date"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "list_unanswered_email_threads",
        description: "List email threads that need a reply.",
        parameters: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Max number of threads to return", default: 10 }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_email_thread",
        description: "Get metadata and last messages for an email thread (redacted).",
        parameters: {
          type: "object",
          properties: {
            thread_id: { type: "string", description: "Email thread ID" }
          },
          required: ["thread_id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_calendar_event",
        description: `Create an event on the user's Google Calendar. User timezone: ${userTimezone}.`,
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Event title" },
            startIso: { type: "string", description: "Start YYYY-MM-DDTHH:mm:ss (local)" },
            endIso: { type: "string", description: "End YYYY-MM-DDTHH:mm:ss (local)" },
            description: { type: "string", description: "Optional description" }
          },
          required: ["title", "startIso", "endIso"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "list_workflows",
        description: "List the user's workflows.",
        parameters: { type: "object", properties: {} }
      }
    },
    {
      type: "function",
      function: {
        name: "run_workflow",
        description: "Execute a workflow by ID.",
        parameters: {
          type: "object",
          properties: {
            workflow_id: { type: "string", description: "Workflow ID to run" }
          },
          required: ["workflow_id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_workflow_run",
        description: "Get details of a workflow run.",
        parameters: {
          type: "object",
          properties: {
            run_id: { type: "string", description: "Workflow run ID" }
          },
          required: ["run_id"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_health_summary",
        description: "Get health data summary for a date range.",
        parameters: {
          type: "object",
          properties: {
            date_range: { type: "string", description: "e.g. 'today' or 'last_7_days'" }
          }
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_weather_forecast",
        description: "Get weather forecast.",
        parameters: {
          type: "object",
          properties: {
            range: { type: "string", description: "e.g. 'today' or 'week'" }
          }
        }
      }
    }
  ];
}

export function createToolExecutor(userId: string, timezone: string) {
  let cachedItems: ExternalItem[] | null = null;

  async function getItems(): Promise<ExternalItem[]> {
    if (cachedItems) return cachedItems;
    cachedItems = await listExternalItems(userId);
    return cachedItems;
  }

  function invalidateItemCache() {
    cachedItems = null;
  }

  return async function executeTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<string> {
    switch (name) {
      case "get_calendar_day": {
        await syncGoogleCalendarForUser(userId);
        invalidateItemCache();
        const items = await getItems();
        const date = String(args.date ?? new Date().toISOString().slice(0, 10));
        const calendarItems = items.filter(
          (i) =>
            i.provider === "google_calendar" &&
            i.type === "calendar_event" &&
            !i.sourceRef?.startsWith("initial-sync") &&
            i.summary.startsWith(date)
        );
        return JSON.stringify(
          calendarItems.map((i) => ({
            id: i.id,
            title: i.title,
            summary: i.summary.slice(0, 200)
          }))
        );
      }
      case "list_unanswered_email_threads": {
        const items = await getItems();
        const limit = Math.min(Number(args.limit) || 10, 20);
        const threads = items
          .filter((i) => i.provider === "gmail" && i.type === "gmail_thread" && i.requiresReply)
          .slice(0, limit)
          .map((i) => ({
            id: i.id,
            title: i.title,
            sender: i.sender,
            summary: (i.summary ?? "").slice(0, 150)
          }));
        return JSON.stringify(threads);
      }
      case "get_email_thread": {
        const threadId = String(args.thread_id ?? "");
        const items = await getItems();
        const item = items.find((i) => i.provider === "gmail" && (i.id === threadId || i.sourceRef === threadId));
        if (!item) return JSON.stringify({ error: "Thread not found" });
        return JSON.stringify({
          id: item.id,
          title: item.title,
          sender: item.sender,
          summary: (item.summary ?? "").slice(0, 500)
        });
      }
      case "create_calendar_event": {
        const created = await createCalendarEvent(userId, {
          title: String(args.title ?? "Event"),
          startIso: String(args.startIso ?? ""),
          endIso: String(args.endIso ?? ""),
          description: args.description ? String(args.description) : undefined,
          timeZone: timezone
        });
        return created
          ? JSON.stringify({ success: true, id: created.id, htmlLink: created.htmlLink })
          : JSON.stringify({ success: false, error: "Calendar not connected or sync failed" });
      }
      case "list_workflows": {
        const workflows = await listWorkflows(userId);
        return JSON.stringify(
          workflows.map((w) => ({ id: w.id, name: w.name, enabled: w.enabled }))
        );
      }
      case "run_workflow": {
        const workflowId = String(args.workflow_id ?? "");
        const workflows = await listWorkflows(userId);
        const workflow = workflows.find((w) => w.id === workflowId);
        if (!workflow) return JSON.stringify({ error: "Workflow not found" });
        const run = await executeWorkflow(userId, workflow);
        return JSON.stringify({
          run_id: run.id,
          status: run.status,
          digest_summary: run.digest?.summary
        });
      }
      case "get_workflow_run": {
        const runId = String(args.run_id ?? "");
        const run = await getWorkflowRunById(userId, runId);
        if (!run) return JSON.stringify({ error: "Run not found" });
        return JSON.stringify({
          id: run.id,
          workflow_id: run.workflowId,
          status: run.status,
          digest_summary: run.digest?.summary
        });
      }
      case "get_health_summary": {
        const client = getSupabaseClient();
        if (!client) return JSON.stringify({ error: "Database unavailable" });
        const { data } = await client
          .from("context_inputs")
          .select("payload")
          .eq("user_id", userId)
          .eq("source", "healthkit")
          .order("captured_at_iso", { ascending: false })
          .limit(1)
          .maybeSingle();
        return JSON.stringify(data?.payload ?? { error: "No health data" });
      }
      case "get_weather_forecast": {
        const client = getSupabaseClient();
        if (!client) return JSON.stringify({ error: "Database unavailable" });
        const { data } = await client
          .from("context_inputs")
          .select("payload")
          .eq("user_id", userId)
          .eq("source", "weatherkit")
          .order("captured_at_iso", { ascending: false })
          .limit(1)
          .maybeSingle();
        return JSON.stringify(data?.payload ?? { error: "No weather data" });
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  };
}

/** @deprecated Use createToolExecutor instead */
export const executeTool = async (
  userId: string,
  name: string,
  args: Record<string, unknown>
): Promise<string> => {
  return createToolExecutor(userId, "UTC")(name, args);
};
