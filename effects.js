// 화면 효과: 별 배경, 유성, 커서 빛, 스크롤 등장, 카드 기울기, 숫자 애니메이션, 축하 효과
window.FX = (() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- 별 배경 (패럴랙스 + 반짝임 + 유성) ----
  function stars() {
    const cv = document.getElementById("stars");
    const ctx = cv.getContext("2d");
    let w, h, dpr, list = [], shooting = [], mx = 0, my = 0, sy = 0;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.width = innerWidth * dpr; h = cv.height = innerHeight * dpr;
      const count = Math.round((innerWidth * innerHeight) / 5500);
      list = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h, z: Math.random() * 0.8 + 0.2,
        r: (Math.random() * 1.2 + 0.3) * dpr, t: Math.random() * Math.PI * 2, s: Math.random() * 0.02 + 0.005,
        c: ["255,255,255", "217,200,255", "184,241,255", "255,214,240"][Math.floor(Math.random() * 4)],
      }));
    }
    resize();
    addEventListener("resize", resize);
    addEventListener("mousemove", (e) => { mx = (e.clientX / innerWidth - 0.5); my = (e.clientY / innerHeight - 0.5); });
    addEventListener("scroll", () => { sy = scrollY; }, { passive: true });

    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const s of list) {
        s.t += s.s;
        const a = 0.35 + Math.sin(s.t) * 0.35 + 0.3 * s.z;
        let x = s.x - mx * 30 * s.z * dpr;
        let y = (s.y - sy * 0.15 * s.z * dpr - my * 30 * s.z * dpr) % h;
        if (y < 0) y += h;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${s.c},${Math.max(0, Math.min(1, a))})`;
        ctx.arc(x, y, s.r * s.z, 0, Math.PI * 2);
        ctx.fill();
      }
      if (Math.random() < 0.006 && shooting.length < 2) {
        shooting.push({ x: Math.random() * w * 0.7 + w * 0.3, y: Math.random() * h * 0.4, vx: -(6 + Math.random() * 6) * dpr, vy: (2.5 + Math.random() * 2) * dpr, life: 1 });
      }
      shooting = shooting.filter((m) => m.life > 0);
      for (const m of shooting) {
        const g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 14, m.y - m.vy * 14);
        g.addColorStop(0, `rgba(255,255,255,${m.life})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g; ctx.lineWidth = 1.6 * dpr;
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * 14, m.y - m.vy * 14); ctx.stroke();
        m.x += m.vx; m.y += m.vy; m.life -= 0.012;
      }
      requestAnimationFrame(frame);
    }
    if (reduce) { frame(); return; }
    requestAnimationFrame(frame);
  }

  // ---- 커서 빛 ----
  function cursor() {
    const el = document.getElementById("cursorGlow");
    if (reduce || !matchMedia("(hover: hover)").matches) return;
    let x = 0, y = 0, tx = 0, ty = 0;
    addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; el.classList.add("on"); });
    (function loop() { x += (tx - x) * 0.12; y += (ty - y) * 0.12; el.style.transform = `translate(${x}px, ${y}px)`; requestAnimationFrame(loop); })();
  }

  // ---- 스크롤 등장 ----
  function reveal(root = document) {
    const els = root.querySelectorAll(".reveal:not(.in)");
    if (reduce || !("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    // 같은 줄의 요소는 순서대로 조금씩 늦게
    els.forEach((e) => {
      const sib = [...e.parentElement.children].filter((c) => c.classList.contains("reveal"));
      const i = sib.indexOf(e);
      if (i > 0 && !e.style.getPropertyValue("--d")) e.style.setProperty("--d", `${Math.min(i, 6) * 0.08}s`);
      io.observe(e);
    });
  }

  // ---- 제목 글자 하나씩 ----
  function splitText(el) {
    const text = el.textContent;
    el.textContent = "";
    [...text].forEach((ch, i) => {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = ch === " " ? " " : ch;
      s.style.transitionDelay = `${0.25 + i * 0.07}s`;
      el.appendChild(s);
    });
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
  }

  // ---- 카드 3D 기울기 ----
  function tilt(el) {
    if (reduce || !matchMedia("(hover: hover)").matches) return;
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--ry", `${(px - 0.5) * 14}deg`);
      el.style.setProperty("--rx", `${(0.5 - py) * 14}deg`);
      el.style.setProperty("--mx", `${px * 100}%`);
      el.style.setProperty("--my", `${py * 100}%`);
    });
    el.addEventListener("mouseleave", () => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
  }

  // ---- 숫자 올라가기 ----
  function count(el, to, suffix = "") {
    const from = Number(el.dataset.v || 0);
    el.dataset.v = to;
    if (reduce || from === to) { el.textContent = to.toLocaleString("ko-KR") + suffix; return; }
    const t0 = performance.now(), dur = 1200;
    (function step(t) {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e).toLocaleString("ko-KR") + suffix;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }

  // ---- 축하 별가루 ----
  function confetti() {
    if (reduce) return;
    const cv = document.getElementById("confetti");
    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    const colors = ["#ffd6f0", "#d9c8ff", "#b8f1ff", "#fff4c9", "#f39ac4", "#ffffff"];
    const parts = Array.from({ length: 160 }, () => ({
      x: cv.width / 2, y: cv.height * 0.55, vx: (Math.random() - 0.5) * 22 * dpr, vy: (-Math.random() * 20 - 6) * dpr,
      r: (Math.random() * 4 + 2) * dpr, c: colors[Math.floor(Math.random() * colors.length)], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, star: Math.random() < 0.4,
    }));
    let frames = 0;
    (function loop() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const p of parts) {
        p.vy += 0.5 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
        if (p.star) {
          ctx.beginPath();
          for (let i = 0; i < 4; i++) { ctx.lineTo(0, -p.r * 2); ctx.rotate(Math.PI / 4); ctx.lineTo(0, -p.r * 0.6); ctx.rotate(Math.PI / 4); }
          ctx.fill();
        } else ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        ctx.restore();
      }
      if (++frames < 220) requestAnimationFrame(loop); else ctx.clearRect(0, 0, cv.width, cv.height);
    })();
  }

  // ---- 스크롤 시 내비 테두리 ----
  function nav() {
    const n = document.getElementById("nav");
    const on = () => n.classList.toggle("scrolled", scrollY > 10);
    addEventListener("scroll", on, { passive: true }); on();
  }

  return { stars, cursor, reveal, splitText, tilt, count, confetti, nav, reduce };
})();
