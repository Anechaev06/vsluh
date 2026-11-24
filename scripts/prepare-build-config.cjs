#!/usr/bin/env node
/**
 * Generates resources/build-config.env for packaging.
 *
 * The repository-root .env can contain user API keys and other secrets; it
 * must never be shipped. Only non-secret build-time values (public OAuth
 * client IDs) are copied into the filtered file that electron-builder packs
 * as an extra resource. If no root .env exists, an empty file is written so
 * local builds keep working.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const sourcePath = path.join(root, ".env");
const destPath = path.join(root, "resources", "build-config.env");

// Public identifiers only. Anything holding a credential (keys, tokens,
// secrets) is deliberately not in this pattern.
const ALLOWED_KEY = /^[A-Z0-9_]+_CLIENT_ID$|^GITHUB_APP_SLUG$/;

const lines = [];
if (fs.existsSync(sourcePath)) {
  for (const raw of fs.readFileSync(sourcePath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!ALLOWED_KEY.test(key)) continue;
    const value = line.slice(eq + 1).trim();
    if (!value) continue;
    lines.push(`${key}=${value}`);
  }
}

fs.mkdirSync(path.dirname(destPath), { recursive: true });
fs.writeFileSync(destPath, lines.join("\n") + (lines.length ? "\n" : ""));
console.log(`[build-config] wrote ${lines.length} key(s) to resources/build-config.env`);
