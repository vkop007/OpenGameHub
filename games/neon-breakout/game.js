(function () {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const statusEl = document.getElementById("status");

  let score = 0;
  let lives = 3;
  let running = false;

  const paddle = {
    width: 110,
    height: 14,
    x: canvas.width / 2 - 55,
    y: canvas.height - 32,
    speed: 7,
    dx: 0
  };

  const ball = {
    x: canvas.width / 2,
    y: canvas.height - 48,
    radius: 8,
    speed: 4.5,
    dx: 4,
    dy: -4
  };

  const rows = 5;
  const cols = 9;
  const bricks = [];
  const colors = ["#f43f5e", "#fb923c", "#facc15", "#34d399", "#38bdf8"];

  function initBricks() {
    bricks.length = 0;
    const pad = 10;
    const offsetTop = 45;
    const offsetLeft = 35;
    const width = (canvas.width - offsetLeft * 2 - pad * (cols - 1)) / cols;
    const height = 22;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: offsetLeft + c * (width + pad),
          y: offsetTop + r * (height + pad),
          width,
          height,
          color: colors[r % colors.length],
          alive: true
        });
      }
    }
  }

  function resetBall() {
    running = false;
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - ball.radius - 2;
    ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = -4;
    statusEl.textContent = "READY (SPACE / CLICK)";
  }

  function notifyPlatform(type, payload) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            namespace: "opengamehub:bridge:v1",
            type,
            payload
          },
          "*"
        );
      }
    } catch (_) {}
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") paddle.dx = -paddle.speed;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") paddle.dx = paddle.speed;
    if (e.key === " " && !running) {
      running = true;
      statusEl.textContent = "PLAYING";
      notifyPlatform("GAME_STATUS", { score, state: "playing" });
    }
  });

  document.addEventListener("keyup", (e) => {
    if (
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "a" ||
      e.key === "A" ||
      e.key === "d" ||
      e.key === "D"
    ) {
      paddle.dx = 0;
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, mouseX - paddle.width / 2));
    if (!running) {
      ball.x = paddle.x + paddle.width / 2;
    }
  });

  canvas.addEventListener("click", () => {
    if (!running) {
      running = true;
      statusEl.textContent = "PLAYING";
      notifyPlatform("GAME_STATUS", { score, state: "playing" });
    }
  });

  function update() {
    paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, paddle.x + paddle.dx));
    if (!running) {
      ball.x = paddle.x + paddle.width / 2;
      return;
    }

    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
      ball.dx *= -1;
    }
    if (ball.y - ball.radius < 0) {
      ball.dy *= -1;
    }

    // Paddle collision
    if (
      ball.y + ball.radius >= paddle.y &&
      ball.y - ball.radius <= paddle.y + paddle.height &&
      ball.x >= paddle.x &&
      ball.x <= paddle.x + paddle.width
    ) {
      const hitOffset = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
      ball.dx = hitOffset * 5.2;
      ball.dy = -Math.abs(ball.dy);
    }

    // Brick collision
    for (const b of bricks) {
      if (!b.alive) continue;
      if (
        ball.x + ball.radius > b.x &&
        ball.x - ball.radius < b.x + b.width &&
        ball.y + ball.radius > b.y &&
        ball.y - ball.radius < b.y + b.height
      ) {
        b.alive = false;
        ball.dy *= -1;
        score += 100;
        scoreEl.textContent = String(score);
        notifyPlatform("GAME_STATUS", { score, state: "playing" });
        break;
      }
    }

    if (bricks.every((b) => !b.alive)) {
      initBricks();
      resetBall();
      statusEl.textContent = "SECTOR CLEARED! PRESS SPACE";
    }

    if (ball.y - ball.radius > canvas.height) {
      lives -= 1;
      livesEl.textContent = String(lives);
      if (lives <= 0) {
        lives = 3;
        score = 0;
        scoreEl.textContent = "0";
        livesEl.textContent = "3";
        initBricks();
        resetBall();
        statusEl.textContent = "GAME OVER — PRESS SPACE";
        notifyPlatform("GAME_STATUS", { score: 0, state: "gameover" });
      } else {
        resetBall();
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bricks
    for (const b of bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.width, b.height, 4);
      ctx.fill();
    }

    // Draw paddle
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 7);
    ctx.fill();

    // Draw ball
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  initBricks();
  resetBall();
  notifyPlatform("GAME_READY", {});
  requestAnimationFrame(loop);
})();
