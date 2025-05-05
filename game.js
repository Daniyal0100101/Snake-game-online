/*****************************************************
 *  S N A K E  G A M E 
 *****************************************************/

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gridSize = 20; // one logical tile (px)

/* -------------------------------------------------- */
/*  Global state                                      */
let tileCountX, tileCountY;
let snake, velocity, food, score, highScore, gameSpeed;
let isGameOver = false,
  paused = false;

let lastTapTime = 0;
let lastTime = 0,
  accumulator = 0;
let touchStartX = null,
  touchStartY = null;
let animationTime = 0;

/* -------------------------------------------------- */
/*  Hi‑DPI, ad‑aware resize                           */
function resizeCanvas() {
  const ad = document.querySelector(".ad-container");
  const adH = ad ? ad.offsetHeight : 0;
  const margin = 16; // visual breathing room

  const logical = Math.min(
    window.innerWidth - margin * 2,
    window.innerHeight - adH - margin * 2
  );

  /* device‑pixel ratio for crispness on Retina / 4K */
  const dpr = window.devicePixelRatio || 1;

  canvas.style.width = `${logical}px`; // CSS pixels
  canvas.style.height = `${logical}px`;

  canvas.width = logical * dpr; // real framebuffer px
  canvas.height = logical * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale once
  ctx.imageSmoothingEnabled = false;

  tileCountX = Math.floor(logical / gridSize);
  tileCountY = Math.floor(logical / gridSize);
}
window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);
resizeCanvas();

/* -------------------------------------------------- */
/*  Persisted high‑score + tiny “beep” on new record  */
highScore = parseInt(localStorage.getItem("snakeHighScore")) || 0;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = "sine";
  osc.frequency.value = 800;
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  osc.stop(audioCtx.currentTime + 0.3);
}

/* -------------------------------------------------- */
/*  Game‑state helpers                                */
function initGame() {
  snake = [{ x: Math.floor(tileCountX / 2), y: Math.floor(tileCountY / 2) }];
  velocity = { x: 0, y: 0 };
  score = 0;
  gameSpeed = 160; // ms per update (speeds up)
  food = spawnFood();
  isGameOver = false;
  paused = false;
  lastTime = performance.now();
  accumulator = 0;
  requestAnimationFrame(gameLoop);
}

function spawnFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * tileCountX),
      y: Math.floor(Math.random() * tileCountY),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
}

function updateGame() {
  if (velocity.x === 0 && velocity.y === 0) return; // still waiting for first move

  const newHead = {
    x: (snake[0].x + velocity.x + tileCountX) % tileCountX,
    y: (snake[0].y + velocity.y + tileCountY) % tileCountY,
  };

  /* self‑collision */
  if (snake.some((p) => p.x === newHead.x && p.y === newHead.y)) {
    isGameOver = true;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem("snakeHighScore", highScore);
      playBeep();
    }
    return;
  }

  snake.unshift(newHead);

  if (newHead.x === food.x && newHead.y === food.y) {
    score++;
    food = spawnFood();
    gameSpeed = Math.max(50, gameSpeed - 2); // speed‑up cap
  } else {
    snake.pop();
  }
}

