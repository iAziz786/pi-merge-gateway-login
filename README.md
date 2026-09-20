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

| pi model ID | Model | Vendor the gateway picks today |
|---|---|---|
| `merge-gateway/zai/glm-5.3-flash` | GLM 5.3 Flash | Particle |
| `merge-gateway/deepseek/deepseek-v4-flash` | DeepSeek V4 Flash (retired id, resolved to V4.1) | DeepSeek |
| `merge-gateway/deepseek/deepseek-v4-flash-0731` | DeepSeek V4 Flash 0731 | Particle, falls over to Makora |
| `merge-gateway/deepseek/deepseek-v4.1-flash` | DeepSeek V4.1 Flash | DeepSeek |

Pick via `/model` in pi. Requests are **not pinned to a vendor**: the gateway picks. That
is deliberate — pi and omp generate session titles, compaction summaries, and handoff
documents through side requests that never run extension hooks, so a model ID the
gateway does not recognize, or a field only the hook could add, would break them (the
vendor-prefixed IDs this extension used to register failed exactly there: `404 Model
'fireworks/deepseek-v4.1-flash' is not supported`, after which compaction fell through
to its largest-context fallback model and died on that model's output cap).

That is also why there is one entry per gateway model rather than one per vendor: pi
keys models by ID alone, so a per-vendor entry would need an invented ID that the
gateway rejects on those unhooked side requests. Vendor selection belongs to the
gateway — set the organization's vendor policy or send `vendor` in the request body —
and the vendor list below records what each one costs.

All models support:

- **Reasoning:** DeepSeek models take the full `none` … `max` ladder; GLM takes `low` / `high` / `max` (pi's other levels fold into those)
- **Prompt caching:** automatic. The extension forwards the pi session ID as the body `prompt_cache_key` (the gateway ignores the `X-Session-Id` header on this surface), which keeps a session on the vendor whose prompt cache is warm and namespaces the provider cache key. Existing keys are preserved.

## Pricing

pi prices every turn from the model's cost card, and the card names the vendor the
gateway prefers for that model. The gateway routes each request to the **cheapest
eligible vendor** and fails over to the next when that vendor cannot take the request,
so the card is the common case, not a hard guarantee.

| Model | Vendor the card prices | Input | Output | Cache read |
|---|---|---|---|---|
| `zai/glm-5.3-flash` | Particle | $0.015 | $0.05 | $0.003 |
| `deepseek/deepseek-v4-flash` | DeepSeek | $0.15 | $0.60 | $0.003 |
| `deepseek/deepseek-v4-flash-0731` | Particle | $0.035 | $0.07 | $0.007 |
| `deepseek/deepseek-v4.1-flash` | DeepSeek | $0.15 | $0.60 | $0.003 |

Rates are per million tokens and were verified against the gateway's own `usage.cost`
on live probes — cold and cache-hit turns matched to nine decimals. Cache write is not
billed on any of these routes.

Every vendor the gateway may choose instead, from `GET /v1/models`:

| Model | Eligible vendors (input / output / cache read per M) |
|---|---|
| `zai/glm-5.3-flash` | Particle 0.015/0.05/0.003 · z.ai 0.015/0.05/0.003 · Baseten, Fireworks, Together AI, Wafer 0.15/0.50/0.03 · Modal 0.45/1.50/0.09 |
| `deepseek/deepseek-v4-flash` | resolved to V4.1 Flash (below) before routing; the two vendors listed on the retired id itself (Particle 0.035/0.07/0.007, Empiriolabs 0.14/0.28) do not bill |
| `deepseek/deepseek-v4-flash-0731` | Particle 0.035/0.07/0.007 · Makora 0.09/0.195/0.0196 · Baseten 0.13/0.26/0.028 · Together AI 0.14/0.28/0.03 · Empiriolabs 0.14/0.28 |
| `deepseek/deepseek-v4.1-flash` | DeepSeek 0.15/0.60/0.003 · Particle 0.20/0.80/0.03 · Fireworks 0.22/0.66/0.007 · Baseten 0.30/1.20/0.03 |

Vendors without zero data retention, per the same payload: z.ai and Wafer on GLM 5.3
Flash, Empiriolabs on V4 Flash 0731, DeepSeek on the V4.1 family — every other vendor
lists `zero_data_retention: true`.

Two gaps between that table and what pi displays:

- **Failover.** pi prices from one flat card per model and never reads `usage.cost`, so
  a turn served by a pricier vendor displays low — 1.3x on the V4.1 family, 2.6x on V4
  Flash 0731, 10x on GLM.
- **DeepSeek's peak windows.** Its price sheet lists the base rates above plus a
  `schedule` doubling them (0.30/1.20/cache 0.006) on weekdays 01:00–04:00 and
  06:00–10:00 UTC. pi's model configs — both the extension model shape and `models.yml`
  overrides — accept four flat rates with no schedule, so a peak-hour turn displays half
  of what is billed.

For the real charge, read the response: the body carries `usage.cost` (USD for that
request) and the headers carry `x-merge-vendor` (the vendor that served it). To force a
vendor, send `vendor` in the request body or set the organization's vendor policy in the
gateway dashboard.

## Routing and zero data retention

The gateway picks the vendor per request, preferring the cheapest eligible one — today
GLM 5.3 Flash and V4 Flash 0731 route to Particle, the two V4.1-family entries to
DeepSeek's own API. Without a vendor pin there is no per-session control over *where* a
request runs, and the default route for the V4.1 family is a vendor without zero data
retention (see the vendor list above for which vendors support it). Use the
organization's routing policy or vendor allow/deny lists in the gateway dashboard when
a workload must stay on ZDR-capable infrastructure.

Also note the retired `deepseek/deepseek-v4-flash` id: the gateway resolves it to V4.1
Flash, so the response comes back as V4.1 Flash (`x-merge-model:
deepseek/deepseek-v4.1-flash`) at V4.1 rates. Pick `deepseek/deepseek-v4-flash-0731` to
stay on the July snapshot.

## Jev (TypeSafe) judgments in omp

omp ships a TypeSafe judge it uses for thinking-level detection, Smart unexpected-stop
detection, git AI staging, and the `judge()` helper in eval cells. The gateway serves the
same System One contract, but at `/v1/decisions` under the model `typesafe/jev-1.13`
while the client posts to `/v1/systemone` and defaults to `jev-latest`, so
`tools/jev-bridge.ts` adapts path and model id:

```bash
MERGE_GATEWAY_API_KEY=… bun tools/jev-bridge.ts   # keep it running (loopback only)
```

```bash
# ~/.omp/agent/.env — omp loads this into $env at startup
TYPESAFE_BASE_URL=http://127.0.0.1:8787
TYPESAFE_API_KEY=<the same gateway key>
TYPESAFE_DEFAULT_MODEL=typesafe/jev-1.13
```

With the env key present, `AuthStorage.hasAuth("typesafe")` is satisfied, so the default
`providers.judgmentProvider: auto` sends those judgments to Jev through the gateway
instead of the `tiny`/`smol` chat fallback. Jev is not a chat model — it never appears in
`/model`, and chat side requests (titles, compaction) are unaffected. Billing is
$0.042/M input tokens with output free; omp's ledger shows $0 for these calls because the
judgment usage mapper reads token counts, not the gateway's `usage.cost`.

The bridge is repo-local tooling; the npm tarball ships `dist`, `README.md` and
`LICENSE` only.

## Endpoint

```
POST https://api-gateway.merge.dev/v1/openai/responses
Authorization: Bearer <MERGE_GATEWAY_API_KEY>
```

## Test

```bash
bun test
```
