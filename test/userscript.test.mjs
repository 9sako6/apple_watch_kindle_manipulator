import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));

test("build produces one permission-limited Userscripts artifact", async () => {
  const build = spawnSync(process.execPath, ["scripts/build.mjs"], {
    encoding: "utf8"
  });
  assert.equal(build.status, 0, build.stderr);

  assert.deepEqual(await readdir("dist"), ["kindle-remote.user.js"]);
  const script = await readFile("dist/kindle-remote.user.js", "utf8");

  assert.match(script, /\/\/ ==UserScript==/);
  assert.match(script, /\/\/ @name\s+Apple Watch Kindle Remote/);
  assert.match(script, new RegExp(`// @version\\s+${packageJson.version.replaceAll(".", "\\.")}`));
  assert.match(script, /\/\/ @match\s+https:\/\/read\.amazon\.co\.jp\/\*/);
  assert.match(script, /\/\/ @match\s+https:\/\/read\.amazon\.com\/\*/);
  assert.match(script, /\/\/ @match\s+https:\/\/read\.amazon\.co\.uk\/\*/);
  assert.match(script, /\/\/ @grant\s+none/);
  assert.doesNotMatch(script, /@connect|@downloadURL|@updateURL/);
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
