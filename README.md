# pi-mergedev-login

[pi](https://github.com/earendil-works/pi-mono) extension that adds the [Merge Dev gateway](https://docs.merge.dev/merge-gateway/) as a model provider through its [OpenAI Responses API](https://docs.merge.dev/merge-gateway/).

It hosts a single model: **GLM 5.3 Flash** (`zai/glm-5.3-flash`).

## Install

```bash
pi install git:github.com/iAziz786/pi-mergedev-login
```

Then authenticate (prompts for your key, stores it in `~/.pi/agent/auth.json`):

```
/login mergedev
```

## Model

| Model | ID | Context | Max output |
|---|---|---|---|
| GLM 5.3 Flash | `zai/glm-5.3-flash` | 1M | 131K |

Per-1M-token USD costs are baked in from the [model details page](https://docs.merge.dev/merge-gateway/models/details/zai-glm-5-3-flash) for the **Particle** vendor/host (the cheapest of the three: Particle / Z.AI / Baseten):

| | Input | Output | Cache read | Cache write |
|---|---|---|---|---|
| GLM 5.3 Flash | $0.015 | $0.05 | $0.003 | $0 |

The model supports reasoning with effort levels `low` / `high` / `max`.

> **Vendor note:** The Merge Dev gateway can route a request to any host
> (Particle / Z.AI / Baseten); Baseten is ~10× pricier. This extension pins
> `vendor: "particle"` on every request (see `routing.ts`), so the gateway always
> serves Particle and the displayed cost — computed by pi from the baked-in
> Particle rates — is exact. pi does not expose the gateway's response
> `vendor`/`usage.cost` in any hook, so pinning at request time is the reliable way
> to keep cost correct rather than correcting it after the fact.

## Endpoint

Requests go to the Merge Dev gateway Responses endpoint:

```
POST https://api-gateway.merge.dev/v1/responses
Authorization: Bearer <MERGE_GATEWAY_API_KEY>
```

## Test

```bash
bun test
```