/* -------------------------------------------------- */
/*  Rendering                                         */
function drawGame() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  /* ---- FOOD : “gem” with radial gradient ---- */
  const foodPx = food.x * gridSize;
  const foodPy = food.y * gridSize;
  const fg = ctx.createRadialGradient(
    foodPx + gridSize * 0.4,
    foodPy + gridSize * 0.4,
    gridSize * 0.1,
    foodPx + gridSize * 0.4,
    foodPy + gridSize * 0.4,
    gridSize * 0.6
  );
  fg.addColorStop(0, "#ff6666");
  fg.addColorStop(1, "#c00");
  ctx.fillStyle = fg;
  ctx.shadowColor = "#ffaaaa";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(
    foodPx + gridSize / 2,
    foodPy + gridSize / 2,
    gridSize * 0.45,
    0,
    2 * Math.PI
  );
  ctx.fill();
  ctx.shadowBlur = 0;

  /* ---- SNAKE : glossy rounded tiles ---- */
  for (let i = 0; i < snake.length; i++) {
    const { x, y } = snake[i];
    const px = x * gridSize;
    const py = y * gridSize;

    const grad = ctx.createLinearGradient(px, py, px, py + gridSize);
    if (i === 0) {
      grad.addColorStop(0, "#4eff9f");
      grad.addColorStop(1, "#1f8f4d");
    } else {
      grad.addColorStop(0, "#3ac978");
      grad.addColorStop(1, "#166b38");
    }

    ctx.fillStyle = grad;
    ctx.shadowColor = i === 0 ? "#8affc8" : "transparent";
    ctx.shadowBlur = i === 0 ? 8 : 0;

    const r = gridSize * 0.2;
    ctx.beginPath();
    ctx.moveTo(px + r, py);
    ctx.lineTo(px + gridSize - r, py);
    ctx.quadraticCurveTo(px + gridSize, py, px + gridSize, py + r);
    ctx.lineTo(px + gridSize, py + gridSize - r);
    ctx.quadraticCurveTo(
      px + gridSize,
      py + gridSize,
      px + gridSize - r,
      py + gridSize
    );
    ctx.lineTo(px + r, py + gridSize);
    ctx.quadraticCurveTo(px, py + gridSize, px, py + gridSize - r);
    ctx.lineTo(px, py + r);
    ctx.quadraticCurveTo(px, py, px + r, py);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  /* ---- Score ---- */
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = "#fff";
  ctx.fillText(`Score: ${score}`, 18, 10);
  ctx.font = "16px Arial";
  ctx.fillStyle = "#aaa";
  ctx.fillText(`High: ${highScore}`, 18, 38);
  ctx.globalAlpha = 1;

  /* ---- Overlays ---- */
  if (paused || isGameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    if (paused) {
      ctx.font = "48px Arial";
      ctx.fillText("Paused", canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = "24px Arial";
      ctx.fillText(
        "Double‑tap or press P",
        canvas.width / 2,
        canvas.height / 2 + 20
      );
    } else {
      ctx.font = "48px Arial";
      ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 40);
      ctx.font = "24px Arial";
      ctx.fillText(
        `Final Score: ${score}`,
        canvas.width / 2,
        canvas.height / 2
      );
      ctx.fillText(
        `High Score: ${highScore}`,
        canvas.width / 2,
        canvas.height / 2 + 30
      );
      ctx.fillText(
        "Tap or press Enter to Restart",
        canvas.width / 2,
        canvas.height / 2 + 70
      );
    }
  }
}

/* -------------------------------------------------- */
/*  Main loop                                         */
function gameLoop(time) {
  if (paused) {
    lastTime = time;
    requestAnimationFrame(gameLoop);
    return;
  }

  const delta = time - lastTime;
  lastTime = time;
  accumulator += delta;
  animationTime += delta;

  while (accumulator > gameSpeed && !isGameOver) {
    updateGame();
    accumulator -= gameSpeed;
  }

  drawGame();
  if (!isGameOver) requestAnimationFrame(gameLoop);
}

/* -------------------------------------------------- */
/*  Touch input                                       */
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});
canvas.addEventListener("touchend", (e) => {
  e.preventDefault();
  const endX = e.changedTouches[0].clientX;
  const endY = e.changedTouches[0].clientY;
  const dx = endX - touchStartX;
  const dy = endY - touchStartY;

  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
    // simple tap
    if (isGameOver) initGame();
    else {
      const t = Date.now();
      if (t - lastTapTime < 300) paused = !paused;
      lastTapTime = t;
    }
  } else if (!isGameOver && !paused) {
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && velocity.x !== -1) velocity = { x: 1, y: 0 };
      else if (dx < 0 && velocity.x !== 1) velocity = { x: -1, y: 0 };
    } else {
      if (dy > 0 && velocity.y !== -1) velocity = { x: 0, y: 1 };
      else if (dy < 0 && velocity.y !== 1) velocity = { x: 0, y: -1 };
    }
  }
});

/* -------------------------------------------------- */
/*  On‑screen buttons (mobile d‑pad)                  */
const mobileControls = document.getElementById("mobile-controls");
if (mobileControls) {
  mobileControls.addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") return;
    const dir = e.target.dataset.dir;
    if (dir === "up" && velocity.y !== 1) velocity = { x: 0, y: -1 };
    if (dir === "down" && velocity.y !== -1) velocity = { x: 0, y: 1 };
    if (dir === "left" && velocity.x !== 1) velocity = { x: -1, y: 0 };
    if (dir === "right" && velocity.x !== -1) velocity = { x: 1, y: 0 };
  });
}

/* -------------------------------------------------- */
/*  Keyboard                                          */
window.addEventListener("keydown", (e) => {
  if (isGameOver) {
    if (e.key === "Enter") initGame();
    return;
  }
  if (paused && e.key.toLowerCase() === "p") {
    paused = false;
    return;
  }
  if (paused) return;

  switch (e.key) {
    case "ArrowUp":
    case "w":
      if (velocity.y !== 1) velocity = { x: 0, y: -1 };
      break;
    case "ArrowDown":
    case "s":
      if (velocity.y !== -1) velocity = { x: 0, y: 1 };
      break;
    case "ArrowLeft":
    case "a":
      if (velocity.x !== 1) velocity = { x: -1, y: 0 };
      break;
    case "ArrowRight":
    case "d":
      if (velocity.x !== -1) velocity = { x: 1, y: 0 };
      break;
    case "p":
      paused = true;
      break;
  }
});

/* -------------------------------------------------- */
/*  Kick‑off                                          */
initGame();
