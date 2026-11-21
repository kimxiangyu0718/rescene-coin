// 하단 음악 플레이어 (재생 목록은 music.json — 관리자 페이지에서 편집)
window.Player = (() => {
  const $ = (id) => document.getElementById(id);
  const audio = $("audio");
  const ui = { root: $("player"), play: $("pPlay"), prev: $("pPrev"), next: $("pNext"), mute: $("pMute"), vol: $("pVol"),
    title: $("pTitle"), artist: $("pArtist"), time: $("pTime"), bar: $("pProgress"), fill: $("pProgressFill"), listBtn: $("pListBtn"), list: $("pList") };
  let tracks = [], idx = 0, cfg = { autoplay: true, volume: 0.5 }, wantPlay = false;

  const store = {
    // 브라우저에 아무것도 저장하지 않음 (페이지를 닫으면 모두 사라짐)
    mem: {},
    get(k, d) { return k in this.mem ? this.mem[k] : d; },
    set(k, v) { this.mem[k] = v; },
  };
  const t2s = (t) => (isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}` : "0:00");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function load(i, autoplay) {
    if (!tracks.length) return;
    idx = (i + tracks.length) % tracks.length;
    const t = tracks[idx];
    audio.src = t.src;
    ui.title.textContent = t.title || "제목 없음";
    ui.artist.textContent = t.artist || "";
    store.set("idx", idx);
    renderList();
    if (autoplay) play();
  }

  async function play() {
    wantPlay = true;
    try { await audio.play(); } catch { /* 브라우저가 자동 재생을 막으면 첫 클릭 때 재생 */ }
  }
  function pause() { wantPlay = false; audio.pause(); }
  function toggle() { audio.paused ? play() : pause(); }

  function renderList() {
    ui.list.innerHTML = tracks.map((t, i) =>
      `<li data-i="${i}" class="${i === idx ? "active" : ""}"><span class="n">${i === idx && !audio.paused ? "♪" : i + 1}</span><span>${esc(t.title || "제목 없음")}</span><span class="a">${esc(t.artist || "")}</span></li>`).join("");
  }

  // persist=true 일 때만 저장 (방문자가 직접 슬라이더를 움직였을 때)
  function setVol(v, persist = false) {
    audio.volume = v; ui.vol.value = v;
    if (persist) store.set("vol", v);
    ui.mute.textContent = audio.muted || v === 0 ? "🔇" : v < 0.5 ? "🔉" : "🔊";
  }

  // 이벤트
  audio.addEventListener("play", () => { ui.root.classList.add("playing"); ui.play.textContent = "❚❚"; ui.play.setAttribute("aria-label", "일시정지"); renderList(); });
  audio.addEventListener("pause", () => { ui.root.classList.remove("playing"); ui.play.textContent = "▶"; ui.play.setAttribute("aria-label", "재생"); renderList(); });
  audio.addEventListener("ended", () => load(idx + 1, true));
  audio.addEventListener("timeupdate", () => {
    ui.fill.style.width = audio.duration ? `${(audio.currentTime / audio.duration) * 100}%` : "0";
    ui.time.textContent = `${t2s(audio.currentTime)} / ${t2s(audio.duration)}`;
  });
  audio.addEventListener("error", () => { ui.artist.textContent = "재생할 수 없는 파일이에요"; });
  ui.play.onclick = toggle;
  ui.prev.onclick = () => load(audio.currentTime > 3 ? idx : idx - 1, true);
  ui.next.onclick = () => load(idx + 1, true);
  ui.vol.oninput = () => { audio.muted = false; store.set("muted", false); setVol(Number(ui.vol.value), true); };
  ui.mute.onclick = () => { audio.muted = !audio.muted; store.set("muted", audio.muted); setVol(audio.volume); };
  ui.listBtn.onclick = () => ui.list.classList.toggle("hidden");
  ui.list.onclick = (e) => { const li = e.target.closest("li"); if (li) load(Number(li.dataset.i), true); };
  function seek(e) {
    const r = ui.bar.getBoundingClientRect();
    if (audio.duration) audio.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * audio.duration;
  }
  ui.bar.addEventListener("click", seek);
  ui.bar.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
    if (e.key === "ArrowLeft") audio.currentTime = Math.max(0, audio.currentTime - 5);
  });

  // 첫 상호작용 때 자동 재생 (브라우저 정책)
  function armAutoplay() {
    const go = (e) => {
      if (e.target.closest && e.target.closest("#player")) return; // 플레이어 버튼은 직접 처리
      if (cfg.autoplay && store.get("userPaused", false) === false && audio.paused) play();
      ["pointerdown", "keydown", "touchstart"].forEach((t) => removeEventListener(t, go, true));
    };
    ["pointerdown", "keydown", "touchstart"].forEach((t) => addEventListener(t, go, true));
  }
  ui.play.addEventListener("click", () => store.set("userPaused", audio.paused));

  async function init() {
    try {
      const r = await fetch(`music.json?v=${Date.now()}`, { cache: "no-store" });
      const data = await r.json();
      cfg = { autoplay: data.autoplay !== false, volume: typeof data.volume === "number" ? data.volume : 0.5, shuffle: data.shuffle !== false };
      tracks = (data.tracks || []).filter((t) => t && t.src);
      // 무작위 순서: 방문할 때마다 재생 목록을 섞어서 첫 곡부터 재생
      if (cfg.shuffle) {
        for (let i = tracks.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [tracks[i], tracks[j]] = [tracks[j], tracks[i]]; }
      }
    } catch { tracks = []; }
    if (!tracks.length) { ui.root.classList.add("hidden"); document.body.style.paddingBottom = "0"; return; }
    // 예전 버전이 브라우저에 남긴 값 정리
    try { ["vol", "muted", "idx", "userPaused", "volDefault"].forEach((k) => localStorage.removeItem("player." + k)); } catch {}
    audio.muted = store.get("muted", false);
    setVol(store.get("vol", cfg.volume));
    load(cfg.shuffle ? 0 : Math.min(store.get("idx", 0), tracks.length - 1), false);
    ui.root.classList.add("show");
    if (cfg.autoplay && !store.get("userPaused", false)) { play(); armAutoplay(); }
  }

  return { init, play, pause };
})();
