#!/usr/bin/env node
/**
 * Switches the better-sqlite3 native binding between two ABIs:
 *   - "electron": the ABI of the bundled Electron (needed to run/package the app)
 *   - "node":     the ABI of the local Node.js (needed for `npm test`)
 *
 * `electron-builder install-app-deps` (postinstall) builds the Electron ABI,
 * after which `node --test` fails with a NODE_MODULE_VERSION mismatch and
 * vice versa. This script keeps one cached binary per ABI under
 * node_modules/better-sqlite3/.vsluh-abi-cache/ so switching is a file copy
 * and each ABI is compiled at most once per machine.
 *
 * Usage: node scripts/ensure-better-sqlite3-abi.cjs <node|electron>
 */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const runtime = process.argv[2];

if (runtime !== "node" && runtime !== "electron") {
  console.error("usage: node ensure-better-sqlite3-abi.cjs <node|electron>");
  process.exit(2);
}

const moduleDir = path.join(root, "node_modules", "better-sqlite3");
const bindingPath = path.join(moduleDir, "build", "Release", "better_sqlite3.node");
const markerPath = path.join(moduleDir, "build", ".vsluh-abi");
const cacheRoot = path.join(moduleDir, ".vsluh-abi-cache");

function targetAbi() {
  if (runtime === "node") return process.versions.modules;
  const electronVersion = require(
    path.join(root, "node_modules", "electron", "package.json")
  ).version;
  return require("node-abi").getAbi(electronVersion, "electron");
}

function loadableUnderNode() {
  if (!fs.existsSync(bindingPath)) return false;
  const req = require("node:module").createRequire(path.join(moduleDir, "probe.js"));
  try {
    req(bindingPath);
    return true;
  } catch {
    return false;
  }
}

function stash(identity) {
  if (!fs.existsSync(bindingPath)) return;
  const dir = path.join(cacheRoot, identity);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(bindingPath, path.join(dir, "better_sqlite3.node"));
}

function useCached(identity) {
  const cached = path.join(cacheRoot, identity, "better_sqlite3.node");
  if (!fs.existsSync(cached)) return false;
  fs.mkdirSync(path.dirname(bindingPath), { recursive: true });
  fs.copyFileSync(cached, bindingPath);
  fs.writeFileSync(markerPath, `${runtime}:${abi}`);
  return true;
}

function rebuild(electronVersion) {
  const args = [require.resolve("node-gyp/bin/node-gyp.js"), "rebuild"];
  if (electronVersion) {
    args.push(`--target=${electronVersion}`, `--dist-url=https://electronjs.org/headers`);
  }
  const result = spawnSync(process.execPath, args, {
    cwd: moduleDir,
    stdio: "inherit",
    env: { ...process.env, npm_config_build_from_source: "true" },
  });
  if (result.status !== 0) {
    console.error(`[better-sqlite3] node-gyp rebuild failed (exit ${result.status})`);
    process.exit(1);
  }
}

const abi = String(targetAbi());
const identity = `${runtime}-${abi}`;
const marker = fs.existsSync(markerPath) ? fs.readFileSync(markerPath, "utf8").trim() : "";

if (marker === `${runtime}:${abi}`) process.exit(0);

// Preserve the current binary under its real identity before overwriting it.
const nodeLoadable = loadableUnderNode();
if (fs.existsSync(bindingPath)) {
  if (nodeLoadable) {
    stash(`node-${process.versions.modules}`);
  } else if (marker.startsWith("electron:")) {
    stash(`electron-${marker.split(":")[1]}`);
  } else {
    // Not loadable under Node and no marker: this is what
    // `electron-builder install-app-deps` produces on a fresh install.
    stash("electron-unknown");
  }
}

if (!useCached(identity)) {
  console.log(`[better-sqlite3] building ${runtime} ABI ${abi}...`);
  rebuild(
    runtime === "electron"
      ? require(path.join(root, "node_modules", "electron", "package.json")).version
      : null
  );
  if (!fs.existsSync(bindingPath)) {
    console.error("[better-sqlite3] rebuild finished without producing better_sqlite3.node");
    process.exit(1);
  }
  stash(identity);
  fs.writeFileSync(markerPath, `${runtime}:${abi}`);
}

console.log(`[better-sqlite3] active binding: ${runtime} ABI ${abi}`);
