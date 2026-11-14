// YouBike 風格小元素（自繪 SVG，非官方商標）＋ 楓之谷主題彩蛋 SVG 圖騰與 LEVEL UP 特效
// 單車：低跨式車架 + 前置車籃，wheel 群組可加上 .spin 轉動
import { APP } from './config.js';
import { toMin } from './utils.js';

const wheel = (cx, cy) => `
  <g class="yb-wheel" style="transform-origin:${cx}px ${cy}px">
    <circle cx="${cx}" cy="${cy}" r="10" fill="none" stroke="var(--yb-ink)" stroke-width="2.6"/>
    <path d="M${cx - 10} ${cy}H${cx + 10}M${cx} ${cy - 10}V${cy + 10}M${cx - 7} ${cy - 7}L${cx + 7} ${cy + 7}M${cx - 7} ${cy + 7}L${cx + 7} ${cy - 7}"
      stroke="var(--yb-ink)" stroke-width="1" opacity=".45"/>
    <circle cx="${cx}" cy="${cy}" r="2" fill="var(--yb-ink)"/>
  </g>`;

/** 楓之谷經典吉祥物 SVG（菇菇寶貝 Orange Mushroom / 紅楓葉 Maple Leaf / 綠水靈 Slime / 雪吉拉 Yeti / 皮卡啾 Pink Bean / 楓幣 Meso） */
export function mapleMushroomSvg(size = 24, cls = '') {
  return `<svg class="maple-sprite mushroom ${cls}" width="${size}" height="${size}" viewBox="0 0 36 36" aria-hidden="true">
    <!-- 菇菇寶貝米白身體 -->
    <path d="M10 21 C9 29 12 33 18 33 C24 33 27 29 26 21 Z" fill="#FFF3D6" stroke="#4A2508" stroke-width="2" stroke-linejoin="round"/>
    <!-- 可愛眨眼與腮紅 -->
    <circle cx="14.5" cy="26.5" r="1.5" fill="#2A1505"/>
    <circle cx="21.5" cy="26.5" r="1.5" fill="#2A1505"/>
    <ellipse cx="12" cy="28" rx="1.8" ry="1" fill="#FF8A65" opacity=".75"/>
    <ellipse cx="24" cy="28" rx="1.8" ry="1" fill="#FF8A65" opacity=".75"/>
    <path d="M16.5 28.5 Q18 30 19.5 28.5" fill="none" stroke="#4A2508" stroke-width="1.4" stroke-linecap="round"/>
    <!-- 經典亮橘色香菇傘帽 -->
    <path d="M4 21 C3 10 10 4 18 4 C26 4 33 10 32 21 C26 23 10 23 4 21 Z" fill="url(#msCapGrad)" stroke="#4A2508" stroke-width="2" stroke-linejoin="round"/>
    <defs>
      <linearGradient id="msCapGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FF9E22"/>
        <stop offset="65%" stop-color="#FF6600"/>
        <stop offset="100%" stop-color="#D94600"/>
      </linearGradient>
    </defs>
    <!-- 菇菇傘帽上的奶油黃圓斑點 -->
    <ellipse cx="11" cy="14" rx="3.4" ry="2.6" transform="rotate(-18 11 14)" fill="#FFE066" stroke="#B45309" stroke-width="0.9"/>
    <circle cx="19" cy="10" r="2.8" fill="#FFE066" stroke="#B45309" stroke-width="0.9"/>
    <ellipse cx="25.5" cy="15" rx="3.2" ry="2.4" transform="rotate(20 25.5 15)" fill="#FFE066" stroke="#B45309" stroke-width="0.9"/>
  </svg>`;
}

export function mapleLeafSvg(size = 20, cls = '') {
  return `<svg class="maple-sprite leaf ${cls}" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M16 2 L19 9 L25 6 L22 13 L29 15 L23 19 L25 24 L17.5 22.5 L17.5 30 L14.5 30 L14.5 22.5 L7 24 L9 19 L3 15 L10 13 L7 6 L13 9 Z"
      fill="#EE2211" stroke="#6B0F08" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M16 7 L16 23 M16 16 L10 12 M16 16 L22 12" stroke="#FFAA44" stroke-width="1.1" stroke-linecap="round" opacity=".8"/>
  </svg>`;
}

