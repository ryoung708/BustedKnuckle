import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Script } from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = await mkdtemp(join(tmpdir(), "ironknuckle-page-check-"));
let htmlCount = 0;
let inlineScriptCount = 0;
let sourceFileCount = 0;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

try {
  // Parse every shipped JavaScript source file, including test and helper scripts.
  for (const directory of [root, join(root, "js"), join(root, "scripts")]) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || ![".js", ".mjs"].includes(extname(entry.name))) continue;
      const file = join(directory, entry.name);
      const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
      assert.equal(result.status, 0,
        "JavaScript syntax failed in " + file + "\n" + result.stderr + result.stdout);
      sourceFileCount++;
    }
  }

  const files = await walk(root);
  const htmlFiles = files.filter(file => extname(file).toLowerCase() === ".html");
  assert.ok(htmlFiles.length > 0, "Expected shipped HTML pages to validate");

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    htmlCount++;
    const tags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];

    for (let index = 0; index < tags.length; index++) {
      const [, attributes, source] = tags[index];
      const src = attributes.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
      if (src) {
        const value = src[2].trim();
        if (!/^(?:[a-z]+:)?\/\//i.test(value) && !value.startsWith("data:")) {
          const localUrl = new URL(value, pathToFileURL(file));
          if (localUrl.protocol === "file:") {
            const localPath = fileURLToPath(localUrl);
            try { await stat(localPath); }
            catch { assert.fail("Missing local script " + value + " referenced by " + file); }
          }
        }
        continue;
      }

      if (!source.trim()) continue;
      const typeMatch = attributes.match(/\btype\s*=\s*(["'])(.*?)\1/i);
      const type = (typeMatch?.[2] || "").toLowerCase();
      if (type && !["text/javascript", "application/javascript", "text/ecmascript",
        "application/ecmascript", "module"].includes(type)) continue;

      const label = file + " inline script #" + (index + 1);
      if (type === "module") {
        const moduleFile = join(temp, "inline-" + inlineScriptCount + ".mjs");
        await writeFile(moduleFile, source, "utf8");
        const result = spawnSync(process.execPath, ["--check", moduleFile], { encoding: "utf8" });
        assert.equal(result.status, 0, "JavaScript syntax failed in " + label + "\n" + result.stderr);
      } else {
        assert.doesNotThrow(() => new Script(source, { filename: label }), label + " must parse");
      }
      inlineScriptCount++;
    }
  }

  // Guard the Learning Center's highest-risk interactive paths against silent regressions.
  const learning = await readFile(join(root, "learning.html"), "utf8");
  for (const system of ["electrical", "engine", "aftertreatment", "transmission", "differential", "summary"]) {
    assert.match(learning, new RegExp("data-system=[\\\"']" + system + "[\\\"']"),
      "Learning Center system tab is missing: " + system);
  }
  assert.match(learning, /document\.querySelectorAll\("\[data-system\]"\)/);
  assert.match(learning, /tabs\.forEach\(t=>t\.addEventListener\("click"/,
    "Learning Center system tabs must have click handlers");
  assert.match(learning, /function renderModule\(key\)/);
  assert.match(learning, /wireDrivelineControls\(key\)/,
    "Newly rendered drivetrain controls must be wired after rendering");
  for (const gear of ["1", "2", "3", "4", "R", "N"]) {
    assert.match(learning, new RegExp("data-amt-gear=[\\\"']" + gear + "[\\\"']"),
      "AMT selector is missing gear " + gear);
  }
  for (const mode of ["straight", "turn"]) {
    assert.match(learning, new RegExp("data-diff-mode=[\\\"']" + mode + "[\\\"']"),
      "Differential mode control is missing: " + mode);
  }
  assert.match(learning, /root\.querySelectorAll\("\[data-amt-gear\]"\)\.forEach\(b=>b\.addEventListener\("click"/,
    "AMT gear buttons must have click handlers");
  assert.match(learning, /root\.querySelectorAll\("\[data-diff-mode\]"\)\.forEach\(b=>b\.addEventListener\("click"/,
    "Differential mode buttons must have click handlers");

  console.log("IronKnuckle page-integrity checks passed: " +
    htmlCount + " HTML pages, " + inlineScriptCount + " inline scripts, " +
    sourceFileCount + " JavaScript source files; Learning Center controls verified.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
