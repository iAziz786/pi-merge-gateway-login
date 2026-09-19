# pi-merge-gateway-login

[pi](https://github.com/earendil-works/pi-mono) extension that adds the [Merge Dev gateway](https://docs.merge.dev/merge-gateway/) as a model provider through its [OpenAI Responses API](https://docs.merge.dev/merge-gateway/).

## Install

```bash
pi install npm:@iaziz786/pi-merge-gateway-login
# or from git:
pi install git:github.com/iAziz786/pi-merge-gateway-login
```

Then authenticate (prompts for your key, stores it in `~/.pi/agent/auth.json`):

```
/login merge-gateway
```

Permissions: outbound HTTPS to `api-gateway.merge.dev` only. No filesystem or subprocess access. Key stored by pi in `~/.pi/agent/auth.json`.

## Models

Seven model IDs across four gateway models — the vendor field selects the execution host:

| pi model ID | Gateway model | Vendor | Notes |
|---|---|---|---|
| `merge-gateway/zai/glm-5.3-flash` | `zai/glm-5.3-flash` | Z.AI | More stable, no ZDR |
| `merge-gateway/particle/glm-5.3-flash` | `zai/glm-5.3-flash` | Particle | Less reliable, supports ZDR |
| `merge-gateway/deepseek/deepseek-v4-flash` | `deepseek/deepseek-v4-flash` | DeepSeek | No ZDR, 2× peak-hour billing (see below) |
| `merge-gateway/particle/deepseek-v4-flash` | `deepseek/deepseek-v4-flash` | Particle | Flat pricing, supports ZDR |
| `merge-gateway/particle/deepseek-v4-flash-0731` | `deepseek/deepseek-v4-flash-0731` | Particle | July 31 snapshot, cheapest DeepSeek route |
| `merge-gateway/particle/deepseek-v4.1-flash` | `deepseek/deepseek-v4.1-flash` | Particle | 33% promo until Nov 1, 2026 |
| `merge-gateway/fireworks/deepseek-v4.1-flash` | `deepseek/deepseek-v4.1-flash` | Fireworks AI | Flat pricing, supports ZDR |

Pick via `/model` in pi. All models support:

- **Reasoning:** DeepSeek routes take the full `none` … `max` ladder; GLM takes `low` / `high` / `max` (pi's other levels fold into those)
- **Prompt caching:** automatic (Z.AI and DeepSeek are automatic-cache routes). Gateway ignores `X-Session-Id` header, respects body `prompt_cache_key`. Extension injects pi session ID as `prompt_cache_key` for the Particle and Fireworks routes; existing keys preserved.

### GLM 5.3 Flash

Context 1M, max output 131K, text + image input.

Per-1M-token USD costs from the [model details page](https://docs.merge.dev/merge-gateway/models/details/zai-glm-5-3-flash):

| | Input | Output | Cache read | Cache write |
|---|---|---|---|---|
| GLM 5.3 Flash | $0.015 | $0.05 | $0.003 | $0 |

### DeepSeek V4 Flash

Context 1M, max output 384K, text-only input. The floating id now resolves to V4.1 Flash
weights on Particle, so pick `deepseek-v4-flash-0731` when you want the July 31 snapshot.

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

### DeepSeek V4 Flash 0731

Context 1M, max output 384K, text-only input. The July 31 snapshot of V4 Flash; Particle
serves it at the same flat rates as the floating `deepseek/deepseek-v4-flash` id, from the
[model details page](https://docs.merge.dev/merge-gateway/models/details/deepseek-deepseek-v4-flash-0731):

| | Input | Output | Cache read |
|---|---|---|---|
| Particle | $0.035 | $0.07 | $0.007 |

### DeepSeek V4.1 Flash

Context 1M, max output 384K, text + image input. Both hosts support ZDR. Per-1M-token USD
costs from the [model details page](https://docs.merge.dev/merge-gateway/models/details/deepseek-deepseek-v4-1-flash):

| Vendor | Input | Output | Cache read |
|---|---|---|---|
| Particle | $0.20 | $0.80 | $0.03 |
| Fireworks AI | $0.22 | $0.66 | $0.007 |

> **Promo note:** Particle's $0.20/$0.80 is 33% off its $0.30/$1.20 list price until
> Nov 1, 2026. pi keeps showing the discounted rate past that date, so treat the
> Particle cost as a lower bound once the promo ends.

## How routing works

The gateway can route a single model to any host. This extension sets the `vendor`
field at request time (see `routing.ts`) to pin the host, so pi's cost display
matches the actual billing. Vendor-prefixed model IDs (`particle/…`, `fireworks/…`)
are rewritten to the real gateway model ID in the request body.

A pinned vendor must also be able to serve the model for your organization — otherwise
the gateway refuses the request (`vendor_restrictions_unavailable` or
`vendor_unavailable`). The response carries `x-merge-vendor` with the host that
actually served it.

## Endpoint

```
POST https://api-gateway.merge.dev/v1/openai/responses
Authorization: Bearer <MERGE_GATEWAY_API_KEY>
```

## Test

```bash
bun test
```
