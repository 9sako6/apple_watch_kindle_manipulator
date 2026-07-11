import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SEMVER = /^\d+\.\d+\.\d+$/;

function capture(command) {
  return execSync(command, { encoding: "utf8" }).trim();
}

function run(command) {
  execSync(command, { stdio: "inherit" });
}

export function validateVersion(next, current) {
  if (!SEMVER.test(next ?? "")) {
    throw new Error("Version must use x.y.z format.");
  }

  const nextParts = next.split(".").map(Number);
  const currentParts = current.split(".").map(Number);
  const firstDifference = nextParts.findIndex((part, index) => part !== currentParts[index]);
  const newer = firstDifference >= 0 && nextParts[firstDifference] > currentParts[firstDifference];

  if (!newer) {
    throw new Error(`Version ${next} must be newer than ${current}.`);
  }
}

function release(next) {
  const { version: current } = JSON.parse(readFileSync("package.json", "utf8"));
  validateVersion(next, current);

  if (capture("git branch --show-current") !== "main") {
    throw new Error("Release must run on main.");
  }
  if (capture("git status --porcelain")) {
    throw new Error("Release requires a clean worktree.");
  }

  run("git fetch origin main --tags");
  if (capture("git rev-parse HEAD") !== capture("git rev-parse origin/main")) {
    throw new Error("Local main must match origin/main.");
  }

  const tag = `v${next}`;
  try {
    execSync(`git show-ref --verify --quiet refs/tags/${tag}`);
    throw new Error(`Tag ${tag} already exists.`);
  } catch (error) {
    if (error instanceof Error && error.message === `Tag ${tag} already exists.`) throw error;
  }

  let versionChanged = false;
  try {
    run(`npm version ${next} --no-git-tag-version`);
    versionChanged = true;
    run("npm run check");
  } catch (error) {
    if (versionChanged) run("git restore -- package.json package-lock.json");
    throw error;
  }

  run("git add package.json package-lock.json");
  run(`git commit -m "chore: release ${tag}" -m "Publish the tested ${tag} userscript build." -m "Co-Authored-By: codex <codex@openai.com>"`);
  run(`git tag -a ${tag} -m "Release ${tag}"`);
  run(`git push --atomic origin main ${tag}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    release(process.argv[2]);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
