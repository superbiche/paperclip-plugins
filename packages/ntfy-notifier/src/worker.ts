import {
  definePlugin,
  runWorker,
  type PluginContext,
  type PluginEvent,
} from "@paperclipai/plugin-sdk";

interface NtfyConfig {
  ntfyBaseUrl: string;
  ntfyTopic: string;
  ntfyToken?: string;
  priority: number;
  notifyOnRunStarted: boolean;
  notifyOnRunFinished: boolean;
  notifyOnRunFailed: boolean;
  notifyOnIssueStatusChange: boolean;
}

const DEFAULT_CONFIG: Omit<NtfyConfig, "ntfyTopic"> = {
  ntfyBaseUrl: "https://ntfy.sh",
  priority: 3,
  notifyOnRunStarted: false,
  notifyOnRunFinished: true,
  notifyOnRunFailed: true,
  notifyOnIssueStatusChange: false,
};

const PRIORITY_FAILURE = 5;
const PRIORITY_START = 2;

let lastPublishAt: string | null = null;
let lastPublishError: string | null = null;

async function readConfig(ctx: PluginContext): Promise<NtfyConfig | null> {
  const raw = (await ctx.config.get()) as Partial<NtfyConfig> | null;
  if (!raw || typeof raw.ntfyTopic !== "string" || raw.ntfyTopic.length === 0) {
    return null;
  }
  return {
    ...DEFAULT_CONFIG,
    ...raw,
    ntfyTopic: raw.ntfyTopic,
  };
}

async function publish(
  ctx: PluginContext,
  config: NtfyConfig,
  options: {
    title: string;
    body: string;
    priority?: number;
    tags?: string[];
    click?: string;
  },
): Promise<void> {
  const url = `${config.ntfyBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(config.ntfyTopic)}`;
  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    Title: options.title,
    Priority: String(options.priority ?? config.priority),
  };
  if (options.tags && options.tags.length > 0) {
    headers.Tags = options.tags.join(",");
  }
  if (options.click) {
    headers.Click = options.click;
  }
  if (config.ntfyToken) {
    headers.Authorization = `Bearer ${config.ntfyToken}`;
  }
  try {
    const response = await ctx.http.fetch(url, {
      method: "POST",
      headers,
      body: options.body,
    });
    if (!response.ok) {
      lastPublishError = `HTTP ${response.status} from ntfy`;
      ctx.logger.warn("ntfy publish failed", { status: response.status, url });
      return;
    }
    lastPublishAt = new Date().toISOString();
    lastPublishError = null;
  } catch (err) {
    lastPublishError = err instanceof Error ? err.message : String(err);
    ctx.logger.error("ntfy publish threw", { err: lastPublishError, url });
  }
}

function truncate(text: string, max = 240): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function readPayload<T = Record<string, unknown>>(event: PluginEvent): T {
  return (event.payload ?? {}) as T;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return undefined;
}

async function handleRunStarted(ctx: PluginContext, config: NtfyConfig, event: PluginEvent): Promise<void> {
  if (!config.notifyOnRunStarted) return;
  const payload = readPayload(event);
  const agentName = pickString(payload["agentName"], payload["agent_name"]) ?? "agent";
  const issueTitle = pickString(payload["issueTitle"], payload["issue_title"]);
  const body = issueTitle ? `${agentName} started work on "${truncate(issueTitle, 120)}"` : `${agentName} run started`;
  await publish(ctx, config, {
    title: "Paperclip · run started",
    body,
    priority: PRIORITY_START,
    tags: ["rocket"],
  });
}

async function handleRunFinished(ctx: PluginContext, config: NtfyConfig, event: PluginEvent): Promise<void> {
  if (!config.notifyOnRunFinished) return;
  const payload = readPayload(event);
  const agentName = pickString(payload["agentName"], payload["agent_name"]) ?? "agent";
  const issueTitle = pickString(payload["issueTitle"], payload["issue_title"]);
  const durationSec = typeof payload["durationSec"] === "number" ? (payload["durationSec"] as number) : undefined;
  const parts = [issueTitle ? `"${truncate(issueTitle, 120)}"` : "a task"];
  if (durationSec !== undefined) parts.push(`${Math.round(durationSec)}s`);
  const body = `${agentName} finished ${parts.join(" · ")}`;
  await publish(ctx, config, {
    title: "Paperclip · run finished",
    body,
    tags: ["white_check_mark"],
  });
}

async function handleRunFailed(ctx: PluginContext, config: NtfyConfig, event: PluginEvent): Promise<void> {
  if (!config.notifyOnRunFailed) return;
  const payload = readPayload(event);
  const agentName = pickString(payload["agentName"], payload["agent_name"]) ?? "agent";
  const issueTitle = pickString(payload["issueTitle"], payload["issue_title"]);
  const errorSummary = pickString(payload["error"], payload["message"], payload["reason"]);
  const header = issueTitle ? `${agentName} failed on "${truncate(issueTitle, 120)}"` : `${agentName} run failed`;
  const body = errorSummary ? `${header}\n${truncate(errorSummary, 240)}` : header;
  await publish(ctx, config, {
    title: "Paperclip · run FAILED",
    body,
    priority: PRIORITY_FAILURE,
    tags: ["rotating_light"],
  });
}

async function handleIssueStatusChanged(ctx: PluginContext, config: NtfyConfig, event: PluginEvent): Promise<void> {
  if (!config.notifyOnIssueStatusChange) return;
  const payload = readPayload(event);
  const fromStatus = pickString(payload["previousStatus"], payload["fromStatus"]);
  const toStatus = pickString(payload["status"], payload["newStatus"], payload["toStatus"]);
  if (!toStatus || fromStatus === toStatus) return;
  const issueTitle = pickString(payload["title"], payload["issueTitle"]);
  const identifier = pickString(payload["identifier"], payload["issueIdentifier"]);
  const pretty = identifier ? `${identifier} — ${truncate(issueTitle ?? "(untitled)", 120)}` : issueTitle ?? "(untitled issue)";
  const body = fromStatus ? `${pretty}\n${fromStatus} → ${toStatus}` : `${pretty}\n→ ${toStatus}`;
  await publish(ctx, config, {
    title: "Paperclip · issue status",
    body,
    tags: ["arrow_right"],
  });
}

const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info("ntfy-notifier setup");

    async function wrapped(
      handler: (ctx: PluginContext, config: NtfyConfig, event: PluginEvent) => Promise<void>,
    ) {
      return async (event: PluginEvent) => {
        const config = await readConfig(ctx);
        if (!config) {
          ctx.logger.debug("ntfy-notifier: ntfyTopic not configured, skipping event", { eventType: event.eventType });
          return;
        }
        try {
          await handler(ctx, config, event);
        } catch (err) {
          ctx.logger.error("ntfy-notifier: handler threw", {
            eventType: event.eventType,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      };
    }

    ctx.events.on("agent.run.started", await wrapped(handleRunStarted));
    ctx.events.on("agent.run.finished", await wrapped(handleRunFinished));
    ctx.events.on("agent.run.failed", await wrapped(handleRunFailed));
    ctx.events.on("issue.updated", await wrapped(handleIssueStatusChanged));
  },

  async onHealth() {
    return {
      status: "ok",
      message: lastPublishError ?? "ready",
      lastPublishAt,
    };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);