export function mapleSlimeSvg(size = 22, cls = '') {
  return `<svg class="maple-sprite slime ${cls}" width="${size}" height="${size}" viewBox="0 0 36 36" aria-hidden="true">
    <!-- 綠水靈頭頂彈性觸角與水珠 -->
    <path d="M18 9 Q19 3 25 4" fill="none" stroke="#1E5E12" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="26" cy="4.5" r="2.6" fill="#76FF4B" stroke="#1E5E12" stroke-width="1.5"/>
    <!-- Q彈水滴綠身體 -->
    <path d="M6 25 C5 15 11 10 18 10 C25 10 31 15 30 25 C30 30 25 32 18 32 C11 32 6 30 6 25 Z" fill="#55DD22" stroke="#1E5E12" stroke-width="2"/>
    <ellipse cx="13" cy="16" rx="4" ry="2" transform="rotate(-20 13 16)" fill="#B8FF88" opacity=".85"/>
    <circle cx="14" cy="23" r="1.6" fill="#0F2E09"/>
    <circle cx="22" cy="23" r="1.6" fill="#0F2E09"/>
    <path d="M16 25.5 Q18 27.5 20 25.5" fill="none" stroke="#0F2E09" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`;
}

export function mapleMesoSvg(size = 18, cls = '') {
  return `<svg class="maple-sprite meso ${cls}" width="${size}" height="${size}" viewBox="0 0 28 28" aria-hidden="true">
    <circle cx="14" cy="14" r="11" fill="#FFD700" stroke="#92400E" stroke-width="2"/>
    <circle cx="14" cy="14" r="8" fill="none" stroke="#F59E0B" stroke-width="1.2"/>
    <rect x="12" y="8" width="4" height="12" rx="1" fill="#FFFBEB" stroke="#B45309" stroke-width="1"/>
  </svg>`;
}

/** 一台小黃單車 (YouBike 2.0 經典款：珍珠白車架、亮黃色後泥除擋泥板、車籃、黑色輪圈；在楓之谷主題下車籃坐著一隻小菇菇寶貝！) */
export function bike(size = 28, { spin = false, cls = '' } = {}) {
  return `<svg class="yb-bike ${spin ? 'spin' : ''} ${cls}" width="${size}" height="${Math.round(size * 0.66)}" viewBox="0 0 68 44" aria-hidden="true">
    <!-- 車輪 (輪徑 R=10, 軸心 (15, 31) 與 (53, 31)) -->
    ${wheel(15, 31)}${wheel(53, 31)}

    <!-- YouBike 2.0 標誌性亮黃色後擋泥板 (實體為大片黃色包覆後輪上半部) -->
    <path class="yb-fender" d="M 4 31 A 11 11 0 0 1 25 24 L 23 27 A 8 8 0 0 0 6.5 31 Z" fill="#ffc400" stroke="#f59e0b" stroke-width="0.8"/>
    <!-- 後泥除固定支架 -->
    <path d="M 15 31 L 5 31 M 15 31 L 8 24" fill="none" stroke="#334155" stroke-width="1.2" stroke-linecap="round"/>

    <!-- 前輪短泥除 -->
    <path class="yb-fender-front" d="M 47 24 A 10 10 0 0 1 56 22" fill="none" stroke="#ffc400" stroke-width="2.2" stroke-linecap="round"/>

    <!-- 車架：YouBike 2.0 經典白色/金屬亮面低跨主樑與黃色飾板 -->
    <!-- 後下叉與後上叉 -->
    <path d="M 15 31 L 32 31 L 26 14 Z" fill="none" stroke="#e2e8f0" stroke-width="3.4" stroke-linejoin="round"/>
    <path d="M 15 31 L 26 14" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>
    <!-- U型低跨下管 (YouBike 2.0 招牌彎管) -->
    <path class="yb-tube-accent" d="M 32 31 Q 40 30 45 13" fill="none" stroke="#ffc400" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M 32 31 Q 40 30 45 13" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
    
    <!-- 前叉與龍頭立管 -->
    <path d="M 45 13 L 53 31" stroke="#e2e8f0" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M 45 13 L 43 7 H 48" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- 坐墊 -->
    <path d="M 26 14 L 26 10" stroke="#1e293b" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M 21 10 Q 26 9 31 10 Q 29 13 25 13 Q 22 13 21 10 Z" fill="#1e293b"/>

    <!-- 楓之谷主題專屬彩蛋：坐在單車上的 Q 版菇菇寶貝 (僅在 data-theme="maple" 時顯示) -->
    <g class="maple-rider-sprite" style="display:none">
      <path d="M 21 9 C 21 3 31 3 31 9 Z" fill="#FF6600" stroke="#4A2508" stroke-width="1.3"/>
      <circle cx="24.5" cy="6" r="1.3" fill="#FFE066"/>
      <circle cx="28" cy="6.5" r="1.2" fill="#FFE066"/>
      <ellipse cx="26" cy="10" rx="3.5" ry="2" fill="#FFF3D6" stroke="#4A2508" stroke-width="1"/>
    </g>

    <!-- 車頭置物籃 (YouBike 標誌黑色網籃) -->
    <rect x="49" y="10" width="14" height="9" rx="2" fill="#ffffff" stroke="#1e293b" stroke-width="1.8"/>
    <path d="M 53 10 v 9 M 57 10 v 9 M 61 10 v 9 M 49 14.5 h 14" stroke="#1e293b" stroke-width="0.9" opacity=".5"/>
  </svg>`;
}

