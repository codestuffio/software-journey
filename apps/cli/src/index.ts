#!/usr/bin/env node

const args = process.argv.slice(2);

if (args.length === 0 || (args.length === 1 && args[0] === "--help")) {
  console.log(`Software Journey

Usage: software-journey [--help]

The workspace is ready. Repository analysis is not implemented yet.
Next specification: openspec/changes/analyze-local-repository/
Start the web application from the workspace root with pnpm dev.`);
} else {
  console.error("Unknown command. Run software-journey --help.");
  process.exitCode = 1;
}
