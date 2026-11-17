const audience = "https://api.anthropic.com";

async function readIdentityJson(
  request: () => Promise<Response>,
  service: string,
): Promise<unknown> {
  const response = await request().catch(() => {
    throw new Error(`Could not contact ${service}.`);
  });
  if (!response.ok || !response.body) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`${service} returned HTTP ${response.status}.`);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 16_384)
        throw new Error(`${service} returned an oversized response.`);
      chunks.push(value);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new Error(`${service} returned invalid JSON.`);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function setting(env: NodeJS.ProcessEnv, name: string, pattern: RegExp) {
  const value = env[name];
  if (!value || value.length > 128 || !pattern.test(value))
    throw new Error(
      `Set a valid ${name} repository variable for Anthropic federation.`,
    );
  return value;
}

export function createAnthropicFederatedAuth(
  env: NodeJS.ProcessEnv,
  transport = fetch,
) {
  let cached: { token: string; expiresAt: number } | undefined;
  return async (): Promise<Record<string, string>> => {
    if (cached && cached.expiresAt > Date.now() + 35_000)
      return { Authorization: `Bearer ${cached.token}` };

    const runnerUrl = env.ACTIONS_ID_TOKEN_REQUEST_URL;
    const runnerToken = env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
    if (!runnerUrl || !runnerToken)
      throw new Error(
        "GitHub OIDC is unavailable. The job requires id-token: write.",
      );
    const url = URL.parse(runnerUrl);
    if (!url) throw new Error("Invalid GitHub OIDC endpoint.");
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".actions.githubusercontent.com") ||
      url.port ||
      url.username ||
      url.password
    )
      throw new Error("Invalid GitHub OIDC endpoint.");
    url.searchParams.set("audience", audience);

    const federation_rule_id = setting(
      env,
      "ANTHROPIC_FEDERATION_RULE_ID",
      /^fdrl_[a-z0-9]+$/iu,
    );
    const organization_id = setting(
      env,
      "ANTHROPIC_ORGANIZATION_ID",
      /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu,
    );
    const service_account_id = setting(
      env,
      "ANTHROPIC_SERVICE_ACCOUNT_ID",
      /^svac_[a-z0-9]+$/iu,
    );
    const workspace_id = setting(
      env,
      "ANTHROPIC_WORKSPACE_ID",
      /^wrkspc_[a-z0-9]+$/iu,
    );

    const identity = await readIdentityJson(
      () =>
        transport(url, {
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
          headers: { Authorization: `Bearer ${runnerToken}` },
        }),
      "GitHub OIDC",
    );
    if (
      !identity ||
      typeof identity !== "object" ||
      !("value" in identity) ||
      typeof identity.value !== "string" ||
      !/^[\w-]+\.[\w-]+\.[\w-]+$/u.test(identity.value)
    )
      throw new Error("GitHub OIDC did not return a JWT.");

    const requestedAt = Date.now();
    const token = await readIdentityJson(
      () =>
        transport(`${audience}/v1/oauth/token`, {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: identity.value,
            federation_rule_id,
            organization_id,
            service_account_id,
            workspace_id,
          }),
        }),
      "Anthropic federation",
    );
    if (
      !token ||
      typeof token !== "object" ||
      !("token_type" in token) ||
      token.token_type !== "Bearer" ||
      !("access_token" in token) ||
      typeof token.access_token !== "string" ||
      !/^sk-ant-oat01-[a-z0-9_-]+$/iu.test(token.access_token) ||
      !("expires_in" in token) ||
      typeof token.expires_in !== "number" ||
      !Number.isSafeInteger(token.expires_in) ||
      token.expires_in < 1
    )
      throw new Error("Anthropic federation returned an invalid access token.");
    cached = {
      token: token.access_token,
      expiresAt: requestedAt + token.expires_in * 1000,
    };
    return { Authorization: `Bearer ${cached.token}` };
  };
}
