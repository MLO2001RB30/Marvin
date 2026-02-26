import type { OpenAITool } from "../llm/client";

import { listWorkflows } from "../../services/workflowService";
import { executeWorkflow } from "../../services/orchestrationService";
import { createCalendarEvent } from "../../services/googleCalendarSyncService";
import { sendGmailReply } from "../../services/gmailSyncService";
import { sendSlackReply } from "../../services/slackSyncService";

export function getAssistantTools(userTimezone: string): OpenAITool[] {
  return [
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
        name: "reply_email",
        description: "Send a reply to a Gmail thread.",
        parameters: {
          type: "object",
          properties: {
            thread_id: { type: "string", description: "Gmail thread ID from context envelope" },
            body: { type: "string", description: "Reply text" }
          },
          required: ["thread_id", "body"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "reply_slack",
        description: "Send a reply to a Slack message.",
        parameters: {
          type: "object",
          properties: {
            channel_id: { type: "string", description: "Slack channel ID" },
            thread_ts: { type: "string", description: "Thread timestamp" },
            text: { type: "string", description: "Reply text" }
          },
          required: ["channel_id", "text"]
        }
      }
    }
  ];
}

export function createToolExecutor(userId: string, timezone: string) {
  return async function executeTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<string> {
    switch (name) {
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
      case "reply_email": {
        const threadId = String(args.thread_id ?? "");
        const body = String(args.body ?? "");
        if (!threadId || !body) return JSON.stringify({ error: "thread_id and body required" });
        const result = await sendGmailReply(userId, threadId, body);
        return JSON.stringify(result);
      }
      case "reply_slack": {
        const channelId = String(args.channel_id ?? "");
        const text = String(args.text ?? "");
        const threadTs = args.thread_ts ? String(args.thread_ts) : undefined;
        if (!channelId || !text) return JSON.stringify({ error: "channel_id and text required" });
        const result = await sendSlackReply(userId, channelId, text, threadTs);
        return JSON.stringify(result);
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  };
}
