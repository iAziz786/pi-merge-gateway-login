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

Four model IDs, one per gateway model, using the gateway's own model IDs:

| pi model ID | Model | Host the gateway picks today |
|---|---|---|
| `merge-gateway/zai/glm-5.3-flash` | GLM 5.3 Flash | Particle |
| `merge-gateway/deepseek/deepseek-v4-flash` | DeepSeek V4 Flash | DeepSeek (V4.1 weights) |
| `merge-gateway/deepseek/deepseek-v4-flash-0731` | DeepSeek V4 Flash 0731 | Particle |
| `merge-gateway/deepseek/deepseek-v4.1-flash` | DeepSeek V4.1 Flash | DeepSeek |

Pick via `/model` in pi. Requests are **not pinned to a host**: the gateway picks. That
is deliberate — pi and omp generate session titles, compaction summaries, and handoff
documents through side requests that never run extension hooks, so a model ID the
gateway does not recognize, or a field only the hook could add, would break them (the
vendor-prefixed IDs this extension used to register failed exactly there: `404 Model
'fireworks/deepseek-v4.1-flash' is not supported`, after which compaction fell through
to its largest-context fallback model and died on that model's output cap).

All models support:

- **Reasoning:** DeepSeek models take the full `none` … `max` ladder; GLM takes `low` / `high` / `max` (pi's other levels fold into those)
- **Prompt caching:** automatic. The extension forwards the pi session ID as the body `prompt_cache_key` (the gateway ignores the `X-Session-Id` header on this surface), which keeps a session on the host whose prompt cache is warm and namespaces the provider cache key. Existing keys are preserved.

## Pricing

Requests are unpinned, so pi displays the rates of the host the gateway routes each
model to today. Those rates come from the [model catalog](https://docs.merge.dev/merge-gateway/models)
and were verified against the gateway's own `usage.cost` on live probes (Fireworks,
Particle) — they matched to the cent.

| Model | Host today | Input | Output | Cache read |
|---|---|---|---|---|
| `zai/glm-5.3-flash` | Particle | $0.015 | $0.05 | $0.003 |
| `deepseek/deepseek-v4-flash` | Fireworks AI | $0.22 | $0.66 | $0.007 |
| `deepseek/deepseek-v4-flash-0731` | Particle | $0.035 | $0.07 | $0.007 |
| `deepseek/deepseek-v4.1-flash` | Fireworks AI | $0.22 | $0.66 | $0.007 |

Cache write is not billed on any of these routes.

The gateway picks the host per request, so the display is only as exact as that
choice is stable — routing for these models has already moved between hosts in a
single working session. How far the bill can get from the table:

- **V4.1 Flash / V4 Flash** span DeepSeek ($0.15 / $0.60 / cache $0.003; 2× on
  weekday peak hours 01:00–04:00 and 06:00–10:00 UTC, weekends never peak), Particle
  ($0.20 / $0.80 while its promo runs, $0.30 / $1.20 after) and Baseten ($0.30 /
  $1.20) — up to 2× either direction.
- **Cache reads** are where sessions actually spend: the rate differs per host
  ($0.003/M DeepSeek vs $0.007–0.03/M elsewhere) and caching is provider-side
  best-effort — repeated identical prefixes were billed at full input rate on some
  routes.

To reconcile the real charge, read the response: the body carries `usage.cost` (USD
for that request) and the headers carry `x-merge-vendor` (the host that served it).
pi itself does not read `usage.cost` — its display is computed from the table above —
so use the gateway dashboard when a number has to be exact.

## Routing and zero data retention

The gateway picks the host per request (this account routes to the cheapest listed
host today). Without a host pin there is no per-session control over *where* a request
runs, so ZDR cannot be enforced from the model picker — use the organization's routing
policy or vendor allow/deny lists in the gateway dashboard. Both the Particle and
Fireworks hosts support ZDR; the DeepSeek host does not, and the two DeepSeek models
above currently route there.

## Endpoint

```
POST https://api-gateway.merge.dev/v1/openai/responses
Authorization: Bearer <MERGE_GATEWAY_API_KEY>
```

## Test

```bash
bun test
```
