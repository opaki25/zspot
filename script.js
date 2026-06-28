const revealItems = document.querySelectorAll("[data-reveal]");
const counters = document.querySelectorAll("[data-count]");
const cursorGlow = document.querySelector("#cursorGlow");
const heroVisual = document.querySelector(".hero-visual");
const liveSpeed = document.querySelector("#liveSpeed");
const canvas = document.querySelector("#particleField");
const ctx = canvas.getContext("2d");
const pointer = {
  active: false,
  x: 0,
  y: 0,
  lastMove: 0,
};

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);

      if (entry.target.classList.contains("stat-card")) {
        const value = entry.target.querySelector("[data-count]");
        if (value) animateCounter(value);
      }
    });
  },
  { threshold: 0.18 }
);

revealItems.forEach((item) => revealObserver.observe(item));

counters.forEach((counter) => {
  counter.closest(".stat-card")?.setAttribute("data-reveal", "");
});

function animateCounter(element) {
  if (element.dataset.done) return;
  element.dataset.done = "true";

  const target = Number(element.dataset.count);
  const suffix = target === 99 ? "%" : target === 24 ? "/7" : "+";
  const duration = 1100;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = `${Math.round(target * eased)}${suffix}`;

    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

window.addEventListener("pointermove", (event) => {
  pointer.active = true;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.lastMove = performance.now();

  cursorGlow.style.left = `${event.clientX}px`;
  cursorGlow.style.top = `${event.clientY}px`;
  cursorGlow.style.opacity = "1";

  if (!heroVisual) return;
  const rect = heroVisual.getBoundingClientRect();
  const inside =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;

  if (!inside) {
    heroVisual.style.transform = "";
    return;
  }

  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  heroVisual.style.transform = `rotateX(${y * -5}deg) rotateY(${x * 7}deg)`;
});

window.addEventListener("pointerleave", () => {
  pointer.active = false;
  cursorGlow.style.opacity = "0";
  if (heroVisual) heroVisual.style.transform = "";
});

function getEstimatedDownlink() {
  const connection =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (connection && typeof connection.downlink === "number") {
    return Math.max(connection.downlink, 0.4);
  }

  return null;
}

function startLiveSpeedDisplay() {
  if (!liveSpeed) return;

  let currentSpeed = getEstimatedDownlink() ?? 18 + Math.random() * 16;

  function renderSpeed() {
    const estimatedSpeed = getEstimatedDownlink();
    const baseSpeed = estimatedSpeed ?? currentSpeed;
    const variance = estimatedSpeed ? 0.18 : 0.36;
    const drift = 1 + (Math.random() - 0.5) * variance;

    currentSpeed = Math.max(0.5, baseSpeed * drift);
    liveSpeed.textContent =
      currentSpeed >= 10 ? currentSpeed.toFixed(1) : currentSpeed.toFixed(2);
  }

  renderSpeed();
  setInterval(renderSpeed, 1800);

  const connection =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (connection?.addEventListener) {
    connection.addEventListener("change", renderSpeed);
  }
}

startLiveSpeedDisplay();

let particles = [];
let width = 0;
let height = 0;
let pixelRatio = 1;

function resizeCanvas() {
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const particleCount = Math.min(82, Math.max(38, Math.floor(width / 18)));
  particles = Array.from({ length: particleCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.32,
    vy: (Math.random() - 0.5) * 0.32,
    size: Math.random() * 1.7 + 0.55,
  }));
}

function drawParticles() {
  ctx.clearRect(0, 0, width, height);

  particles.forEach((particle, index) => {
    particle.x += particle.vx;
    particle.y += particle.vy;

    if (particle.x < 0 || particle.x > width) particle.vx *= -1;
    if (particle.y < 0 || particle.y > height) particle.vy *= -1;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(95, 231, 255, 0.62)";
    ctx.fill();

    for (let next = index + 1; next < particles.length; next += 1) {
      const other = particles[next];
      const dx = particle.x - other.x;
      const dy = particle.y - other.y;
      const distance = Math.hypot(dx, dy);

      if (distance < 120) {
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(other.x, other.y);
        ctx.strokeStyle = `rgba(95, 231, 255, ${0.18 * (1 - distance / 120)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  });

  drawCursorNetwork(performance.now());

  requestAnimationFrame(drawParticles);
}

function drawCursorNetwork(now) {
  if (!pointer.active || now - pointer.lastMove > 1800) return;

  const pulse = now * 0.0025;
  const nodes = Array.from({ length: 7 }, (_, index) => {
    const angle = pulse + index * ((Math.PI * 2) / 7);
    const radius = 34 + (index % 3) * 18 + Math.sin(pulse + index) * 5;

    return {
      x: pointer.x + Math.cos(angle) * radius,
      y: pointer.y + Math.sin(angle) * radius,
      size: index === 0 ? 2.8 : 2,
    };
  });

  ctx.save();
  ctx.lineWidth = 1.15;

  nodes.forEach((node, index) => {
    const distanceToPointer = Math.hypot(node.x - pointer.x, node.y - pointer.y);
    const opacity = Math.max(0.16, 0.72 - distanceToPointer / 130);

    ctx.beginPath();
    ctx.moveTo(pointer.x, pointer.y);
    ctx.lineTo(node.x, node.y);
    ctx.strokeStyle = `rgba(95, 231, 255, ${opacity * 0.34})`;
    ctx.stroke();

    for (let next = index + 1; next < nodes.length; next += 1) {
      const other = nodes[next];
      const distance = Math.hypot(node.x - other.x, node.y - other.y);

      if (distance < 75) {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(other.x, other.y);
        ctx.strokeStyle = `rgba(95, 231, 255, ${0.24 * (1 - distance / 75)})`;
        ctx.stroke();
      }
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(95, 231, 255, ${opacity})`;
    ctx.shadowColor = "rgba(95, 231, 255, 0.55)";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  ctx.beginPath();
  ctx.arc(pointer.x, pointer.y, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(95, 231, 255, 0.9)";
  ctx.shadowColor = "rgba(95, 231, 255, 0.75)";
  ctx.shadowBlur = 14;
  ctx.fill();
  ctx.restore();
}

resizeCanvas();
drawParticles();
window.addEventListener("resize", resizeCanvas);
