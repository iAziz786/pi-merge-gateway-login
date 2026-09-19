/**
 * Local bridge: omp's built-in TypeSafe judge → Merge Dev gateway Jev.
 *
 * omp's `TypeSafeJudge` (`@oh-my-pi/pi-ai/src/judgment/typesafe.ts`) POSTs the
 * System One contract to `{TYPESAFE_BASE_URL}/v1/systemone`; the gateway serves
 * the same contract at `/v1/decisions` under the model id `typesafe/jev-1.13`
 * (its System One default `jev-latest` 404s). This process adapts the path.
 *
 *   MERGE_GATEWAY_API_KEY=… bun tools/jev-bridge.ts
 *
 * Then point omp at it through `~/.omp/agent/.env`, which omp loads into `$env`:
 *
 *   TYPESAFE_BASE_URL=http://127.0.0.1:8787
 *   TYPESAFE_API_KEY=<the same gateway key>
 *   TYPESAFE_DEFAULT_MODEL=typesafe/jev-1.13
 *
 * The env key satisfies `AuthStorage.hasAuth("typesafe")`, so the default
 * `providers.judgmentProvider: auto` routes thinking-level detection, Smart
 * unexpected-stop detection, git AI staging and eval `judge()` to Jev instead of
 * the tiny/smol chat fallback. `TYPESAFE_DEFAULT_MODEL` is still rewritten below
 * to the gateway id, so a stale value cannot silently fall back.
 *
 * The same env block backs the `decide` tool in iAziz786/omp-jev-decision,
 * which asks Jev typed questions on demand mid-session.
 *
 * Repo-local tool; the npm tarball ships `dist`/README/LICENSE only.
 */

/** One question as omp sends it; `choice.criteria` may hold `null` ("the name suffices"). */
interface Question {
  type?: string;
  criteria?: Record<string, string | null>;
}

/** Wire shape omp's `TypeSafeJudge` sends; `state`/`questions` pass through untouched. */
interface SystemOneRequest {
  state: unknown;
  questions?: Record<string, Question>;
  model?: string;
}

/**
 * The gateway validates `choice.criteria` as `dict[str, str]` and rejects `null`
 * (422), which omp's own type permits. An empty description carries the same
 * meaning there — the option name is the description — so map it across.
 */
function normalizeChoices(request: SystemOneRequest): SystemOneRequest {
  const questions = request.questions;
  if (questions === undefined) return request;
  for (const id in questions) {
    const question = questions[id];
    if (question.type !== "choice" || question.criteria === undefined) continue;
    for (const label in question.criteria) {
      if (question.criteria[label] === null) question.criteria[label] = "";
    }
  }
  return request;
}

/** Fields this bridge logs from the gateway's answer; the body is forwarded verbatim. */
interface SystemOneResponse {
  usage?: { cost?: number; input_tokens?: number; output_tokens?: number };
}

/** Loopback port (JEV_BRIDGE_PORT). */
const PORT = Number(Bun.env.JEV_BRIDGE_PORT ?? 8787);
/** Gateway System One surface. */
const GATEWAY_URL = "https://api-gateway.merge.dev/v1/decisions";
/** Gateway model id for Jev. */
const MODEL = Bun.env.JEV_MODEL ?? "typesafe/jev-1.13";
const API_KEY = Bun.env.MERGE_GATEWAY_API_KEY ?? Bun.env.TYPESAFE_API_KEY;

if (API_KEY === undefined || API_KEY.length === 0) {
  console.error("jev-bridge: set MERGE_GATEWAY_API_KEY (or TYPESAFE_API_KEY) to the Merge gateway key");
  process.exit(1);
}

/** One log line per call: cost and token counts when the gateway reported them. */
function summarize(text: string): string {
  try {
    const { usage } = JSON.parse(text) as SystemOneResponse;
    if (usage === undefined) return text.slice(0, 200);
    return `cost=$${usage.cost ?? "?"} in=${usage.input_tokens ?? "?"} out=${usage.output_tokens ?? "?"}`;
  } catch {
    return text.slice(0, 200);
  }
}

Bun.serve({
  hostname: "127.0.0.1",
  port: PORT,
  async fetch(request): Promise<Response> {
    const { pathname } = new URL(request.url);
    // omp's credential validation probes `GET /v1/models`; the gateway answers
    // that path with its own catalog shape, so serve the TypeSafe envelope here.
    if (request.method === "GET" && pathname === "/v1/models") {
      return Response.json({
        models: [{ name: MODEL, description: "Jev via the Merge Dev gateway", release_date: "2026-09-15" }],
      });
    }
    if (request.method !== "POST" || pathname !== "/v1/systemone") {
      return new Response("not found\n", { status: 404 });
    }

    // Boundary assert: the caller is omp's TypeSafeJudge, whose shape is fixed.
    // A malformed body is the gateway's to reject, not this pass-through's.
    let body: SystemOneRequest;
    try {
      body = (await request.json()) as SystemOneRequest;
    } catch {
      return new Response("invalid JSON\n", { status: 400 });
    }

    const started = performance.now();
    const upstream = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // omp presents the same gateway key; fall back to this process's own.
        authorization: request.headers.get("authorization") ?? `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ ...normalizeChoices(body), model: MODEL }),
    });
    const text = await upstream.text();
    console.log(`[jev-bridge] ${upstream.status} ${Math.round(performance.now() - started)}ms ${summarize(text)}`);
    return new Response(text, { status: upstream.status, headers: { "content-type": "application/json" } });
  },
});

console.log(`[jev-bridge] http://127.0.0.1:${PORT}/v1/systemone → ${GATEWAY_URL} (${MODEL})`);
