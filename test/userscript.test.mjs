import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));

test("project name matches the repository", () => {
  assert.equal(packageJson.name, "apple_watch_kindle_manipulator");
});

test("build produces the install page and permission-limited userscript", async () => {
  const build = spawnSync(process.execPath, ["scripts/build.mjs"], {
    encoding: "utf8"
  });
  assert.equal(build.status, 0, build.stderr);

  assert.deepEqual((await readdir("dist")).sort(), ["index.html", "kindle-remote.user.js"]);
  const script = await readFile("dist/kindle-remote.user.js", "utf8");

  assert.match(script, /\/\/ ==UserScript==/);
  assert.match(script, /\/\/ @name\s+Apple Watch Kindle Manipulator/);
  assert.match(script, new RegExp(`// @version\\s+${packageJson.version.replaceAll(".", "\\.")}`));
  assert.match(script, /\/\/ @match\s+https:\/\/read\.amazon\.co\.jp\/\*/);
  assert.match(script, /\/\/ @match\s+https:\/\/read\.amazon\.com\/\*/);
  assert.match(script, /\/\/ @match\s+https:\/\/read\.amazon\.co\.uk\/\*/);
  assert.match(script, /\/\/ @grant\s+none/);
  assert.doesNotMatch(script, /@connect|@downloadURL|@updateURL/);
});

test("install page can open and copy the built userscript", async () => {
  const html = await readFile("dist/index.html", "utf8");

  assert.match(html, /<h1>Apple Watch Kindle Manipulator<\/h1>/);
  assert.match(html, /href="\.\/kindle-remote\.user\.js"/);
  assert.match(html, /id="copy-script"/);
  assert.match(html, /navigator\.clipboard\.writeText/);
  assert.match(html, /document\.execCommand\("copy"\)/);
  assert.match(html, /<textarea[^>]+readonly/);
  assert.match(html, new RegExp(`Version ${packageJson.version.replaceAll(".", "\\.")}`));
});

test("release tag must match the package version", () => {
  const matching = spawnSync(process.execPath, ["scripts/verify-release-tag.mjs", `v${packageJson.version}`], {
    encoding: "utf8"
  });
  assert.equal(matching.status, 0, matching.stderr);

  const mismatching = spawnSync(process.execPath, ["scripts/verify-release-tag.mjs", "v99.99.99"], {
    encoding: "utf8"
  });
  assert.notEqual(mismatching.status, 0);
  assert.match(mismatching.stderr, /does not match package version/);
});

test("silent media remains logically audible to iOS and iPadOS", async () => {
  const script = await readFile("dist/kindle-remote.user.js", "utf8");

  assert.match(script, /new Blob/);
  assert.doesNotMatch(script, /\.muted\s*=\s*true|\.volume\s*=\s*0/);
});

test("point activation cannot start text selection", async () => {
  const source = await readFile("src/userscript.ts", "utf8");
  const pointEvents = source.match(/function pointEvents[\s\S]*?\n}\n\nfunction keyboard/)?.[0] ?? "";

  assert.match(pointEvents, /new MouseEvent\("click"/);
  assert.match(source, /contentDocument/);
  assert.doesNotMatch(pointEvents, /pointerdown|mousedown|touchstart/);
});

test("remote controls can be disabled and are kept registered while enabled", async () => {
  const source = await readFile("src/userscript.ts", "utf8");

  assert.match(source, /REMOTE_HEARTBEAT_MS/);
  assert.match(source, /window\.setInterval/);
  assert.match(source, /setActionHandler\(action, null\)/);
  assert.match(source, /audio\?\.pause\(\)/);
  assert.match(source, /Disable remote controls/);
});

test("page direction supports auto, right, and left modes", async () => {
  const source = await readFile("src/userscript.ts", "utf8");

  assert.match(source, /type PageDirection = "auto" \| "right" \| "left"/);
  assert.match(source, /\["auto", "Auto"\]/);
  assert.match(source, /\["right", "Next right"\]/);
  assert.match(source, /\["left", "Next left"\]/);
  assert.match(source, /writingMode/);
});

test("minimize keeps a draggable restore button on screen", async () => {
  const source = await readFile("src/userscript.ts", "utf8");

  assert.doesNotMatch(source, /HIDDEN_STORAGE_KEY/);
  assert.match(source, /awkm-compact/);
  assert.match(source, /pointermove/);
  assert.match(source, /Minimize/);
  assert.match(source, /Show controls/);
});
