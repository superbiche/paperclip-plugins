import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const PLUGIN_ID = "superbiche.ntfy-notifier";
const PLUGIN_VERSION = "0.0.0";

const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "ntfy Notifier",
  description:
    "Pushes agent-run and issue-lifecycle events to an ntfy.sh topic so you can stay aware of long-running Paperclip work from your phone or desktop.",
  author: "Superbiche",
  categories: ["connector", "automation"],
  capabilities: ["events.subscribe", "http.outbound"],
  entrypoints: {
    worker: "./dist/worker.js",
  },
  instanceConfigSchema: {
    type: "object",
    required: ["ntfyTopic"],
    properties: {
      ntfyBaseUrl: {
        type: "string",
        title: "ntfy base URL",
        description: "Root URL of the ntfy server. Use https://ntfy.sh for the public hosted service, or a self-hosted URL.",
        default: "https://ntfy.sh",
      },
      ntfyTopic: {
        type: "string",
        title: "ntfy topic",
        description: "Topic name to publish to. Pick something unguessable for public ntfy.sh (it acts as the auth boundary).",
      },
      ntfyToken: {
        type: "string",
        title: "ntfy access token (optional)",
        description: "Bearer token for authenticated ntfy servers. Leave blank for open topics on ntfy.sh.",
      },
      priority: {
        type: "number",
        title: "Default priority",
        description: "ntfy priority for normal events (1-5, default 3). Failure events are pinned to 5.",
        minimum: 1,
        maximum: 5,
        default: 3,
      },
      notifyOnRunStarted: {
        type: "boolean",
        title: "Notify on run start",
        description: "Emit a notification when an agent run begins. Noisy for busy instances; off by default.",
        default: false,
      },
      notifyOnRunFinished: {
        type: "boolean",
        title: "Notify on run finish",
        description: "Emit a notification when an agent run completes successfully.",
        default: true,
      },
      notifyOnRunFailed: {
        type: "boolean",
        title: "Notify on run failure",
        description: "Emit a priority-5 notification when an agent run fails. Recommended on.",
        default: true,
      },
      notifyOnIssueStatusChange: {
        type: "boolean",
        title: "Notify on issue status change",
        description: "Emit a notification whenever an issue transitions between statuses. Off by default to keep the signal-to-noise ratio high.",
        default: false,
      },
    },
  },
};

export default manifest;
