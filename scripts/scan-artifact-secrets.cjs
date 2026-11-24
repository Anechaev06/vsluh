#!/usr/bin/env node
/**
 * Fails the build if any of the provided secret values is present in the
 * packaged artifacts under dist/. Intended as a CI gate: release workflows
 * pass the real secret values via ARTIFACT_SECRET_VALUES (JSON array) and this
 * script greps every artifact byte-for-byte. Secret values are never printed.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const distDir = path.join(root, "dist");
const raw = process.env.ARTIFACT_SECRET_VALUES;

if (!raw) {
  console.log("[secret-scan] ARTIFACT_SECRET_VALUES not set, skipping");
  process.exit(0);
}

let values;
try {
  values = JSON.parse(raw).filter((v) => typeof v === "string" && v.length >= 8);
} catch {
  console.error("[secret-scan] ARTIFACT_SECRET_VALUES must be a JSON array of strings");
  process.exit(2);
}

if (!values.length) {
  console.log("[secret-scan] no secret values to check, skipping");
  process.exit(0);
}

if (!fs.existsSync(distDir)) {
  console.error(`[secret-scan] dist directory not found: ${distDir}`);
  process.exit(2);
}

const hits = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (entry.name.endsWith(".blockmap")) continue;
    let content;
    try {
      content = fs.readFileSync(full);
    } catch {
      continue;
    }
    if (values.some((v) => content.includes(v))) {
      hits.push(path.relative(root, full));
    }
  }
})(distDir);

if (hits.length) {
  console.error(`[secret-scan] FAIL: secret value found in ${hits.length} artifact(s):`);
  for (const hit of hits) console.error(`  - ${hit}`);
  process.exit(1);
}

console.log(`[secret-scan] OK: none of the ${values.length} secret value(s) present in dist/`);
