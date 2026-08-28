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

Four model IDs across two gateway models — the vendor field selects the execution host:

| pi model ID | Gateway model | Vendor | Notes |
|---|---|---|---|
| `mergedev/zai/glm-5.3-flash` | `zai/glm-5.3-flash` | Z.AI | More stable, no ZDR |
| `mergedev/particle/glm-5.3-flash` | `zai/glm-5.3-flash` | Particle | Less reliable, supports ZDR |
| `mergedev/deepseek/deepseek-v4-flash` | `deepseek/deepseek-v4-flash` | DeepSeek | No ZDR, 2× peak-hour billing (see below) |
| `mergedev/particle/deepseek-v4-flash` | `deepseek/deepseek-v4-flash` | Particle | Flat pricing, supports ZDR |

Pick via `/model` in pi. All models support:

- **Reasoning:** effort levels `low` / `high` / `max` (plus intermediate pi levels, folded per vendor)
- **Prompt caching:** automatic via `X-Session-Id` header (Z.AI and DeepSeek are automatic-cache routes)

### GLM 5.3 Flash

Context 1M, max output 131K, text + image input.

Per-1M-token USD costs from the [model details page](https://docs.merge.dev/merge-gateway/models/details/zai-glm-5-3-flash):

| | Input | Output | Cache read | Cache write |
|---|---|---|---|---|
| GLM 5.3 Flash | $0.015 | $0.05 | $0.003 | $0 |

### DeepSeek V4 Flash

Context 1M, max output 384K, text-only input.

Per-1M-token USD costs from the [model details page](https://docs.merge.dev/merge-gateway/models/details/deepseek-deepseek-v4-flash):

| Vendor | Input | Output | Cache read |
|---|---|---|---|
| DeepSeek (official) | $0.22 | $0.66 | $0.007 |
| Particle | $0.035 | $0.07 | $0.007 |

> **Peak-hour note:** the official DeepSeek host bills **2× baseline** during peak
> hours (01:00–04:00 and 06:00–10:00 UTC). **Weekends are never peak.** pi shows
> the off-peak baseline, so for `deepseek/deepseek-v4-flash` the displayed cost is
> a lower bound during weekday peaks. Particle is flat and supports ZDR — prefer
> it unless you specifically need the official host.

## How routing works

The gateway can route a single model to any host. This extension sets the `vendor`
field at request time (see `routing.ts`) to pin the host, so pi's cost display
matches the actual billing. Vendor-prefixed model IDs (`particle/…`) are rewritten
to the real gateway model ID in the request body.

## Endpoint

```
POST https://api-gateway.merge.dev/v1/openai/responses
Authorization: Bearer <MERGE_GATEWAY_API_KEY>
```

## Test

```bash
bun test
```
