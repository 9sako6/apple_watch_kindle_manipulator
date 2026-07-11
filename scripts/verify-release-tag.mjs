import { readFile } from "node:fs/promises";

const { version } = JSON.parse(await readFile("package.json", "utf8"));
const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME;
const expected = `v${version}`;

if (tag !== expected) {
  console.error(`Release tag ${tag ?? "<missing>"} does not match package version ${version}. Expected ${expected}.`);
  process.exitCode = 1;
}
