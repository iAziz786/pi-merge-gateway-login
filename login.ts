/**
 * API-key login flow for the Merge Dev gateway provider.
 *
 * Registered as `oauth.login` so `/login merge-gateway` appears in omp.
 * Returns the validated key as a plain string; the host stores it as an
 * `api_key` credential (source `login`) under the `merge-gateway` id.
 */

const GATEWAY_DASHBOARD_URL = "https://gateway.merge.dev";
const MODELS_URL = "https://api-gateway.merge.dev/v1/openai/models";

export interface LoginCallbacks {
	onAuth?: (info: { url: string; instructions?: string }) => void;
	onPrompt: (prompt: { message: string; placeholder?: string }) => Promise<string>;
	signal?: AbortSignal;
	fetch?: typeof fetch;
}

export async function loginMergeGateway(callbacks: LoginCallbacks): Promise<string> {
	callbacks.onAuth?.({
		url: GATEWAY_DASHBOARD_URL,
		instructions: "Create or copy an organization API key under API keys in the Merge Gateway dashboard.",
	});
	const raw = await callbacks.onPrompt({
		message: "Paste your Merge Gateway API key",
		placeholder: "mg__...",
	});
	if (callbacks.signal?.aborted) throw new Error("Login cancelled");
	const key = raw.trim();
	if (!key) throw new Error("Merge Gateway API key is empty");
	const fetchImpl = callbacks.fetch ?? fetch;
	const response = await fetchImpl(MODELS_URL, {
		headers: { Authorization: `Bearer ${key}` },
		signal: callbacks.signal,
	});
	if (!response.ok) {
		throw new Error(`Merge Gateway API key validation failed (${response.status})`);
	}
	return key;
}
