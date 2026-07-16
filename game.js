(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const gameArea = document.getElementById("gameArea");
  const overlay = document.getElementById("gameOverlay");
  const overlayTitle = document.getElementById("overlayTitle");
  const overlayMessage = document.getElementById("overlayMessage");
  const startButton = document.getElementById("startButton");
  const scoreNode = document.getElementById("score");
  const bestNode = document.getElementById("bestScore");
  const soundButton = document.getElementById("soundButton");
  const resetBestButton = document.getElementById("resetBestButton");

  const W = canvas.width;
  const H = canvas.height;
  const groundY = H - 120;
  const bird = { x: 190, y: 410, r: 25, velocity: 0, rotation: 0 };
  const pipes = [];
  let state = "ready";
  let score = 0;
  let best = Number(localStorage.getItem("flappy-best-zh") || 0);
  let soundOn = true;
  let frame = 0;
  let lastTime = performance.now();
  let audioContext;

  bestNode.textContent = best;

  function beep(frequency, duration, volume = 0.05) {
    if (!soundOn) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(volume, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + duration);
    } catch (_) {}
  }

  function reset() {
    bird.y = 410;
    bird.velocity = 0;
    bird.rotation = 0;
    pipes.length = 0;
    score = 0;
    frame = 0;
    scoreNode.textContent = "0";
  }

  function start() {
    reset();
    state = "playing";
    overlay.classList.add("hidden");
    gameArea.focus({ preventScroll: true });
    flap();
  }

  function flap() {
    if (state !== "playing") return;
    bird.velocity = -680;
    beep(520, 0.06, 0.035);
  }

  function endGame() {
    if (state !== "playing") return;
    state = "gameover";
    beep(120, 0.22, 0.07);
    if (score > best) {
      best = score;
      localStorage.setItem("flappy-best-zh", String(best));
      bestNode.textContent = best;
    }
    overlayTitle.textContent = score > 0 ? "本局结束" : "再试一次";
    overlayMessage.textContent = `本局 ${score} 分 · 最佳 ${best} 分`;
    startButton.textContent = "重新开始";
    overlay.classList.remove("hidden");
  }

  function addPipe() {
    const gap = Math.max(230, 290 - score * 2);
    const top = 150 + Math.random() * (groundY - gap - 300);
    pipes.push({ x: W + 20, width: 105, top, gap, scored: false });
  }

  function circleRectCollision(cx, cy, radius, x, y, width, height) {
    const closestX = Math.max(x, Math.min(cx, x + width));
    const closestY = Math.max(y, Math.min(cy, y + height));
    return (cx - closestX) ** 2 + (cy - closestY) ** 2 < radius ** 2;
  }

  function update(dt) {
    frame += dt;
    if (state === "ready") {
      bird.y = 410 + Math.sin(performance.now() / 260) * 12;
      return;
    }
    if (state !== "playing") return;

    bird.velocity += 1900 * dt;
    bird.y += bird.velocity * dt;
    bird.rotation = Math.max(-0.45, Math.min(1.15, bird.velocity / 720));

    if (frame >= 1.45) {
      addPipe();
      frame = 0;
    }

    const speed = 245 + Math.min(score * 4, 85);
    for (const pipe of pipes) {
      pipe.x -= speed * dt;
      if (!pipe.scored && pipe.x + pipe.width < bird.x) {
        pipe.scored = true;
        score += 1;
        scoreNode.textContent = score;
        beep(760, 0.09, 0.05);
      }
      if (
        circleRectCollision(bird.x, bird.y, bird.r - 5, pipe.x, 0, pipe.width, pipe.top) ||
        circleRectCollision(bird.x, bird.y, bird.r - 5, pipe.x, pipe.top + pipe.gap, pipe.width, groundY - pipe.top - pipe.gap)
      ) endGame();
    }
    while (pipes.length && pipes[0].x + pipes[0].width < -20) pipes.shift();
    if (bird.y - bird.r <= 0 || bird.y + bird.r >= groundY) endGame();
  }

  function roundedRect(x, y, width, height, radius, fill) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawSky() {
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, "#73cef5");
    sky.addColorStop(1, "#d9f6ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.72)";
    for (let i = 0; i < 5; i++) {
      const x = ((i * 190 - performance.now() * 0.012) % (W + 180)) - 70;
      const y = 120 + (i % 3) * 135;
      ctx.beginPath();
      ctx.arc(x, y, 34, Math.PI, 0);
      ctx.arc(x + 38, y - 18, 43, Math.PI, 0);
      ctx.arc(x + 84, y, 31, Math.PI, 0);
      ctx.fill();
    }
  }

  function drawPipes() {
    for (const p of pipes) {
      const gradient = ctx.createLinearGradient(p.x, 0, p.x + p.width, 0);
      gradient.addColorStop(0, "#48a934");
      gradient.addColorStop(.45, "#8bdd48");
      gradient.addColorStop(1, "#2c8129");
      roundedRect(p.x, -20, p.width, p.top + 20, 12, gradient);
      roundedRect(p.x - 12, p.top - 35, p.width + 24, 38, 8, gradient);
      roundedRect(p.x, p.top + p.gap, p.width, groundY - p.top - p.gap + 20, 12, gradient);
      roundedRect(p.x - 12, p.top + p.gap, p.width + 24, 38, 8, gradient);
    }
  }

  function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);
    ctx.fillStyle = "#ffb627";
    ctx.strokeStyle = "#7e4a00";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 38, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffe36e";
    ctx.beginPath();
    ctx.ellipse(-12, 10, 22, 12, -.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(18, -9, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#17324d";
    ctx.beginPath();
    ctx.arc(22, -8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff6b35";
    ctx.beginPath();
    ctx.moveTo(31, 1);
    ctx.lineTo(56, 8);
    ctx.lineTo(31, 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawGround() {
    ctx.fillStyle = "#8fca4f";
    ctx.fillRect(0, groundY, W, 20);
    ctx.fillStyle = "#d7b56d";
    ctx.fillRect(0, groundY + 20, W, H - groundY - 20);
    ctx.fillStyle = "rgba(107,75,34,.18)";
    const offset = (performance.now() * 0.08) % 42;
    for (let x = -42 + offset; x < W; x += 42) ctx.fillRect(x, groundY + 42, 22, 7);
  }

  function draw() {
    drawSky();
    drawPipes();
    drawGround();
    drawBird();
  }

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.032);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  startButton.addEventListener("click", (event) => { event.stopPropagation(); start(); });
  gameArea.addEventListener("pointerdown", (event) => {
    if (event.target === startButton) return;
    if (state === "playing") flap();
  });
  window.addEventListener("keydown", (event) => {
    if (!["Space", "ArrowUp"].includes(event.code)) return;
    event.preventDefault();
    if (state === "ready" || state === "gameover") start(); else flap();
  });
  soundButton.addEventListener("click", () => {
    soundOn = !soundOn;
    soundButton.textContent = soundOn ? "🔊" : "🔇";
    soundButton.setAttribute("aria-label", soundOn ? "关闭音效" : "开启音效");
    soundButton.setAttribute("aria-pressed", String(soundOn));
  });
  resetBestButton.addEventListener("click", () => {
    best = 0;
    bestNode.textContent = "0";
    localStorage.removeItem("flappy-best-zh");
  });

  requestAnimationFrame(loop);
})();
