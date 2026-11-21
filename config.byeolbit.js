// ===== (예비) 별빛 버전 설정 — 쓰려면 이 파일 내용을 config.js 에 붙여 넣으세요
// ===== 사이트 설정 (여기만 고치면 됩니다) =====
// 이름·문구·캐릭터는 자유롭게 바꿔도 됩니다.
// 계약 주소는 chain-config.js 에 따로 저장됩니다 (발행 도구가 자동으로 저장).
window.SITE_CONFIG = {
  brand: "별빛",
  brandEn: "BYEOLBIT",
  symbol: "BYEOL",
  tagline: "다섯 개의 빛이 모여, 하나의 별이 됩니다",
  intro: [
    "별빛(BYEOL)은 Base 네트워크 위에서 태어난 작은 커뮤니티 토큰입니다.",
    "밤하늘을 밝히는 다섯 개의 빛 중 마음에 드는 빛을 골라 주세요. 고른 빛에 한 표가 더해지고, 토큰이 선물로 도착합니다.",
  ],
  notice: "",
  footer: "별빛(BYEOL)은 재미로 만든 커뮤니티 토큰이며 투자 상품이 아닙니다.\n어떠한 가치나 수익도 보장하지 않으며, 특정 아티스트·기업·단체와 관련이 없습니다.",
  // 에어드랍 캐릭터 5개 (순서 = 계약의 선택 번호 0~4, 바꾸지 마세요)
  // image 에 직접 만든 그림 파일 경로를 넣으면 교체됩니다 (예: "img/my-art.png")
  characters: [
    { name: "달빛", en: "MOONLIGHT", image: "img/moon.svg", color: "#b8a9e8", desc: "고요한 밤, 조용히 곁을 지켜 주는 은빛." },
    { name: "햇살", en: "SUNBEAM", image: "img/sun.svg", color: "#ffc27a", desc: "아침마다 가장 먼저 인사하는 따뜻한 금빛." },
    { name: "물결", en: "RIPPLE", image: "img/wave.svg", color: "#7fd8f0", desc: "맑은 바다처럼 시원하게 반짝이는 푸른빛." },
    { name: "꽃잎", en: "PETAL", image: "img/flower.svg", color: "#f39ac4", desc: "봄바람에 흩날리는 설렘 가득한 분홍빛." },
    { name: "밤하늘", en: "NIGHTSKY", image: "img/night.svg", color: "#9b7fe0", desc: "수많은 별을 품은 깊고 신비로운 보랏빛." },
  ],
};
