const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const capabilities = require("../../src/config/capabilities").default;

test("Vsluh exposes only the local-first stage-one capabilities", () => {
  assert.deepEqual(capabilities, {
    cloud: false,
    aiAgent: false,
    teamSpaces: false,
    advancedSettings: false,
    calendar: false,
    audioImport: false,
    commandPalette: false,
    toneStyle: false,
    snippets: false,
  });
  assert.ok(Object.isFrozen(capabilities));
});

test("agent-specific notes onboarding stays behind the AI capability", () => {
  const source = readFileSync("src/components/notes/PersonalNotesView.tsx", "utf8");
  assert.ok(source.includes("if (capabilities.aiAgent && !isOnboardingComplete)"));
});

test("meeting overview chat and advanced preferences stay behind capabilities", () => {
  const notes = readFileSync("src/components/notes/PersonalNotesView.tsx", "utf8");
  const settings = readFileSync("src/components/SettingsPage.tsx", "utf8");
  assert.ok(notes.includes("showAskSection={capabilities.aiAgent}"));
  assert.ok(settings.includes("capabilities.advancedSettings && (\n              <GranolaImportSection"));
  assert.ok(settings.includes("capabilities.calendar && ("));
});
