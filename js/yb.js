// YouBike 風格小元素（自繪 SVG，非官方商標）
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

/** 一台小黃單車 (YouBike 2.0 經典款：珍珠白車架、亮黃色後泥除擋泥板、車籃、黑色輪圈) */
export function bike(size = 28, { spin = false, cls = '' } = {}) {
  return `<svg class="yb-bike ${spin ? 'spin' : ''} ${cls}" width="${size}" height="${Math.round(size * 0.66)}" viewBox="0 0 68 44" aria-hidden="true">
    <!-- 車輪 (輪徑 R=10, 軸心 (15, 31) 與 (53, 31)) -->
    ${wheel(15, 31)}${wheel(53, 31)}

    <!-- YouBike 2.0 標誌性亮黃色後擋泥板 (實體為大片黃色包覆後輪上半部) -->
    <path d="M 4 31 A 11 11 0 0 1 25 24 L 23 27 A 8 8 0 0 0 6.5 31 Z" fill="#ffc400" stroke="#f59e0b" stroke-width="0.8"/>
    <!-- 後泥除固定支架 -->
    <path d="M 15 31 L 5 31 M 15 31 L 8 24" fill="none" stroke="#334155" stroke-width="1.2" stroke-linecap="round"/>

    <!-- 前輪短泥除 -->
    <path d="M 47 24 A 10 10 0 0 1 56 22" fill="none" stroke="#ffc400" stroke-width="2.2" stroke-linecap="round"/>

    <!-- 車架：YouBike 2.0 經典白色/金屬亮面低跨主樑與黃色飾板 -->
    <!-- 後下叉與後上叉 -->
    <path d="M 15 31 L 32 31 L 26 14 Z" fill="none" stroke="#e2e8f0" stroke-width="3.4" stroke-linejoin="round"/>
    <path d="M 15 31 L 26 14" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>
    <!-- U型低跨下管 (YouBike 2.0 招牌彎管) -->
    <path d="M 32 31 Q 40 30 45 13" fill="none" stroke="#ffc400" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M 32 31 Q 40 30 45 13" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
    
    <!-- 前叉與龍頭立管 -->
    <path d="M 45 13 L 53 31" stroke="#e2e8f0" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M 45 13 L 43 7 H 48" stroke="#1e293b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>

    <!-- 坐墊 -->
    <path d="M 26 14 L 26 10" stroke="#1e293b" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M 21 10 Q 26 9 31 10 Q 29 13 25 13 Q 22 13 21 10 Z" fill="#1e293b"/>

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

/** 今日騎行進度：上班 → 午休 → 下班（時間取自 config.js 的 APP.periods） */
export function rideBar(now) {
  const [amS, amE] = APP.periods.am, [pmS, pmE] = APP.periods.pm;
  const S = toMin(amS), L1 = toMin(amE), L2 = toMin(pmS), E = toMin(pmE);
  const pct = Math.max(0, Math.min(1, (now - S) / (E - S))) * 100;
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
      <div class="rb-msg">${msg}</div>
      <div class="rb-track">
        <div class="rb-done" style="width:${pct}%"></div>
        ${stop(S, `${amS} 上班`)}${stop(L1, `${amE} 午休`)}${stop(L2, pmS)}${stop(E, `${pmE} 下班`)}
        <span class="rb-rider" style="left:${pct}%">${bike(34, { spin: now > S && now < E })}</span>
      </div>
    </div>`;
}
