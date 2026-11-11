import { React } from "react";

const rootEl = document.getElementById("root") as HTMLElement;
let board: number[] = Array(16).fill(0);
let score = 0;

function spawnTile() {
  const emptyIndices: number[] = [];
  board.forEach((v, i) => {
    if (v === 0) emptyIndices.push(i);
  });
  if (emptyIndices.length === 0) return;
  const pick = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  board[pick] = Math.random() < 0.9 ? 2 : 4;
}

function slideRowLeft(row: number[]): number[] {
  const filtered = row.filter((v) => v !== 0);
  const merged: number[] = [];
  for (let i = 0; i < filtered.length; i++) {
    if (filtered[i] === filtered[i + 1]) {
      const val = filtered[i] * 2;
      merged.push(val);
      score += val;
      i++;
    } else {
      merged.push(filtered[i]);
    }
  }
  while (merged.length < 4) merged.push(0);
  return merged;
}

function move(dir: "left" | "right" | "up" | "down") {
  const prev = board.join(",");
  if (dir === "left" || dir === "right") {
    for (let r = 0; r < 4; r++) {
      let row = board.slice(r * 4, r * 4 + 4);
      if (dir === "right") row.reverse();
      row = slideRowLeft(row);
      if (dir === "right") row.reverse();
      for (let c = 0; c < 4; c++) board[r * 4 + c] = row[c];
    }
  } else {
    for (let c = 0; c < 4; c++) {
      let col = [board[c], board[4 + c], board[8 + c], board[12 + c]];
      if (dir === "down") col.reverse();
      col = slideRowLeft(col);
      if (dir === "down") col.reverse();
      for (let r = 0; r < 4; r++) board[r * 4 + c] = col[r];
    }
  }

  if (board.join(",") !== prev) {
    spawnTile();
    render();
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
}

function resetGame() {
  board = Array(16).fill(0);
  score = 0;
  spawnTile();
  spawnTile();
  render();
}

function getTileColor(val: number): string {
  const map: Record<number, string> = {
    0: "#18181b",
    2: "#1e293b",
    4: "#312e81",
    8: "#4338ca",
    16: "#6366f1",
    32: "#8b5cf6",
    64: "#a855f7",
    128: "#d946ef",
    256: "#ec4899",
    512: "#f43f5e",
    1024: "#f59e0b",
    2048: "#10b981"
  };
  return map[val] || "#10b981";
}

function render() {
  rootEl.innerHTML = "";
  const header = React.createElement(
    "div",
    {
      style:
        "display:flex;justify-content:space-between;align-items:center;width:340px;margin-bottom:14px;"
    },
    React.createElement(
      "div",
      { style: "font-size:22px;font-weight:800;color:#818cf8;" },
      "CYBER 2048"
    ),
    React.createElement(
      "div",
      {
        style:
          "background:#18181b;border:1px solid #27272a;padding:6px 12px;border-radius:8px;font-weight:700;font-size:14px;"
      },
      `SCORE: ${score}`
    )
  );

  const cells = board.map((val) =>
    React.createElement(
      "div",
      {
        style: `height:74px;display:flex;align-items:center;justify-content:center;border-radius:10px;font-size:22px;font-weight:800;background:${getTileColor(
          val
        )};color:${val === 0 ? "transparent" : "#f8fafc"};border:1px solid #27272a;`
      },
      val === 0 ? "." : val
    )
  );

  const grid = React.createElement(
    "div",
    {
      style:
        "display:grid;grid-template-columns:repeat(4,1fr);gap:10px;width:340px;background:#09090b;padding:12px;border-radius:14px;border:2px solid #27272a;"
    },
    ...cells
  );

  const wrapper = React.createElement(
    "div",
    { style: "display:flex;flex-direction:column;align-items:center;" },
    header,
    grid
  );

  rootEl.appendChild(wrapper);
}

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "arrowleft" || k === "a") move("left");
  else if (k === "arrowright" || k === "d") move("right");
  else if (k === "arrowup" || k === "w") move("up");
  else if (k === "arrowdown" || k === "s") move("down");
  else if (k === "r") resetGame();
});

resetGame();
if (window.parent && window.parent !== window) {
  window.parent.postMessage(
    { namespace: "opengamehub:bridge:v1", type: "GAME_READY" },
    "*"
  );
}
