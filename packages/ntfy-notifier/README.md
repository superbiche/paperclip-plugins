# @superbiche/paperclip-ntfy-notifier

External [Paperclip](https://github.com/paperclipai/paperclip) plugin that subscribes to agent-run and issue-lifecycle events and publishes them to an [ntfy.sh](https://ntfy.sh) topic. Designed for unattended autonomous runs — so you can step away from the UI and still know whether work is starting, finishing, or failing.

## Events subscribed

| Event | Default notification | Priority |
|---|---|---|
| `agent.run.started` | Off | 2 |
| `agent.run.finished` | On | 3 |
| `agent.run.failed` | On | 5 (pinned) |
| `issue.updated` (status transitions only) | Off | 3 |

All four are individually toggleable per instance. Failure priority is pinned at 5 (ntfy "urgent") regardless of the default-priority config.

## Install

```bash
curl -X POST http://127.0.0.1:3100/api/plugins/install \
  -H 'content-type: application/json' \
  -d '{"packageName":"@superbiche/paperclip-ntfy-notifier"}'
```

## Configure

Once installed, set the plugin's instance config (via Paperclip UI → Plugins → ntfy Notifier → Settings, or via the instance-settings API):

| Field | Default | Notes |
|---|---|---|
| `ntfyBaseUrl` | `https://ntfy.sh` | Public ntfy.sh or a self-hosted URL. |
| `ntfyTopic` | *(required)* | Pick something unguessable for public ntfy.sh — the topic is the auth boundary. |
| `ntfyToken` | *(empty)* | Bearer token for authenticated ntfy servers. |
| `priority` | `3` | Default priority (1-5). Failure events override to 5. |
| `notifyOnRunStarted` | `false` | Off by default; flip on for verbose tracking. |
| `notifyOnRunFinished` | `true` | |
| `notifyOnRunFailed` | `true` | |
| `notifyOnIssueStatusChange` | `false` | Off by default; flip on if you want issue-state pings. |

The plugin silently skips event delivery if `ntfyTopic` is empty, so installation without config is safe.

## Subscribe on a device

Public ntfy.sh:

```bash
# CLI
ntfy subscribe <your-topic>

# Phone (iOS / Android)
# install the ntfy app, add your topic
```

Self-hosted: point the app or `ntfy subscribe` at your server's base URL.

## Local development

```bash
git clone https://github.com/superbiche/paperclip-plugins
cd paperclip-plugins
pnpm install
pnpm -C packages/ntfy-notifier build
```

Install into a local Paperclip instance via `isLocalPath`:

```bash
curl -X POST http://127.0.0.1:3100/api/plugins/install \
  -H 'content-type: application/json' \
  -d '{"packageName":"/absolute/path/to/paperclip-plugins/packages/ntfy-notifier","isLocalPath":true}'
```

## Capabilities

Declared in `manifest.ts`:

- `events.subscribe` — receive domain events from paperclip.
- `http.outbound` — POST to the ntfy HTTP endpoint.

## License

MIT