/** 單一輪子（載入中轉圈用） */
export function wheelSpinner(size = 40) {
  return `<svg class="yb-bike spin" width="${size}" height="${size}" viewBox="1 18 24 24" aria-hidden="true">${wheel(13, 30)}</svg>`;
}

/** 站點柱（在站／停車） */
export function dock(size = 14) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true">
    <rect x="1" y="1" width="14" height="14" rx="3.5" fill="var(--yb)"/>
    <path d="M5.5 12V4h3a2.3 2.3 0 0 1 0 4.6h-3" fill="none" stroke="var(--yb-ink)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/** 今日騎行進度：上班 → 午休 → 下班（時間取自 config.js 的 APP.periods；楓之谷主題下自動顯示 EXP 經驗值條與吉祥物） */
export function rideBar(now) {
  const [amS, amE] = APP.periods.am, [pmS, pmE] = APP.periods.pm;
  const S = toMin(amS), L1 = toMin(amE), L2 = toMin(pmS), E = toMin(pmE);
  const pct = Math.max(0, Math.min(1, (now - S) / (E - S))) * 100;
  const pctFixed = pct.toFixed(2);
  let msg;
  if (now < S) msg = `還沒出發，<b>${amS}</b> 準時發車`;
  else if (now >= E) msg = `已抵達終點站，<b>下班囉！</b>騎車小心 `;
  else if (now >= L1 && now < L2) msg = `午休補給站 <b>${pmS}</b> 再出發`;
  else {
    const left = E - now;
    msg = `距離下班站還有 <b>${Math.floor(left / 60)} 小時 ${left % 60} 分</b>`;
  }
  const stop = (t, label) => {
    const p = ((t - S) / (E - S)) * 100;
    return `<span class="rb-stop ${now >= t ? 'passed' : ''}" style="left:${p}%"><i></i><em>${label}</em></span>`;
  };
  return `
    <div class="ridebar">
      <div class="rb-head-row">
        <div class="rb-msg">${msg}</div>
        <div class="maple-exp-hud" title="楓之谷經典狀態列：今日工時經驗值 EXP">
          <span class="maple-lv-pill">LV.200 經營遠征隊</span>
          <span class="maple-hp-pill">HP 100%</span>
          <span class="maple-mp-pill">MP 100%</span>
          <span class="maple-exp-pill">EXP [${pctFixed}%]</span>
        </div>
      </div>
      <div class="rb-track">
        <div class="rb-done" style="width:${pct}%"></div>
        <div class="maple-exp-segments" aria-hidden="true"></div>
        ${stop(S, `${amS} 上班`)}${stop(L1, `${amE} 午休`)}${stop(L2, pmS)}${stop(E, `${pmE} 下班`)}
        <span class="rb-rider" style="left:${pct}%">
          ${bike(34, { spin: now > S && now < E })}
          <span class="maple-rider-pet">${mapleMushroomSvg(22)}</span>
        </span>
      </div>
    </div>`;
}

/**
 * 楓之谷主題專屬：當使用者在「楓之谷主題 (data-theme="maple")」完成每日回報或任務時，
 * 於畫面中央綻放經典金黃色光柱與「LEVEL UP!」像素立體浮動特效（1.9秒後自動淡出，完全不阻擋點擊）
 */
export function triggerMapleLevelUpEffect(subText = '每日任務完成！EXP +100% ＆ 楓幣 +50,000') {
  if (document.documentElement.getAttribute('data-theme') !== 'maple') return;
  const old = document.getElementById('maple-levelup-fx');
  if (old) old.remove();
  const wrap = document.createElement('div');
  wrap.id = 'maple-levelup-fx';
  wrap.className = 'maple-levelup-overlay';
  wrap.innerHTML = `
    <div class="maple-lu-beam"></div>
    <div class="maple-lu-card">
      <div class="maple-lu-sprites">
        ${mapleLeafSvg(28)}
        ${mapleMushroomSvg(38)}
        ${mapleSlimeSvg(32)}
      </div>
      <div class="maple-lu-title">LEVEL UP!</div>
      <div class="maple-lu-sub">${subText}</div>
    </div>
  `;
  document.body.appendChild(wrap);
  setTimeout(() => {
    wrap.classList.add('fade-out');
    setTimeout(() => wrap.remove(), 450);
  }, 1900);
}
