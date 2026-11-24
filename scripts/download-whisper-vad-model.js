#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { downloadFile, parseArgs } = require("./lib/download-utils");

// Pinned to a fixed revision — `resolve/main` would track HEAD and could swap
// the weights under an unchanged URL.
const HF_REVISION = "9ffd54a1e1ee413ddf265af9913beaf518d1639b";
const VAD_MODEL_URL = `https://huggingface.co/ggml-org/whisper-vad/resolve/${HF_REVISION}/ggml-silero-v5.1.2.bin`;
const VAD_MODEL_SHA256 = "29940d98d42b91fbd05ce489f3ecf7c72f0a42f027e4875919a28fb4c04ea2cf";
const VAD_MODEL_FILE = "ggml-silero-v5.1.2.bin";

function getOutputDir() {
  const outputDirIndex = process.argv.indexOf("--output-dir");
  if (outputDirIndex !== -1 && process.argv[outputDirIndex + 1]) {
    return path.resolve(process.argv[outputDirIndex + 1]);
  }
  return path.join(__dirname, "..", "resources", "bin", "whisper-vad");
}

async function main() {
  const args = parseArgs();
  const outputDir = getOutputDir();
  const outputPath = path.join(outputDir, VAD_MODEL_FILE);

  if (fs.existsSync(outputPath) && !args.isForce) {
    console.log(`[whisper-vad-model] ${VAD_MODEL_FILE} already exists`);
    return;
  }

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`[whisper-vad-model] Downloading ${VAD_MODEL_FILE}`);
  try {
    await downloadFile(VAD_MODEL_URL, outputPath);
    const actual = crypto.createHash("sha256").update(fs.readFileSync(outputPath)).digest("hex");
    if (actual !== VAD_MODEL_SHA256) {
      throw new Error(`sha256 mismatch: expected ${VAD_MODEL_SHA256}, got ${actual}`);
    }
    const sizeKb = Math.round(fs.statSync(outputPath).size / 1024);
    console.log(`[whisper-vad-model] Downloaded ${VAD_MODEL_FILE} (${sizeKb}KB, sha256 verified)`);
  } catch (error) {
    console.error(`[whisper-vad-model] Download failed: ${error.message}`);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    process.exitCode = 1;
  }
}

main().catch(console.error);
