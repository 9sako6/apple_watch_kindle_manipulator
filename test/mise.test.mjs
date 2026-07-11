import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateVersion } from "../scripts/release.mjs";

async function read(path) {
  try {
    return await readFile(path, "utf8");
  } catch {
    return "";
  }
}

test("mise exposes only setup, check, and release", async () => {
  const source = await read(".mise.toml");
  assert.match(source, /node\s*=\s*"24"/);
  assert.deepEqual(
    [...source.matchAll(/^\[tasks\.([^\]]+)\]$/gm)].map((match) => match[1]),
    ["setup", "check", "release"]
  );
});

test("release validates versions and pushes atomically", async () => {
  const source = await read("scripts/release.mjs");
  assert.match(source, /export function validateVersion/);
  assert.match(source, /--atomic/);
  assert.match(source, /npm run check/);
  assert.match(source, /git status --porcelain/);
});

test("release accepts only a newer semantic version", () => {
  assert.doesNotThrow(() => validateVersion("0.3.0", "0.2.0"));
  assert.throws(() => validateVersion("0.1.99", "0.2.0"), /must be newer/);
  assert.throws(() => validateVersion("0.2.0", "0.2.0"), /must be newer/);
  assert.throws(() => validateVersion("next", "0.2.0"), /x\.y\.z/);
});
