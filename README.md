# pi-mergedev-login

[pi](https://github.com/earendil-works/pi-mono) extension that adds the [Merge Dev gateway](https://docs.merge.dev/merge-gateway/) as a model provider through its [OpenAI Responses API](https://docs.merge.dev/merge-gateway/).

## Install

```bash
pi install git:github.com/iAziz786/pi-mergedev-login
```

Then authenticate (prompts for your key, stores it in `~/.pi/agent/auth.json`):

```
/login mergedev
```

## Models

Two model IDs for the same gateway model — the vendor field selects the execution host:

| pi model ID | Gateway model | Vendor | Notes |
|---|---|---|---|
| `mergedev/zai/glm-5.3-flash` | `zai/glm-5.3-flash` | Z.AI | More stable, no ZDR |
| `mergedev/particle/glm-5.3-flash` | `zai/glm-5.3-flash` | Particle | Less reliable, supports ZDR |

Pick via `/model` in pi. Both share:

- **Context window:** 1M tokens
- **Max output:** 131K tokens
- **Reasoning:** effort levels `low` / `high` / `max`
- **Prompt caching:** automatic via `X-Session-Id` header (Z.AI is an automatic-cache route)

Per-1M-token USD costs from the [model details page](https://docs.merge.dev/merge-gateway/models/details/zai-glm-5-3-flash) (Particle vendor rates):

| | Input | Output | Cache read | Cache write |
|---|---|---|---|---|
| GLM 5.3 Flash | $0.015 | $0.05 | $0.003 | $0 |

## How routing works

The gateway can route a single model to any host (Particle / Z.AI / Baseten). This extension sets the `vendor` field at request time (see `routing.ts`) to pin the host, so pi's cost display matches the actual billing. The `particle/glm-5.3-flash` model ID also rewrites the gateway model ID from `particle/glm-5.3-flash` to `zai/glm-5.3-flash` (since the gateway only knows one model ID).

## Endpoint

```
POST https://api-gateway.merge.dev/v1/openai/responses
Authorization: Bearer <MERGE_GATEWAY_API_KEY>
```

## Test

```bash
bun test
```
