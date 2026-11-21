(() => {
  const S = window.SITE_CONFIG;
  const C = window.CHAIN_CONFIG;
  const $ = (id) => document.getElementById(id);
  const show = (el, on = true) => el.classList.toggle("hidden", !on);
  const CONSENT_KEY = "consent.v1";

  const CHAINS = {
    8453: { name: "Base", rpc: "https://mainnet.base.org", explorer: "https://basescan.org", explorerName: "BaseScan",
      add: { chainName: "Base", rpcUrls: ["https://mainnet.base.org"], blockExplorerUrls: ["https://basescan.org"], nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 } } },
    56: { name: "BNB Chain", rpc: "https://bsc-dataseed.binance.org", explorer: "https://bscscan.com", explorerName: "BscScan",
      add: { chainName: "BNB Smart Chain", rpcUrls: ["https://bsc-dataseed.binance.org"], blockExplorerUrls: ["https://bscscan.com"], nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 } } },
    1: { name: "Ethereum", rpc: "https://ethereum-rpc.publicnode.com", explorer: "https://etherscan.io", explorerName: "Etherscan" },
    11155111: { name: "Sepolia 테스트넷", rpc: "https://ethereum-sepolia-rpc.publicnode.com", explorer: "https://sepolia.etherscan.io", explorerName: "Etherscan" },
    31337: { name: "로컬 테스트", rpc: "http://127.0.0.1:8545", explorer: "", explorerName: "" },
  };
  const chain = C ? CHAINS[C.chainId] : null;

  const state = { selected: null, account: null, claimed: false, myChoice: null, per: null, symbol: S.symbol, votes: [0, 0, 0, 0, 0], dropTotal: null };

  // ---- 공통 ----
  let toastTimer;
  function toast(text) {
    const t = $("toast");
    t.textContent = text; show(t, true);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => show(t, false), 2600);
  }
  function msg(kind, html) { const m = $("claimMsg"); m.className = `msg ${kind}`; m.innerHTML = html; }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const whole = (wei) => Number(ethers.formatUnits(wei, 18));
  const fmt = (wei) => whole(wei).toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
  // 안내 확인 여부는 브라우저에 저장하지 않음 → 방문할 때마다 안내창이 떠요
  let consentGiven = false;
  const consented = () => consentGiven;
  try { localStorage.removeItem(CONSENT_KEY); } catch {}

  function friendlyError(err) {
    const code = err?.code ?? err?.info?.error?.code;
    const text = `${err?.shortMessage || ""} ${err?.message || ""} ${err?.data?.message || ""}`;
    if (code === 4001 || code === "ACTION_REJECTED") return "지갑에서 취소했어요.";
    if (/AlreadyClaimed/.test(text)) return "이미 받은 지갑이에요. 지갑 하나당 한 번만 받을 수 있어요.";
    if (/AirdropEmpty/.test(text)) return "아쉽지만 에어드랍 수량이 모두 소진됐어요.";
    if (code === "INSUFFICIENT_FUNDS" || /insufficient funds/i.test(text)) return "수수료로 쓸 ETH가 부족해요. Base 네트워크의 ETH를 조금 넣어 주세요.";
    if (code === -32002) return "지갑에 처리 중인 요청이 있어요. 지갑 화면을 확인해 주세요.";
    return err?.shortMessage || err?.message || String(err);
  }

  // ---- 텍스트 ----
  document.querySelectorAll("[data-bind]").forEach((el) => { el.textContent = S[el.dataset.bind] ?? ""; });
  document.title = `${S.brand} · ${S.brandEn}`;
  if (!S.notice) show($("notice"), false);
  $("introText").innerHTML = (S.intro || []).map((p) => `<p>${esc(p)}</p>`).join("");
  if (S.contact) $("footerContact").innerHTML = `문의 · 권리 침해 신고: <a href="${/^https?:|^mailto:/.test(S.contact) ? esc(S.contact) : "mailto:" + esc(S.contact)}">${esc(S.contact)}</a>`;

  // 마퀴
  const words = [S.brand, "FREE AIRDROP", "비공식 개인 프로젝트", "NOT AN INVESTMENT", "다섯 개의 빛", "NOT AFFILIATED", ...S.characters.map((c) => c.en)];
  const line = words.map((w) => `<span>${esc(w)}</span><b>✦</b>`).join("");
  $("marquee").innerHTML = line + line;

  // 고지사항
  const legal = window.buildLegal(S);
  $("legalBody").innerHTML = legal.sections.map(([title, body], i) =>
    `<details${i < 2 ? " open" : ""}><summary>${esc(title)}</summary><div>${body}</div></details>`).join("");
  $("consentList").innerHTML = legal.consent.map((c) => `<li>${c}</li>`).join("");

  // ---- 캐릭터 카드 ----
  const cardsEl = $("cards");
  S.characters.forEach((c, i) => {
    const b = document.createElement("button");
    b.className = "card reveal";
    b.type = "button";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", "false");
    b.style.setProperty("--c", c.color);
    b.innerHTML = `
      <span class="badge">내가 고른 빛</span>
      <div class="card-img-wrap"><img class="card-img" src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy"></div>
      <div class="card-body">
        <div class="card-name">${esc(c.name)}</div>
        <div class="card-en">${esc(c.en)}</div>
        <p class="card-desc">${esc(c.desc)}</p>
        <div class="vote"><span>득표</span><span><b data-votes>0</b>표 · <span data-pct>0</span>%</span></div>
        <div class="bar"><i></i></div>
      </div>`;
    b.onclick = () => select(i);
    FX.tilt(b);
    cardsEl.appendChild(b);
  });
  const cards = [...cardsEl.children];

  function select(i) {
    if (state.claimed) return;
    state.selected = i;
    cards.forEach((c, j) => c.setAttribute("aria-checked", String(j === i)));
    updateClaimButton();
  }

  function renderVotes() {
    const total = state.votes.reduce((a, b) => a + b, 0);
    cards.forEach((c, i) => {
      const v = state.votes[i];
      const pct = total ? Math.round((v / total) * 100) : 0;
      FX.count(c.querySelector("[data-votes]"), v);
      c.querySelector("[data-pct]").textContent = pct;
      c.querySelector(".bar > i").style.width = `${pct}%`;
      c.classList.toggle("mine", state.myChoice === i);
      c.disabled = state.claimed;
    });
  }

  function updateClaimButton() {
    const btn = $("claimBtn");
    if (!C) { btn.disabled = true; btn.textContent = "에어드랍 준비 중이에요"; $("claimHint").textContent = "곧 시작돼요. 조금만 기다려 주세요 ✦"; return; }
    if (state.claimed) {
      btn.disabled = true;
      btn.textContent = "이 지갑은 이미 받았어요 ✓";
      $("claimHint").textContent = `연결된 지갑 ${short(state.account)}은(는) ${S.characters[state.myChoice]?.name ?? ""} 빛을 골라 이미 받았어요. 지갑 하나당 한 번만 받을 수 있어요. 다른 지갑으로 받으려면 지갑 앱에서 계정을 바꿔 주세요.`;
      return;
    }
    if (state.selected === null) { btn.disabled = true; btn.textContent = "빛을 골라 주세요"; $("claimHint").textContent = "빛을 하나 고른 뒤 아래 버튼을 눌러 주세요."; return; }
    const name = S.characters[state.selected].name;
    btn.disabled = false;
    btn.textContent = state.account ? `✦ ${name}(으)로 받기` : `✦ 지갑 연결하고 ${name}(으)로 받기`;
    $("claimHint").textContent = `${name}을(를) 골랐어요.`;
  }

  // ---- 체인 데이터 (지갑 없이도 읽기) ----
  const reader = chain ? new ethers.JsonRpcProvider(chain.rpc, C.chainId, { staticNetwork: true }) : null;
  const tokenR = reader ? new ethers.Contract(C.tokenAddress, window.TOKEN_ABI, reader) : null;
  const dropR = reader ? new ethers.Contract(C.airdropAddress, window.AIRDROP_ABI, reader) : null;

  async function loadChainData() {
    if (!C || !chain) {
      $("tAddr").textContent = "아직 설정되지 않았어요";
      show($("explorerLink"), false);
      updateClaimButton();
      return;
    }
    $("tAddr").textContent = C.tokenAddress;
    $("tNet").textContent = chain.name;
    if (chain.explorer) {
      $("explorerLink").href = `${chain.explorer}/token/${C.tokenAddress}`;
      $("explorerLink").textContent = `${chain.explorerName}에서 보기 ↗`;
    } else show($("explorerLink"), false);

    try {
      const [name, symbol, supply] = await Promise.all([tokenR.name(), tokenR.symbol(), tokenR.totalSupply()]);
      state.symbol = symbol;
      $("tName").textContent = name;
      $("tSymbol").textContent = symbol;
      $("tSupply").textContent = `${fmt(supply)} ${symbol}`;
    } catch { $("tName").textContent = "불러오지 못했어요"; }
    await loadAirdrop();
  }

  async function loadAirdrop() {
    if (!dropR) return;
    try {
      const [per, votes, total, left] = await Promise.all([dropR.amountPerClaim(), dropR.getVotes(), dropR.totalClaims(), dropR.remaining()]);
      state.per = per;
      state.votes = votes.map(Number);
      $("perClaim").textContent = fmt(per);
      $("perClaim2").textContent = fmt(per);
      FX.count($("totalClaims"), Number(total), "명");
      $("remaining").textContent = fmt(left);
      // 진행률: 나눠 준 양 / (나눠 준 양 + 남은 양)
      const given = per * total;
      const all = given + left;
      $("dropProgress").style.width = all > 0n ? `${Number((given * 1000n) / all) / 10}%` : "0";
      if (left < per && !state.claimed) msg("info", "에어드랍 수량이 모두 소진됐어요. 참여해 주셔서 감사합니다!");
      if (state.account) {
        state.claimed = await dropR.claimed(state.account);
        if (state.claimed) state.myChoice = Number(await dropR.choiceOf(state.account));
      }
      renderVotes();
      updateClaimButton();
    } catch (e) {
      console.error(e);
    }
  }

  // ---- 지갑 ----
  const hasWallet = () => !!window.ethereum;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  // 휴대폰: 지갑 앱 안의 브라우저로 이 페이지 열기
  function walletLink(w) {
    const url = location.href.split("#")[0];
    const bare = url.replace(/^https?:\/\//, "");
    const enc = encodeURIComponent(url);
    return {
      metamask: `https://metamask.app.link/dapp/${bare}`,
      trust: `https://link.trustwallet.com/open_url?coin_id=60&url=${enc}`,
      coinbase: `https://go.cb-w.com/dapp?cb_url=${enc}`,
      okx: `okx://wallet/dapp/url?dappUrl=${enc}`,
    }[w];
  }
  function openWalletSheet() { show($("walletSheet"), true); }
  document.querySelectorAll("[data-wallet]").forEach((a) => { a.href = walletLink(a.dataset.wallet); a.rel = "noopener"; });
  $("walletClose").onclick = () => show($("walletSheet"), false);
  $("exodusBtn").onclick = () => { const g = $("exodusGuide"); show(g, g.classList.contains("hidden")); g.scrollIntoView({ behavior: "smooth", block: "nearest" }); };
  $("exodusCopy").onclick = () => $("copyLink").click();
  $("walletSheet").onclick = (e) => { if (e.target.id === "walletSheet") show($("walletSheet"), false); };
  $("copyLink").onclick = async () => {
    try { await navigator.clipboard.writeText(location.href.split("#")[0]); toast("링크를 복사했어요. 지갑 앱 브라우저에 붙여 넣어 주세요."); }
    catch { prompt("아래 링크를 복사해 주세요", location.href.split("#")[0]); }
  };

  async function connect() {
    if (!hasWallet()) {
      if (isMobile) { openWalletSheet(); return null; }
      msg("err", '브라우저 지갑이 필요해요. <a href="https://metamask.io/download/" target="_blank" rel="noopener">MetaMask</a>, <a href="https://www.coinbase.com/wallet/downloads" target="_blank" rel="noopener">Coinbase Wallet</a>, <a href="https://rabby.io/" target="_blank" rel="noopener">Rabby</a> 같은 확장 프로그램을 설치한 뒤 새로고침해 주세요.');
      return null;
    }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    setAccount(accounts[0]);
    return accounts[0];
  }

  function setAccount(a) {
    state.account = a || null;
    $("navWallet").textContent = state.account ? short(state.account) : "지갑 연결";
    state.claimed = false; state.myChoice = null;
    if (C) loadAirdrop(); else updateClaimButton();
  }

  async function ensureChain() {
    const want = "0x" + C.chainId.toString(16);
    const cur = await window.ethereum.request({ method: "eth_chainId" });
    if (cur.toLowerCase() === want) return;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: want }] });
    } catch (e) {
      const code = e?.code ?? e?.data?.originalError?.code;
      if (code === 4902 && chain.add) await window.ethereum.request({ method: "wallet_addEthereumChain", params: [{ chainId: want, ...chain.add }] });
      else throw e;
    }
  }

  async function claim() {
    const btn = $("claimBtn");
    if (state.selected === null || !C) return;
    if (!consented()) { openConsent(); return; }
    try {
      btn.disabled = true;
      if (!state.account && !(await connect())) { updateClaimButton(); return; }
      if (await dropR.claimed(state.account)) { await loadAirdrop(); msg("info", "이 지갑은 이미 받았어요."); return; }
      msg("info", `${esc(chain.name)} 네트워크로 전환하는 중…`);
      await ensureChain();
      const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
      const drop = new ethers.Contract(C.airdropAddress, window.AIRDROP_ABI, signer);
      msg("info", "지갑 창에서 <b>확인</b>을 눌러 주세요.");
      const tx = await drop.claim(state.selected);
      msg("info", "전송 중이에요… 잠시만 기다려 주세요 ✦");
      await tx.wait();
      const name = S.characters[state.selected].name;
      const link = chain.explorer ? ` <a href="${chain.explorer}/tx/${tx.hash}" target="_blank" rel="noopener">거래 보기 ↗</a>` : "";
      msg("ok", `🎉 ${esc(name)}에 한 표! ${state.per ? fmt(state.per) : ""} ${esc(state.symbol)}이(가) 도착했어요.${link}<br><button class="btn btn-ghost btn-sm" data-action="watch" style="margin-top:10px">지갑에 토큰 추가</button>`);
      FX.confetti();
      bindWatchButtons();
      await loadAirdrop();
    } catch (e) {
      msg("err", esc(friendlyError(e)));
      updateClaimButton();
    }
  }

  async function watchAsset() {
    if (!C) { toast("아직 토큰이 설정되지 않았어요."); return; }
    if (!hasWallet()) { if (isMobile) openWalletSheet(); else toast("브라우저 지갑(MetaMask 등)이 필요해요."); return; }
    try {
      await ensureChain();
      await window.ethereum.request({
        method: "wallet_watchAsset",
        params: { type: "ERC20", options: { address: C.tokenAddress, symbol: state.symbol.slice(0, 11), decimals: 18, image: new URL("logo.svg", location.href).href } },
      });
    } catch (e) { toast(friendlyError(e)); }
  }
  function bindWatchButtons() { document.querySelectorAll('[data-action="watch"]').forEach((b) => (b.onclick = watchAsset)); }

  // ---- 첫 방문 고지 ----
  function openConsent() {
    show($("consent"), true);
    $("consentCheck").checked = false;
    $("consentBtn").disabled = true;
  }
  $("consentCheck").onchange = () => { $("consentBtn").disabled = !$("consentCheck").checked; };
  $("consentBtn").onclick = () => {
    consentGiven = true;
    show($("consent"), false);
    Player.play();
  };

  // ---- 시작 ----
  FX.stars(); FX.cursor(); FX.nav();
  $("claimBtn").onclick = claim;
  $("navWallet").onclick = () => connect().catch((e) => toast(friendlyError(e)));
  $("copyAddr").onclick = async () => {
    if (!C) return;
    try { await navigator.clipboard.writeText(C.tokenAddress); toast("계약 주소를 복사했어요"); } catch {}
  };
  bindWatchButtons();
  renderVotes();
  updateClaimButton();
  Player.init();

  window.addEventListener("load", () => {
    setTimeout(() => {
      $("loader").classList.add("done");
      FX.splitText(document.querySelector(".hero h1 .ko"));
      FX.reveal();
      if (!consented()) openConsent();
    }, FX.reduce ? 0 : 700);
  });

  if (hasWallet()) {
    window.ethereum.request({ method: "eth_accounts" }).then((a) => a[0] && setAccount(a[0])).catch(() => {});
    window.ethereum.on?.("accountsChanged", (a) => setAccount(a[0]));
  }
  loadChainData();
  if (C) setInterval(() => { if (!document.hidden) loadAirdrop(); }, 20000);
})();
