import { mkdir, rm } from "node:fs/promises";
import { build } from "esbuild";

const userscriptHeader = `// ==UserScript==
// @name         Apple Watch Kindle Remote
// @namespace    https://github.com/9sako6/apple_watch_kindle_manipulator
// @version      0.2.0
// @description  Map Apple Watch media controls to Kindle for Web page turns.
// @match        https://read.amazon.co.jp/*
// @match        https://read.amazon.com/*
// @match        https://read.amazon.co.uk/*
// @run-at       document-idle
// @inject-into  page
// @grant        none
// ==/UserScript==`;

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

await build({
  entryPoints: ["src/userscript.ts"],
  bundle: true,
  outfile: "dist/kindle-remote.user.js",
  format: "iife",
  target: "safari16",
  minify: false,
  sourcemap: false,
  legalComments: "none",
  banner: { js: userscriptHeader }
});
