/**
 * Cloudflare Worker port of `tools/jev-bridge.ts`.
 *
 * omp's TypeSafe client posts the System One contract to
 * `{TYPESAFE_BASE_URL}/v1/systemone`; the Merge Dev gateway serves the same
 * contract at `/v1/decisions` under the model id `typesafe/jev-1.13` (its
 * System One default `jev-latest` 404s). This Worker adapts path and model id,
 * so `TYPESAFE_BASE_URL` can point here from anywhere — no local process to
 * keep alive, and `/v1/models` answers the TypeSafe envelope so credential
 * validation keeps working.
 *
 * Keys, in order of preference:
 *   1. Nothing configured — callers present their own gateway key as the bearer
 *      token and this Worker forwards it. Nothing secret lives in Cloudflare.
 *   2. `MERGE_GATEWAY_API_KEY` secret — callers need no gateway key; their
 *      bearer token is ignored for upstream auth. Set `BRIDGE_TOKEN` alongside
 *      it, or anyone who learns the URL can spend the account's credits.
 *   3. `BRIDGE_TOKEN` secret — when set, callers must present exactly that
 *      token. Without `MERGE_GATEWAY_API_KEY` the token would be forwarded
 *      upstream, which the gateway rejects, so both are required together.
 */

interface Env {
  /** Upstream key used when configured; otherwise the caller's token is forwarded. */
  MERGE_GATEWAY_API_KEY?: string;
  /** When set, callers must present it as their bearer token. */
  BRIDGE_TOKEN?: string;
  /** Overrides the gateway model id sent upstream. */
  JEV_MODEL?: string;
}

/** One question as sent; `choice.criteria` may hold `null`, which the gateway rejects. */
interface Question {
  type?: string;
  criteria?: Record<string, string | null>;
}

/** Wire shape the client posts; `state`/`questions` pass through untouched. */
interface SystemOneRequest {
  state: unknown;
  questions?: Record<string, Question>;
  model?: string;
}

const GATEWAY_URL = "https://api-gateway.merge.dev/v1/decisions";
const DEFAULT_MODEL = "typesafe/jev-1.13";

/**
 * The gateway validates `choice.criteria` as `dict[str, str]` and rejects
 * `null`, which the client's own types permit. An empty description carries the
 * same meaning there — the option name is the description — so map it across.
 */
function normalizeChoices(request: SystemOneRequest): SystemOneRequest {
  const questions = request.questions;
  if (questions === undefined) return request;
  for (const id of Object.keys(questions)) {
    const question = questions[id];
    if (question.type !== "choice" || question.criteria === undefined) continue;
    for (const label of Object.keys(question.criteria)) {
      if (question.criteria[label] === null) question.criteria[label] = "";
    }
  }
  return request;
}

function bearer(header: string | null): string | undefined {
  const match = header === null ? null : /^Bearer\s+(.+)$/i.exec(header.trim());
  return match === null ? undefined : match[1];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    const presented = bearer(request.headers.get("authorization"));
    const bridgeToken = env.BRIDGE_TOKEN?.trim();
    const tokenRequired = bridgeToken !== undefined && bridgeToken.length > 0;

    if (tokenRequired && presented !== bridgeToken) {
      return json({ error: "unauthorized" }, 401);
    }

    // The client's `GET /v1/models` probe expects TypeSafe's envelope; the
    // gateway lists its catalog in another shape, so answer it locally.
    if (request.method === "GET" && pathname === "/v1/models") {
      return json({
        models: [
          { name: env.JEV_MODEL ?? DEFAULT_MODEL, description: "Jev via the Merge Dev gateway", release_date: "2026-09-15" },
        ],
      });
    }
    if (request.method !== "POST" || pathname !== "/v1/systemone") {
      return new Response("not found\n", { status: 404 });
    }

    let body: SystemOneRequest;
    try {
      body = (await request.json()) as SystemOneRequest;
    } catch {
      return new Response("invalid JSON\n", { status: 400 });
    }

    const upstreamKey = env.MERGE_GATEWAY_API_KEY?.trim() ?? (tokenRequired ? undefined : presented);
    if (upstreamKey === undefined || upstreamKey.length === 0) {
      return json(
        {
          error: tokenRequired
            ? "BRIDGE_TOKEN is set without MERGE_GATEWAY_API_KEY: set the upstream key too, or unset BRIDGE_TOKEN to forward the caller's own key"
            : "no credentials: present a gateway key as the bearer token or set the MERGE_GATEWAY_API_KEY secret",
        },
        401,
      );
    }

    const upstream = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${upstreamKey}` },
      body: JSON.stringify({ ...normalizeChoices(body), model: env.JEV_MODEL ?? DEFAULT_MODEL }),
    });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  },
};
