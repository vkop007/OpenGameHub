import { THREE, Mesh, Scene, PerspectiveCamera, WebGLRenderer } from "three";

const canvas = document.getElementById("viewport") as HTMLCanvasElement;
const scoreEl = document.getElementById("score") as HTMLElement;
const shieldEl = document.getElementById("shield") as HTMLElement;

const scene = new Scene();
const camera = new PerspectiveCamera(60, 16 / 9);
const renderer = new WebGLRenderer({ canvas });
renderer.setSize(800, 450);

const player = new Mesh("ship", "#38bdf8", 0.65);
player.position.y = -2.2;
player.position.z = 2;
scene.add(player);

const stars: Mesh[] = [];
for (let i = 0; i < 45; i++) {
  const star = new Mesh("star", "#94a3b8", 0.06);
  star.position.x = (Math.random() - 0.5) * 26;
  star.position.y = (Math.random() - 0.5) * 16;
  star.position.z = -Math.random() * 35;
  scene.add(star);
  stars.push(star);
}

const lasers: Mesh[] = [];
const enemies: Mesh[] = [];

for (let i = 0; i < 7; i++) {
  const enemy = new Mesh("asteroid", "#f43f5e", 0.75);
  enemy.position.x = (Math.random() - 0.5) * 12;
  enemy.position.y = (Math.random() - 0.5) * 6;
  enemy.position.z = -8 - i * 4;
  scene.add(enemy);
  enemies.push(enemy);
}

let score = 0;
let shield = 100;
const keys: Record<string, boolean> = {};

function fireLaser() {
  const bolt = new Mesh("laser", "#facc15", 0.16);
  bolt.position.x = player.position.x;
  bolt.position.y = player.position.y + 0.4;
  bolt.position.z = player.position.z - 0.5;
  scene.add(bolt);
  lasers.push(bolt);
}

window.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === " ") {
    fireLaser();
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("click", () => {
  fireLaser();
});

function emitStatus() {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      {
        namespace: "opengamehub:bridge:v1",
        type: "GAME_STATUS",
        payload: { score, state: "playing" }
      },
      "*"
    );
  }
}

function animate() {
  if (keys["a"] || keys["arrowleft"]) player.position.x = Math.max(-6, player.position.x - 0.16);
  if (keys["d"] || keys["arrowright"]) player.position.x = Math.min(6, player.position.x + 0.16);
  if (keys["w"] || keys["arrowup"]) player.position.y = Math.min(3.5, player.position.y + 0.14);
  if (keys["s"] || keys["arrowdown"]) player.position.y = Math.max(-3.5, player.position.y - 0.14);

  for (const star of stars) {
    star.position.z += 0.35;
    if (star.position.z > 10) star.position.z = -30;
  }

  for (let i = lasers.length - 1; i >= 0; i--) {
    const l = lasers[i];
    l.position.z -= 0.7;
    if (l.position.z < -36) {
      scene.remove(l);
      lasers.splice(i, 1);
    }
  }

  for (const enemy of enemies) {
    enemy.position.z += 0.18;
    enemy.rotation.z += 0.04;

    // Check laser hits
    for (let i = lasers.length - 1; i >= 0; i--) {
      const l = lasers[i];
      const dx = l.position.x - enemy.position.x;
      const dy = l.position.y - enemy.position.y;
      const dz = l.position.z - enemy.position.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 1.3) {
        scene.remove(l);
        lasers.splice(i, 1);
        enemy.position.z = -32;
        enemy.position.x = (Math.random() - 0.5) * 12;
        enemy.position.y = (Math.random() - 0.5) * 6;
        score += 150;
        scoreEl.textContent = String(score);
        emitStatus();
        break;
      }
    }

    if (enemy.position.z > player.position.z + 1) {
      enemy.position.z = -30;
      enemy.position.x = (Math.random() - 0.5) * 12;
      shield = Math.max(0, shield - 10);
      shieldEl.textContent = `${shield}%`;
      if (shield === 0) {
        shield = 100;
        score = 0;
        scoreEl.textContent = "0";
        shieldEl.textContent = "100%";
      }
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

if (window.parent && window.parent !== window) {
  window.parent.postMessage(
    { namespace: "opengamehub:bridge:v1", type: "GAME_READY" },
    "*"
  );
}

requestAnimationFrame(animate);
console.log("Three.js Space Shooter initialized", Boolean(THREE));
