import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("build produces one permission-limited Userscripts artifact", async () => {
  const build = spawnSync(process.execPath, ["scripts/build.mjs"], {
    encoding: "utf8"
  });
  assert.equal(build.status, 0, build.stderr);

  assert.deepEqual(await readdir("dist"), ["kindle-remote.user.js"]);
  const script = await readFile("dist/kindle-remote.user.js", "utf8");

  assert.match(script, /\/\/ ==UserScript==/);
  assert.match(script, /\/\/ @name\s+Apple Watch Kindle Remote/);
  assert.match(script, /\/\/ @match\s+https:\/\/read\.amazon\.co\.jp\/\*/);
  assert.match(script, /\/\/ @match\s+https:\/\/read\.amazon\.com\/\*/);
  assert.match(script, /\/\/ @match\s+https:\/\/read\.amazon\.co\.uk\/\*/);
  assert.match(script, /\/\/ @grant\s+none/);
  assert.doesNotMatch(script, /@connect|@downloadURL|@updateURL/);
});

test("silent media remains logically audible to iPadOS", async () => {
  const script = await readFile("dist/kindle-remote.user.js", "utf8");

  assert.match(script, /new Blob/);
  assert.doesNotMatch(script, /\.muted\s*=\s*true|\.volume\s*=\s*0/);
});
