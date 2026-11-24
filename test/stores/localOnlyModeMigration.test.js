const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { createRendererServer, installBrowserGlobals } = require("../lib/rendererTestHarness");

// This build ships with capabilities.cloud === false: every profile, new or
// migrated from a cloud build, must land on local STT and never touch a cloud
// route for transcription, cleanup, or summary.

async function loadStore(t, initialStorage, cachePrefix) {
  installBrowserGlobals(t, { initialStorage });
  const vite = await createRendererServer(t, {
    cachePrefix,
    resolveAlias: { "@": path.resolve(__dirname, "../../src") },
  });
  await vite.ssrLoadModule("/models/ModelRegistry.ts");
  const store = await vite.ssrLoadModule("/stores/settingsStore.ts");
  return { ...store, vite };
}

test("a profile migrated from a cloud build is forced onto local STT", async (t) => {
  const { useSettingsStore } = await loadStore(
    t,
    {
      _providerSettingsMigrated: "1",
      transcriptionMode: "openwhispr",
      meetingTranscriptionMode: "openwhispr",
      uploadTranscriptionMode: "openwhispr",
      cleanupMode: "openwhispr",
      useLocalWhisper: "false",
    },
    "vsluh-local-only-migrated-profile-test-"
  );
  const s = useSettingsStore.getState();
  assert.equal(s.useLocalWhisper, true);
  assert.equal(s.meetingUseLocalWhisper, true);
  assert.equal(s.uploadUseLocalWhisper, true);
  assert.equal(localStorage.getItem("transcriptionMode"), "local");
  assert.equal(localStorage.getItem("_localOnlyModeApplied"), "1");
});

test("a fresh profile starts local without writing anything first", async (t) => {
  const { useSettingsStore } = await loadStore(t, {}, "vsluh-local-only-fresh-profile-test-");
  const s = useSettingsStore.getState();
  assert.equal(s.useLocalWhisper, true);
  assert.equal(s.meetingUseLocalWhisper, true);
  assert.equal(s.uploadUseLocalWhisper, true);
  assert.equal(localStorage.getItem("transcriptionMode"), "local");
  assert.equal(localStorage.getItem("meetingTranscriptionMode"), "local");
  assert.equal(localStorage.getItem("uploadTranscriptionMode"), "local");
});
