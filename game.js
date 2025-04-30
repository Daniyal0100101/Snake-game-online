const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const gridSize = 20;
let tileCountX, tileCountY;
let snake, velocity, food, score, highScore, gameSpeed;
let isGameOver = false;
let paused = false;
let lastTapTime = 0;
let lastTime = 0,
  accumulator = 0;
let touchStartX = null,
  touchStartY = null;
let animationTime = 0;
let scoreOpacity = 0,
  scoreScale = 1;

function resizeCanvas() {
  // Make canvas always square and centered, max 90vmin
  const size = Math.min(window.innerWidth, window.innerHeight) * 0.9;
  canvas.width = size;
  canvas.height = size;
  tileCountX = Math.floor(canvas.width / gridSize);
  tileCountY = Math.floor(canvas.height / gridSize);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Load high score
highScore = parseInt(localStorage.getItem("snakeHighScore")) || 0;

// Beep sound for new high score
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playBeep() {
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.type = "sine";
  oscillator.frequency.value = 800;
  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  oscillator.stop(audioCtx.currentTime + 0.3);
}

function initGame() {
  snake = [{ x: Math.floor(tileCountX / 2), y: Math.floor(tileCountY / 2) }];
  velocity = { x: 0, y: 0 };
  score = 0;
  gameSpeed = 160;
  food = spawnFood();
  isGameOver = false;
  paused = false;
  lastTime = performance.now();
  accumulator = 0;
  scoreOpacity = 0;
  requestAnimationFrame(gameLoop);
}

function spawnFood() {
  let valid = false,
    newFood;
  while (!valid) {
    newFood = {
      x: Math.floor(Math.random() * tileCountX),
      y: Math.floor(Math.random() * tileCountY),
    };
    valid = !snake.some((part) => part.x === newFood.x && part.y === newFood.y);
  }
  return newFood;
}

function updateGame() {
  if (velocity.x === 0 && velocity.y === 0) return;
  const newHead = {
    x: snake[0].x + velocity.x,
    y: snake[0].y + velocity.y,
  };
  if (newHead.x < 0) newHead.x = tileCountX - 1;
  if (newHead.x >= tileCountX) newHead.x = 0;
  if (newHead.y < 0) newHead.y = tileCountY - 1;
  if (newHead.y >= tileCountY) newHead.y = 0;
  if (snake.some((part) => part.x === newHead.x && part.y === newHead.y)) {
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
    scoreScale = 1.2;
    food = spawnFood();
    gameSpeed = Math.max(50, gameSpeed - 2);
  } else {
    snake.pop();
  }
}

function drawGame() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Animate food
  const foodX = food.x * gridSize + gridSize / 2;
  const foodY = food.y * gridSize + gridSize / 2;
  ctx.save();
  ctx.translate(foodX, foodY);
  ctx.rotate(Math.sin(animationTime / 200) * 0.1);
  ctx.beginPath();
  ctx.arc(
    0,
    0,
    (gridSize / 2) * (1 + 0.1 * Math.sin(animationTime / 150)),
    0,
    2 * Math.PI
  );
  ctx.fillStyle = "#e74c3c";
  ctx.shadowColor = "#ffaaaa";
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.restore();
  // Draw snake
  for (let i = 0; i < snake.length; i++) {
    ctx.save();
    ctx.globalAlpha = 0.8 + 0.2 * (i / snake.length);
    ctx.fillStyle = i === 0 ? "#3c6" : "#6c6";
    ctx.shadowColor = i === 0 ? "#aaffaa" : "#333";
    ctx.shadowBlur = i === 0 ? 8 : 0;
    ctx.fillRect(
      snake[i].x * gridSize,
      snake[i].y * gridSize,
      gridSize,
      gridSize
    );
    ctx.restore();
  }
  // Score display
  let scoreText = `Score: ${score}`;
  ctx.font = "bold 28px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = "#fff";
  ctx.fillText(scoreText, 18, 10);
  ctx.font = "16px Arial";
  ctx.fillStyle = "#aaa";
  ctx.fillText(`High: ${highScore}`, 18, 38);
  ctx.restore();
  // Paused overlay
  if (paused) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Paused", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "24px Arial";
    ctx.fillText(
      "Double-tap or press P",
      canvas.width / 2,
      canvas.height / 2 + 20
    );
  }
  // Game over overlay
  if (isGameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 40);
    ctx.font = "24px Arial";
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2);
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
  ctx.textAlign = "start";
}

function gameLoop(currentTime) {
  if (paused) {
    lastTime = currentTime;
    requestAnimationFrame(gameLoop);
    return;
  }
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;
  accumulator += deltaTime;
  animationTime += deltaTime;
  while (accumulator > gameSpeed && !isGameOver) {
    updateGame();
    accumulator -= gameSpeed;
  }
  drawGame();
  if (!isGameOver) requestAnimationFrame(gameLoop);
}

// Touch controls
canvas.addEventListener("touchstart", function (e) {
  e.preventDefault();
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
});
canvas.addEventListener("touchend", function (e) {
  e.preventDefault();
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  const diffX = touchEndX - touchStartX;
  const diffY = touchEndY - touchStartY;
  if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
    if (isGameOver) {
      initGame();
    } else {
      const currentTime = Date.now();
      if (currentTime - lastTapTime < 300) {
        paused = !paused;
      }
      lastTapTime = currentTime;
    }
  } else if (!isGameOver && !paused) {
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0 && velocity.x !== -1) velocity = { x: 1, y: 0 };
      else if (diffX < 0 && velocity.x !== 1) velocity = { x: -1, y: 0 };
    } else {
      if (diffY > 0 && velocity.y !== -1) velocity = { x: 0, y: 1 };
      else if (diffY < 0 && velocity.y !== 1) velocity = { x: 0, y: -1 };
    }
  }
});

// Mobile on-screen controls
const mobileControls = document.getElementById("mobile-controls");
if (mobileControls) {
  mobileControls.addEventListener("click", function (e) {
    if (e.target.tagName === "BUTTON") {
      const dir = e.target.dataset.dir;
      if (dir === "up" && velocity.y !== 1) velocity = { x: 0, y: -1 };
      if (dir === "down" && velocity.y !== -1) velocity = { x: 0, y: 1 };
      if (dir === "left" && velocity.x !== 1) velocity = { x: -1, y: 0 };
      if (dir === "right" && velocity.x !== -1) velocity = { x: 1, y: 0 };
    }
  });
}

// Keyboard support
window.addEventListener("keydown", function (e) {
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

initGame();
