import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function workflow(name) {
  try {
    return await readFile(`.github/workflows/${name}`, "utf8");
  } catch {
    return "";
  }
}

test("CI validates pushes and pull requests", async () => {
  const source = await workflow("ci.yml");
  assert.match(source, /push:/);
  assert.match(source, /pull_request:/);
  assert.match(source, /npm ci/);
  assert.match(source, /npm run check/);
});

test("release workflow publishes tags to Releases and Pages", async () => {
  const source = await workflow("release.yml");
  assert.match(source, /tags:\s*\n\s*- "v\*"/);
  assert.match(source, /npm run release:verify/);
  assert.match(source, /gh release create/);
  assert.match(source, /path: dist/);
  assert.match(source, /actions\/deploy-pages@v4/);
  assert.match(source, /name: github-pages/);
});

test("README links mobile users to the latest and archived builds", async () => {
  const source = await readFile("README.md", "utf8");
  assert.match(source, /https:\/\/9sako6\.github\.io\/apple_watch_kindle_manipulator\/kindle-remote\.user\.js/);
  assert.match(source, /https:\/\/github\.com\/9sako6\/apple_watch_kindle_manipulator\/releases/);
});
