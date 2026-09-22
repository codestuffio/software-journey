import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import test from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

test("compiled CLI reports its limits and rejects unavailable commands", () => {
  for (const args of [[], ["--help"]]) {
    const result = spawnSync(
      process.execPath,
      ["apps/cli/dist/index.js", ...args],
      {
        cwd: root,
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(
      result.stdout,
      /analyze --repository <path> --output <directory>/,
    );
  }
  const result = spawnSync(
    process.execPath,
    ["apps/cli/dist/index.js", "unknown"],
    {
      cwd: root,
      encoding: "utf8",
    },
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown command/);
});

test("production web server renders the shell and serves its assets", {
  timeout: 30000,
}, async (t) => {
  const server = spawn(process.execPath, [".output/server/index.mjs"], {
    cwd: new URL("../apps/web/", import.meta.url),
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: "0",
      NODE_ENV: "production",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  server.stdout.on("data", (chunk) => {
    output += chunk;
  });
  server.stderr.on("data", (chunk) => {
    output += chunk;
  });
  t.after(async () => {
    if (server.exitCode === null && server.signalCode === null) {
      const exited = once(server, "exit");
      server.kill("SIGTERM");
      const force = setTimeout(() => server.kill("SIGKILL"), 2000);
      await exited;
      clearTimeout(force);
    }
  });
  let address;
  for (let attempt = 0; attempt < 100; attempt++) {
    address = output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
    if (address) break;
    assert.equal(server.exitCode, null, output);
    await delay(100);
  }
  assert.ok(address, `Server did not become ready: ${output}`);
  const response = await fetch(address);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Software Journey/);
  assert.match(html, /Local committed-HEAD analysis is ready from the CLI/);
  const assets = [...html.matchAll(/(?:href|src)="([^" ]+\.(?:css|js))"/g)].map(
    (match) => match[1],
  );
  assert.ok(assets.length > 0, "SSR page must reference client assets");
  for (const asset of assets) {
    const result = await fetch(new URL(asset, address));
    assert.equal(result.status, 200, asset);
    assert.doesNotMatch(
      result.headers.get("content-type") ?? "",
      /text\/html/,
      asset,
    );
  }
  const missing = await fetch(new URL("/does-not-exist", address));
  assert.equal(missing.status, 404);
});
