import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = path.resolve(import.meta.dirname, "..");
const TARGET_DIRS = ["apps", "packages", "scripts", "tests"];

let issues = 0;
let checkedFiles = 0;

function walk(dir: string) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === ".next" ||
      entry.name === "dist" ||
      entry.name === "_games"
    ) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    const rel = path.relative(ROOT_DIR, fullPath).replace(/\\/g, "/");
    if (rel === "scripts/lint.ts") {
      continue;
    }
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      checkedFiles++;
      const content = fs.readFileSync(fullPath, "utf8");

      if (/^\s*debugger\s*;?/m.test(content)) {
        console.error(`[lint] Forbidden 'debugger' statement in ${rel}`);
        issues++;
      }
      if (/allow-same-origin/.test(content) && rel.includes("game-player")) {
        console.error(
          `[lint] Security violation: 'allow-same-origin' is forbidden in game-player (${rel})`
        );
        issues++;
      }
      if (/pull_request_target/.test(content)) {
        console.error(
          `[lint] Security violation: 'pull_request_target' is forbidden (${rel})`
        );
        issues++;
      }
    }
  }
}

for (const d of TARGET_DIRS) {
  walk(path.join(ROOT_DIR, d));
}

if (issues > 0) {
  console.error(`\nLint failed with ${issues} error(s) across ${checkedFiles} files.`);
  process.exit(1);
}

console.log(
  `✔ Lint passed (${checkedFiles} source files checked, 0 security or code policy violations).`
);
