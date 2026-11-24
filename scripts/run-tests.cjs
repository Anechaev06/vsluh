#!/usr/bin/env node
/**
 * Runs the test suite against the current Node.js ABI, then restores the
 * Electron ABI build so `npm start` / `electron-builder` keep working.
 *
 * The Electron binding is only restored if it was the active build before
 * the run — on CI (node-only build via `npm rebuild better-sqlite3`) nothing
 * is rebuilt back.
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const ensureScript = path.join(__dirname, "ensure-better-sqlite3-abi.cjs");
const markerPath = path.join(root, "node_modules", "better-sqlite3", "build", ".vsluh-abi");
const bindingPath = path.join(
  root,
  "node_modules",
  "better-sqlite3",
  "build",
  "Release",
  "better_sqlite3.node"
);

function ensure(runtime) {
  const result = spawnSync(process.execPath, [ensureScript, runtime], {
    cwd: root,
    stdio: "inherit",
  });
  return result.status === 0;
}

function loadableUnderNode() {
  if (!fs.existsSync(bindingPath)) return false;
  const req = require("node:module").createRequire(path.join(root, "probe.js"));
  try {
    req(bindingPath);
    return true;
  } catch {
    return false;
  }
}

// An Electron build is worth restoring only if one was actually present.
const marker = fs.existsSync(markerPath) ? fs.readFileSync(markerPath, "utf8").trim() : "";
const hadElectronBuild =
  marker.startsWith("electron:") || (!marker && fs.existsSync(bindingPath) && !loadableUnderNode());

let code = 1;
if (ensure("node")) {
  try {
    const result = spawnSync(process.execPath, ["--import", "tsx", "--test", "test/**/*.test.js"], {
      cwd: root,
      stdio: "inherit",
    });
    code = result.status === null ? 1 : result.status;
  } finally {
    if (hadElectronBuild) ensure("electron");
  }
}

process.exit(code);
