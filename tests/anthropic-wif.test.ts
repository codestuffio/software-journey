import { expect, test, vi } from "vitest";
import { createAnthropicFederatedAuth } from "../apps/cli/src/anthropic-wif.ts";

const env = {
  ACTIONS_ID_TOKEN_REQUEST_URL:
    "https://pipelines.actions.githubusercontent.com/oidc?api-version=2",
  ACTIONS_ID_TOKEN_REQUEST_TOKEN: "runner-credential",
  ANTHROPIC_FEDERATION_RULE_ID: "fdrl_fixture",
  ANTHROPIC_ORGANIZATION_ID: "01234567-89ab-cdef-0123-456789abcdef",
  ANTHROPIC_SERVICE_ACCOUNT_ID: "svac_fixture",
  ANTHROPIC_WORKSPACE_ID: "wrkspc_fixture",
};

test("requests the Anthropic audience, exchanges the JWT, and refreshes short-lived credentials", async () => {
  const time = vi.spyOn(Date, "now").mockReturnValue(0);
  const transport = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ value: "one.two.three" }))
    .mockResolvedValueOnce(
      Response.json({
        access_token: "sk-ant-oat01-first",
        token_type: "Bearer",
        expires_in: 60,
      }),
    )
    .mockResolvedValueOnce(Response.json({ value: "four.five.six" }))
    .mockResolvedValueOnce(
      Response.json({
        access_token: "sk-ant-oat01-second",
        token_type: "Bearer",
        expires_in: 60,
      }),
    );
  try {
    const authenticate = createAnthropicFederatedAuth(env, transport);
    expect(transport).not.toHaveBeenCalled();
    await expect(authenticate()).resolves.toEqual({
      Authorization: "Bearer sk-ant-oat01-first",
    });
    expect(transport.mock.calls[0]?.[0].toString()).toBe(
      "https://pipelines.actions.githubusercontent.com/oidc?api-version=2&audience=https%3A%2F%2Fapi.anthropic.com",
    );
    expect(transport.mock.calls[0]?.[1]).toMatchObject({
      redirect: "error",
      headers: { Authorization: "Bearer runner-credential" },
    });
    expect(transport.mock.calls[1]?.[0]).toBe(
      "https://api.anthropic.com/v1/oauth/token",
    );
    expect(JSON.parse(String(transport.mock.calls[1]?.[1]?.body))).toEqual({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: "one.two.three",
      federation_rule_id: env.ANTHROPIC_FEDERATION_RULE_ID,
      organization_id: env.ANTHROPIC_ORGANIZATION_ID,
      service_account_id: env.ANTHROPIC_SERVICE_ACCOUNT_ID,
      workspace_id: env.ANTHROPIC_WORKSPACE_ID,
    });
    await authenticate();
    expect(transport).toHaveBeenCalledTimes(2);
    time.mockReturnValue(30_000);
    await expect(authenticate()).resolves.toEqual({
      Authorization: "Bearer sk-ant-oat01-second",
    });
    expect(transport).toHaveBeenCalledTimes(4);
  } finally {
    time.mockRestore();
  }
});

test("rejects a forged OIDC endpoint and keeps rejected exchange responses out of errors", async () => {
  const transport = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({ value: "one.two.three" }))
    .mockResolvedValueOnce(
      Response.json(
        { error: "credential echoed by upstream" },
        { status: 403 },
      ),
    );
  await expect(
    createAnthropicFederatedAuth(
      {
        ...env,
        ACTIONS_ID_TOKEN_REQUEST_URL:
          "https://actions.githubusercontent.com.untrusted.example/oidc",
      },
      transport,
    )(),
  ).rejects.toThrow("Invalid GitHub OIDC endpoint.");
  expect(transport).not.toHaveBeenCalled();
  await expect(createAnthropicFederatedAuth(env, transport)()).rejects.toThrow(
    /^Anthropic federation returned HTTP 403\.$/,
  );
});
