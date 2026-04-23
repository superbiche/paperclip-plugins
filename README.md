# paperclip-plugins

External plugins for [paperclipai/paperclip](https://github.com/paperclipai/paperclip) — ecosystem extensions that subscribe to domain events, register UI surfaces, or bridge to external services.

Sibling to [`@superbiche/paperclip-adapters`](https://github.com/superbiche/paperclip-adapters). Same external-first philosophy: extensions live as third-party npm packages, installed into a Paperclip instance via the plugin system, rather than being upstreamed into the core.

## Packages

| Package | Purpose | Version |
|---|---|---|
| [`@superbiche/paperclip-ntfy-notifier`](./packages/ntfy-notifier) | Subscribe to agent-run + issue lifecycle events; push notifications to [ntfy.sh](https://ntfy.sh) | *(pending first publish)* |

## Installing a plugin into a Paperclip instance

Paperclip's plugin loader accepts npm packages or local paths. Install into a running instance:

```bash
# npm (once the plugin is published)
curl -X POST http://127.0.0.1:3100/api/plugins/install \
  -H 'content-type: application/json' \
  -d '{"packageName":"@superbiche/paperclip-ntfy-notifier"}'

# local path (dev / internal testing)
curl -X POST http://127.0.0.1:3100/api/plugins/install \
  -H 'content-type: application/json' \
  -d '{"packageName":"/absolute/path/to/paperclip-plugins/packages/ntfy-notifier","isLocalPath":true}'
```

Each plugin declares its required capabilities (e.g. `events.subscribe`, `http.outbound`, `ui.sidebar.register`) in its `manifest.ts`. Paperclip's plugin-capability validator enforces that runtime requests stay within the declared set.

## Quickstart (development)

```bash
pnpm install
pnpm build
pnpm test
```

Individual plugin packages live under `packages/*`; each is a self-contained pnpm workspace entry.

## Release process

Automated via [changesets](https://github.com/changesets/changesets) + GitHub Actions + npm [trusted publishers](https://docs.npmjs.com/trusted-publishers) (OIDC, no long-lived tokens). Mirrors the setup in [`paperclip-adapters`](https://github.com/superbiche/paperclip-adapters).

To ship a change:

1. Code change on a branch.
2. `pnpm exec changeset` → select packages, pick bump level, write summary. Generates `.changeset/<slug>.md`.
3. Commit the changeset alongside the code change. Open PR, review, merge to `main`.
4. Release workflow (`.github/workflows/release.yml`) opens a **"chore(release): version packages"** PR.
5. Merge that PR → workflow publishes to npm with provenance attestation.

Each plugin versions independently — a change to the ntfy notifier doesn't bump unrelated packages.

## Contributing

Plugin ideas welcome. Open an issue describing the integration shape before scaffolding a package; we want to keep the catalog focused and avoid duplication with adapter-side functionality. If your use case is specific to an agent CLI wrapper rather than cross-cutting orchestration, it likely belongs in [`paperclip-adapters`](https://github.com/superbiche/paperclip-adapters) instead.

## License

MIT
