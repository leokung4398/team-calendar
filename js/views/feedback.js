// 🌠 許願池 & 🗣️ 意見箱（抱怨箱）模組
// - 許願池：具名公開，支援組員 +1 附議投票、管理員標記狀態（評估中／開發中／已實現）
// - 意見箱（抱怨箱）：支援「🥷 完全匿名（連資料庫與管理員都不記錄真實 UID）」或「具名」自由切換，讓組員放心大吐苦水並互相拍拍打氣
import {
  state, myUid, isAdmin, wishList, saveWishItem, toggleWishVote, deleteWishItem,
  ventList, createVentItem, toggleVentReaction, addVentReply, deleteVentItem,
} from '../data.js';
import { esc, toast, openModal, closeModal, confirmDialog } from '../utils.js';

const WISH_STATUSES = [
  { id: 'open',      label: '💡 許願集氣中', color: '#D97706', bg: '#FFFBEB' },
  { id: 'reviewing', label: '🔍 評估規劃中', color: '#2563EB', bg: '#EFF6FF' },
  { id: 'building',  label: '🛠️ 排程開發中', color: '#7C3AED', bg: '#F5F3FF' },
  { id: 'done',      label: '🎉 已實現上線', color: '#16A34A', bg: '#F0FDF4' },
];

const VENT_CATEGORIES = [
  { id: 'work',   label: '💼 工作流程／制度吐苦水' },
  { id: 'field',  label: '🚲 外勤日曬雨淋辛酸淚' },
  { id: 'comm',   label: '📞 跨部門溝通心累日常' },
  { id: 'life',   label: '☕ 職場心情抒發' },
];

// ============================================================
// 🎵 Web Audio API 許願池音效合成器（免外部音檔：金幣叮噹 + 落水撲通）
// ============================================================
let wfAudioCtx = null;
function isWishSoundEnabled() {
  return localStorage.getItem('wf_sound_muted') !== '1';
}

function playCoinDingSound() {
  if (!isWishSoundEnabled()) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!wfAudioCtx) wfAudioCtx = new AudioCtx();
    if (wfAudioCtx.state === 'suspended') wfAudioCtx.resume();
    const now = wfAudioCtx.currentTime;

    // 雙頻金屬泛音 (Ding!)
    [1318.5, 2637.0].forEach((freq, i) => {
      const osc = wfAudioCtx.createOscillator();
      const gain = wfAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.045);
      gain.gain.setValueAtTime(0.001, now + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(i === 0 ? 0.14 : 0.09, now + i * 0.045 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.045 + 0.42);
      osc.connect(gain);
      gain.connect(wfAudioCtx.destination);
      osc.start(now + i * 0.045);
      osc.stop(now + i * 0.045 + 0.45);
    });
  } catch (_) {}
}

function playWaterPlopSound() {
  if (!isWishSoundEnabled()) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!wfAudioCtx) wfAudioCtx = new AudioCtx();
    if (wfAudioCtx.state === 'suspended') wfAudioCtx.resume();
    const now = wfAudioCtx.currentTime;

    // 1. 水滴氣泡音（頻率快速上滑的正弦波 Plop!）
    const osc = wfAudioCtx.createOscillator();
    const gain = wfAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.13);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(wfAudioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.17);

    // 2. 水花濺起聲（短促 Bandpass 白噪音）
    const bufferSize = Math.floor(wfAudioCtx.sampleRate * 0.18);
    const buffer = wfAudioCtx.createBuffer(1, bufferSize, wfAudioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }
    const noise = wfAudioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = wfAudioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1150, now);
    filter.Q.setValueAtTime(1.8, now);
    const nGain = wfAudioCtx.createGain();
    nGain.gain.setValueAtTime(0.14, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(wfAudioCtx.destination);
    noise.start(now);
  } catch (_) {}
}

// 依據許願 ID 產生穩定且自然散佈在橢圓水池內的 (left%, top%) 座標
function getCoinPosition(id, idx, total) {
  let hash = 2166136261;
  const s = String(id || idx);
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const h1 = Math.abs(hash % 1000) / 1000;
  const h2 = Math.abs(((hash >> 8) ^ (idx * 97)) % 1000) / 1000;

  // 使用黃金角螺旋 + 雜湊微調，確保硬幣在橢圓水池中均勻散開不重疊
  const goldenAngle = idx * 2.399963229728653 + h1 * 1.2;
  const radiusRatio = Math.min(0.88, 0.22 + 0.66 * Math.sqrt((idx + 0.45) / Math.max(total, 6)));
  const x = 50 + Math.cos(goldenAngle) * (radiusRatio * 42);
  const y = 54 + Math.sin(goldenAngle) * (radiusRatio * 34) + (h2 - 0.5) * 6;
  return {
    left: Math.max(8, Math.min(92, x)).toFixed(1),
    top: Math.max(16, Math.min(88, y)).toFixed(1),
  };
}

// 在許願池舞台觸發「拋擲 3D 金幣 -> 落水漣漪 -> 水花飛濺 -> 飄字」動畫
function triggerCoinTossAnimation(rootEl, opts = {}) {
  const fxLayer = rootEl?.querySelector('[data-wf-fx]');
  if (!fxLayer) return Promise.resolve();

  const targetLeftPct = Number(opts.leftPct ?? (36 + Math.random() * 28));
  const targetTopPct = Number(opts.topPct ?? (56 + Math.random() * 22));
  const labelText = opts.text || '🪙 +1 願望投入池中！';
  const coinSymbol = opts.symbol || '🚲';

  const sceneRect = fxLayer.getBoundingClientRect();
  const w = sceneRect.width || 760;
  const h = sceneRect.height || 320;

  // 計算終點相對於底部中央的偏移 px
  const endX = ((targetLeftPct - 50) / 100) * w;
  const endY = -((100 - targetTopPct) / 100) * h;
  const startX = (Math.random() - 0.5) * 90;

  playCoinDingSound();

  const coinWrap = document.createElement('div');
  coinWrap.className = 'wf-flying-coin-x';
  coinWrap.style.setProperty('--start-x', `${startX.toFixed(0)}px`);
  coinWrap.style.setProperty('--end-x', `${endX.toFixed(0)}px`);

  const coinBody = document.createElement('div');
  coinBody.className = 'wf-flying-coin-y';
  coinBody.style.setProperty('--end-y', `${endY.toFixed(0)}px`);
  coinBody.textContent = coinSymbol;
  coinWrap.appendChild(coinBody);
  fxLayer.appendChild(coinWrap);

  return new Promise(resolve => {
    // 0.75 秒硬幣接觸水面，觸發水花與三層柔光漣漪
    setTimeout(() => {
      playWaterPlopSound();

      // 三層擴散光學水波紋
      ['r1', 'r2', 'r3'].forEach(cls => {
        const ripple = document.createElement('div');
        ripple.className = `wf-splash-ripple ${cls}`;
        ripple.style.left = `${targetLeftPct}%`;
        ripple.style.top = `${targetTopPct}%`;
        fxLayer.appendChild(ripple);
        setTimeout(() => ripple.remove(), 1350);
      });

      // 14 顆飛濺水珠與金光水霧粒子
      for (let i = 0; i < 14; i++) {
        const drop = document.createElement('div');
        drop.className = `wf-splash-drop ${i % 3 === 0 ? 'gold' : ''}`;
        drop.style.left = `${targetLeftPct}%`;
        drop.style.top = `${targetTopPct}%`;
        const angle = (Math.PI * i) / 13 + (Math.random() - 0.5) * 0.25;
        const dist = 24 + Math.random() * 34;
        const dx = Math.cos(angle) * dist * (i % 2 === 0 ? 1 : -1);
        const dy = -Math.abs(Math.sin(angle) * (26 + Math.random() * 32)) - 10;
        drop.style.setProperty('--dx', `${dx.toFixed(1)}px`);
        drop.style.setProperty('--dy', `${dy.toFixed(1)}px`);
        fxLayer.appendChild(drop);
        setTimeout(() => drop.remove(), 760);
      }

      // 落水祝福飄字
      const floatToast = document.createElement('div');
      floatToast.className = 'wf-float-toast';
      floatToast.style.left = `${targetLeftPct}%`;
      floatToast.style.top = `${targetTopPct}%`;
      floatToast.textContent = labelText;
      fxLayer.appendChild(floatToast);
      setTimeout(() => floatToast.remove(), 1500);
    }, 740);

    setTimeout(() => {
      coinWrap.remove();
      resolve();
    }, 860);
  });
}

export function mountWishes(el) {
  // 記錄待播放投幣動畫的願望（新增許願或附議時觸發）
  let pendingTossOpts = null;

  function render() {
    const wishes = wishList();
    const uid = myUid();
    const totalVotes = wishes.reduce((acc, w) => acc + (Array.isArray(w.votes) ? w.votes.length : 0), 0);
    const doneCount = wishes.filter(w => w.status === 'done').length;
    const soundOn = isWishSoundEnabled();

    // 庭園流螢與水面波光亮點（固定種子讓每次重繪一致）
    const firefliesHtml = Array.from({ length: 18 }, (_, i) => {
      const left = ((i * 41 + 9) % 88) + 6;
      const top = ((i * 29 + 11) % 48) + 8;
      const delay = ((i * 0.45) % 5).toFixed(2);
      const size = i % 3 === 0 ? 5.5 : 4;
      return `<span class="wf-firefly" style="left:${left}%;top:${top}%;width:${size}px;height:${size}px;animation-delay:${delay}s"></span>`;
    }).join('');

    const waterSparklesHtml = Array.from({ length: 22 }, (_, i) => {
      const angle = i * 2.39996;
      const r = 10 + (i % 7) * 4.5;
      const left = (50 + Math.cos(angle) * r * 1.1).toFixed(1);
      const top = (69 + Math.sin(angle) * r * 0.52).toFixed(1);
      const delay = ((i * 0.31) % 2.8).toFixed(2);
      return `<span class="wf-water-sparkle" style="left:${left}%;top:${top}%;animation-delay:${delay}s"></span>`;
    }).join('');

    // 將每一筆許願化為池底馬賽克石磚上的一枚立體浮雕金幣
    const poolCoinsHtml = wishes.map((w, idx) => {
      const stId = w.status || 'open';
      const st = WISH_STATUSES.find(s => s.id === stId) || WISH_STATUSES[0];
      const votes = Array.isArray(w.votes) ? w.votes : [];
      const pos = getCoinPosition(w.id, idx, wishes.length);
      const icon = stId === 'done' ? '💎' : stId === 'building' ? '🛠️' : stId === 'reviewing' ? '🔍' : '🚲';
      const delay = ((idx * 0.38) % 3.5).toFixed(2);
      return `
        <div class="wf-pool-coin coin-${esc(stId)}"
             data-pool-coin="${esc(w.id)}"
             data-coin-left="${pos.left}"
             data-coin-top="${pos.top}"
             style="left:${pos.left}%;top:${pos.top}%;animation-delay:${delay}s;z-index:${10 + idx}">
          <span>${icon}</span>
          ${votes.length > 0 ? `<span class="wf-coin-votes-badge">+${votes.length}</span>` : ''}
          <div class="wf-coin-pop">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;margin-bottom:3px">
              <span style="color:#fde047;font-weight:800">${esc(st.label)}</span>
              <span style="color:#94a3b8;font-size:10.5px">🙌 ${votes.length} 附議</span>
            </div>
            <div style="font-weight:700;color:#fff;margin-bottom:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(w.title)}</div>
            <div style="color:#cbd5e1;font-size:10.5px">許願人：${esc(w.authorName || '組員')}（點擊硬幣附議 +1）</div>
          </div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="toolbar">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <h2 class="view-title" style="margin:0">🌠 團隊許願池</h2>
          <span class="info-pill-tip" data-tip="想要什麼實用工具、自動化報表或好用的系統介面？投下一枚金幣許願，或點擊池底金幣幫同事按 +1 集氣！">ⓘ 說明</span>
          <div class="compact-kpi-strip">
            <span class="kpi-chip">🪙 池中願望金幣 <b>${wishes.length}</b></span>
            <span class="kpi-chip">🙌 累積集氣 <b>${totalVotes}</b></span>
            <span class="kpi-chip">💎 已實現 <b>${doneCount}</b></span>
          </div>
        </div>
        <div class="toolbar-end" style="display:flex;gap:8px">
          <a href="#/vents" class="btn sm ghost" style="text-decoration:none">🗣️ 切換至意見箱(抱怨箱)</a>
          <button class="btn primary sm" data-new-wish>🪙 投幣許一個願望</button>
        </div>
      </div>

      <!-- ⛲ 電影級歐式庭園許願噴泉池（實景底圖 + SVG 流體水波折射濾鏡） -->
      <div class="wf-hero-stage" data-wf-stage>
        <!-- 隱藏的 SVG 光學水波流體折射濾鏡 (feTurbulence + feDisplacementMap) -->
        <svg width="0" height="0" style="position:absolute;pointer-events:none;overflow:hidden" aria-hidden="true">
          <defs>
            <filter id="wfWaterDisplacementFilter" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.018 0.042" numOctaves="2" seed="7" result="rippleNoise">
                <animate attributeName="baseFrequency" dur="11s" values="0.018 0.042;0.025 0.056;0.018 0.042" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="rippleNoise" scale="11" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>

        <div class="wf-hero-topbar">
          <div class="wf-hero-title-box">
            <span class="wf-hero-badge">⛲ 經營 Team 皇家庭園許願噴泉</span>
            <span class="wf-hero-sub">每一個願望都會化為池底閃耀金幣・點擊池水或右上角按鈕即可拋幣許願！</span>
          </div>
          <div class="wf-hero-actions">
            <button type="button" class="wf-sound-btn" data-wf-sound-toggle title="切換投幣與落水音效">
              ${soundOn ? '🔊 音效開啟' : '🔇 音效靜音'}
            </button>
            <button type="button" class="wf-toss-demo-btn" data-wf-quick-toss title="試丟一枚幸運金幣聽聽水聲">
              🪙 試丟幸運幣
            </button>
            <button type="button" class="wf-toss-demo-btn" data-new-wish style="background:linear-gradient(135deg,#38bdf8 0%,#0284c7 50%,#1d4ed8 100%);color:#fff;border-color:#bae6fd;box-shadow:0 4px 18px rgba(14,165,233,0.6)">
              ✨ 許下新願望
            </button>
          </div>
        </div>

        <div class="wf-scene" data-wf-scene>
          <!-- 第 1 層：高解析歐式庭園噴泉靜態實景（池畔石雕、黃銅夜燈、雕像保持銳利） -->
          <div class="wf-bg-still"></div>

          <!-- 第 2 層：橢圓水池內部專屬「即時流體水波折射層」 -->
          <div class="wf-bg-water-ripple"></div>

          <!-- 第 3 層：水底燈光與波光呼吸柔光層 -->
          <div class="wf-water-shimmer-overlay"></div>

          <!-- 第 4 層：夜間庭園螢火蟲、流星與水面波光星點 -->
          <div class="wf-stars">
            ${firefliesHtml}
            ${waterSparklesHtml}
            <div class="wf-shooting-star"></div>
          </div>

          <!-- 第 5 層：池底願望金幣互動層 -->
          <div class="wf-coins-bed" data-wf-coins-bed title="點擊清澈池水可試丟金幣，點擊池底金幣可檢視並幫願望 +1 集氣">
            ${poolCoinsHtml}
          </div>

          ${wishes.length === 0 ? `
            <div class="wf-empty-floating-cta">
              <span style="font-size:24px">🪙</span>
              <div style="text-align:left">
                <div style="font-size:13.5px;font-weight:800;color:#fef08a">許願池水清澈見底，還沒有第一枚願望金幣</div>
                <div style="font-size:11.5px;color:#cbd5e1">有任何希望加進平台的小工具、自動統計或介面優化，歡迎投下第一枚金幣！</div>
              </div>
              <button type="button" class="wf-toss-demo-btn" data-new-wish>🪙 投下第一枚願望金幣</button>
            </div>
          ` : ''}

          <!-- 第 6 層：3D 拋物線硬幣與落水水花特效層 -->
          <div class="wf-fx-layer" data-wf-fx></div>
        </div>

        <div class="wf-hero-foot">
          <div class="wf-legend-list">
            <span style="font-weight:800;color:#fef08a">🪙 池底願望金幣：</span>
            <span class="wf-legend-item"><i class="wf-legend-dot" style="background:#facc15;box-shadow:0 0 8px #facc15"></i> 🚲 許願集氣中 (${wishes.filter(w => (w.status || 'open') === 'open').length})</span>
            <span class="wf-legend-item"><i class="wf-legend-dot" style="background:#38bdf8;box-shadow:0 0 8px #38bdf8"></i> 🔍 評估規劃中 (${wishes.filter(w => w.status === 'reviewing').length})</span>
            <span class="wf-legend-item"><i class="wf-legend-dot" style="background:#c084fc;box-shadow:0 0 8px #c084fc"></i> 🛠️ 排程開發中 (${wishes.filter(w => w.status === 'building').length})</span>
            <span class="wf-legend-item"><i class="wf-legend-dot" style="background:#10b981;box-shadow:0 0 8px #10b981"></i> 💎 已實現上線 (${doneCount})</span>
          </div>
          <div style="color:#fde047;font-weight:700">
            💡 提示：直接點擊池水可拋幣試玩；滑鼠移到池底金幣可檢視願望、點擊金幣即可 +1 附議！
          </div>
        </div>
      </div>

      ${wishes.length > 0 ? `
        <div class="wish-grid">
          ${wishes.map((w, idx) => {
            const st = WISH_STATUSES.find(s => s.id === (w.status || 'open')) || WISH_STATUSES[0];
            const votes = Array.isArray(w.votes) ? w.votes : [];
            const voted = votes.includes(uid);
            const canDel = w.createdBy === uid || isAdmin();
            const pos = getCoinPosition(w.id, idx, wishes.length);
            return `
              <div class="card pad wish-card" data-wish-card="${esc(w.id)}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
                  <div style="min-width:0;flex:1">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px">
                      <span class="case-status-badge" style="background:${st.bg};color:${st.color}">${st.label}</span>
                      <span class="muted" style="font-size:12px">許願人：<b>${esc(w.authorName || '組員')}</b> · ${esc((w.createdAtIso || '').slice(0, 10))}</span>
                    </div>
                    <h3 style="margin:0 0 6px;font-size:15.5px">${esc(w.title)}</h3>
                    <p style="margin:0;font-size:13.5px;color:var(--text);line-height:1.55;white-space:pre-wrap">${esc(w.description || '')}</p>
                    ${w.adminNote ? `
                      <div style="margin-top:8px;background:#F8FAFC;border-left:3px solid var(--primary);padding:6px 10px;border-radius:6px;font-size:12.5px">
                        <strong>🛠️ 開發評估回覆：</strong>${esc(w.adminNote)}
                      </div>
                    ` : ''}
                  </div>
                  <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0">
                    <button class="btn ${voted ? 'primary' : ''}"
                            data-vote-wish="${esc(w.id)}"
                            data-coin-left="${pos.left}"
                            data-coin-top="${pos.top}"
                            style="min-width:82px;flex-direction:column;padding:8px 12px;gap:2px"
                            title="點擊投幣附議 +1">
                      <span style="font-size:15px">🪙 +1 投幣</span>
                      <span style="font-size:12px;font-weight:800">${votes.length} 人附議</span>
                    </button>
                    <div style="display:flex;gap:4px">
                      ${isAdmin() ? `<button class="btn sm ghost" data-status-wish="${esc(w.id)}" title="更新實現狀態">⚙️</button>` : ''}
                      ${canDel ? `<button class="btn sm ghost" data-del-wish="${esc(w.id)}" title="刪除" style="color:var(--danger)">✕</button>` : ''}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    `;

    // 若剛完成新增許願或附議，立即在重繪後的許願池播放 3D 投幣落水動畫！
    if (pendingTossOpts) {
      const opts = pendingTossOpts;
      pendingTossOpts = null;
      setTimeout(() => triggerCoinTossAnimation(el, opts), 60);
    }

    // 音效開關
    const soundBtn = el.querySelector('[data-wf-sound-toggle]');
    if (soundBtn) {
      soundBtn.onclick = () => {
        const nextMuted = isWishSoundEnabled() ? '1' : '0';
        localStorage.setItem('wf_sound_muted', nextMuted);
        if (nextMuted === '0') playCoinDingSound();
        render();
      };
    }

    // 試丟幸運幣按鈕
    const quickTossBtn = el.querySelector('[data-wf-quick-toss]');
    if (quickTossBtn) {
      quickTossBtn.onclick = () => {
        const blessings = [
          '🪙 撲通！願外勤一路綠燈順暢！',
          '🪙 撲通！願系統越來越好用！',
          '🪙 撲通！願今日巡檢晴空萬里！',
          '🪙 撲通！經營 Team 業績長紅！',
        ];
        triggerCoinTossAnimation(el, {
          text: blessings[Math.floor(Math.random() * blessings.length)],
          symbol: '🚲',
        });
      };
    }

    // 點擊池面空白處也可直接投一枚許願幣並可選擇高亮
    const coinsBed = el.querySelector('[data-wf-coins-bed]');
    if (coinsBed) {
      coinsBed.onclick = e => {
        const coinEl = e.target.closest('[data-pool-coin]');
        if (coinEl) return; // 由金幣點擊事件處理
        const rect = el.querySelector('[data-wf-scene]')?.getBoundingClientRect();
        if (rect) {
          const leftPct = Math.max(18, Math.min(82, ((e.clientX - rect.left) / rect.width) * 100));
          const topPct = Math.max(48, Math.min(82, ((e.clientY - rect.top) / rect.height) * 100));
          triggerCoinTossAnimation(el, {
            leftPct,
            topPct,
            text: '🪙 撲通！點擊右上角「投幣許一個願望」把點子留在池底吧！',
          });
        }
      };
    }

    // 點擊池底金幣：直接幫該願望投幣附議 +1，並捲動高亮下方願望卡片
    el.querySelectorAll('[data-pool-coin]').forEach(coinEl => {
      coinEl.onclick = async e => {
        e.stopPropagation();
        const wid = coinEl.dataset.poolCoin;
        const w = state.wishes.get(wid);
        const leftPct = Number(coinEl.dataset.coinLeft || 50);
        const topPct = (Number(coinEl.dataset.coinTop || 50) * 0.36) + 52;
        const alreadyVoted = Array.isArray(w?.votes) && w.votes.includes(uid);

        pendingTossOpts = {
          leftPct,
          topPct,
          text: alreadyVoted ? `✨ 已收回附議：${w?.title || ''}` : `🪙 +1 投幣集氣：${(w?.title || '').slice(0, 14)}`,
          symbol: '🙌',
        };
        await toggleWishVote(wid);
        render();

        const targetCard = el.querySelector(`[data-wish-card="${CSS.escape(wid)}"]`);
        if (targetCard) {
          targetCard.classList.remove('wf-card-highlight');
          void targetCard.offsetWidth;
          targetCard.classList.add('wf-card-highlight');
        }
      };
    });

    // 新增許願按鈕
    el.querySelectorAll('[data-new-wish]').forEach(btn => {
      btn.onclick = () => openNewWishModal(wishTitle => {
        pendingTossOpts = {
          leftPct: 44 + Math.random() * 12,
          topPct: 62 + Math.random() * 12,
          text: `🪙 願望入池：${(wishTitle || '').slice(0, 15)}`,
          symbol: '🌠',
        };
        render();
      });
    });

    // 下方願望卡片的「🪙 +1 投幣」按鈕
    el.querySelectorAll('[data-vote-wish]').forEach(btn => {
      btn.onclick = async () => {
        const wid = btn.dataset.voteWish;
        const w = state.wishes.get(wid);
        const alreadyVoted = Array.isArray(w?.votes) && w.votes.includes(uid);
        const leftPct = Number(btn.dataset.coinLeft || 50);
        const topPct = (Number(btn.dataset.coinTop || 50) * 0.36) + 52;

        // 若畫面捲在下方，自動平滑捲回池子或直接在池子上方投幣
        el.querySelector('[data-wf-stage]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        pendingTossOpts = {
          leftPct,
          topPct,
          text: alreadyVoted ? '✨ 已取消附議' : `🪙 +1 附議投入池中！`,
          symbol: '🙌',
        };
        await toggleWishVote(wid);
        render();
      };
    });

    el.querySelectorAll('[data-status-wish]').forEach(btn => {
      btn.onclick = () => {
        const w = state.wishes.get(btn.dataset.statusWish);
        if (w) openWishAdminModal(w, render);
      };
    });
    el.querySelectorAll('[data-del-wish]').forEach(btn => {
      btn.onclick = async () => {
        const w = state.wishes.get(btn.dataset.delWish);
        if (!w) return;
        if (!(await confirmDialog(`確定要刪除許願「${w.title}」嗎？`, { danger: true, okText: '刪除' }))) return;
        await deleteWishItem(w.id);
        toast('已刪除許願');
        render();
      };
    });
  }

  render();
  return { onData: render };
}

function openNewWishModal(onDone) {
  openModal(`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #f1f5f9">
      <div style="display:flex;align-items:center;gap:10px;min-width:0">
        <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#fef08a 0%,#f59e0b 100%);display:grid;place-items:center;font-size:21px;box-shadow:0 4px 12px rgba(245,158,11,0.3);flex-shrink:0">🪙</div>
        <div style="min-width:0">
          <h3 style="margin:0;font-size:17px;font-weight:800;color:#0f172a">投幣許一個新願望</h3>
          <div style="font-size:12px;color:#64748b;margin-top:2px">實用小工具 · 自動化報表 · 系統介面優化</div>
        </div>
      </div>
      <button type="button" class="icon-btn" data-close style="flex-shrink:0">✕</button>
    </div>

    <form class="form" id="wish-form" style="gap:16px">
      <div style="display:flex;align-items:flex-start;gap:10px;background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%);border:1px solid #fde68a;color:#92400e;padding:11px 14px;border-radius:12px;font-size:12.5px;line-height:1.55">
        <span style="font-size:18px;line-height:1.2">⛲</span>
        <div>送出後將為您鑄造一枚專屬<b>願望金幣</b>並拋入團隊許願池中！同事們點擊池底金幣即可幫您按 <b>+1 附議集氣</b>。</div>
      </div>

      <div class="field">
        <span>🏷️ 願望標題 <em>*</em></span>
        <input type="text" name="title" required placeholder="例如：希望小工具新增各縣市 YouBike 場站天氣預警地圖" style="width:100%;padding:10px 12px;border-radius:10px">
      </div>

      <div class="field">
        <span>💡 具體想法或使用情境說明 <em>*</em></span>
        <textarea name="description" rows="4" required placeholder="說明這個工具或功能可以幫大家省下什麼麻煩、或是希望怎麼呈現…" style="width:100%;padding:10px 12px;border-radius:10px;resize:vertical;line-height:1.55"></textarea>
      </div>

      <div style="display:flex;justify-content:flex-end;align-items:center;gap:10px;padding-top:12px;border-top:1px solid #f1f5f9;margin-top:2px">
        <button type="button" class="btn" data-close style="padding:8px 18px;border-radius:10px">取消</button>
        <button type="submit" class="btn primary" style="padding:8px 20px;border-radius:10px;box-shadow:0 4px 14px rgba(245,172,0,0.35)">🪙 投幣送出許願</button>
      </div>
    </form>
  `);
  document.getElementById('wish-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const title = f.title.value.trim();
    const description = f.description.value.trim();
    await saveWishItem({ title, description });
    closeModal();
    toast('🪙 撲通！願望金幣已投入許願池，快揪同事一起按 +1 附議！');
    onDone?.(title);
  };
}

function openWishAdminModal(w, onDone) {
  openModal(`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #f1f5f9">
      <div style="display:flex;align-items:center;gap:10px;min-width:0">
        <div style="width:38px;height:38px;border-radius:10px;background:#f1f5f9;display:grid;place-items:center;font-size:19px;flex-shrink:0">⚙️</div>
        <div style="min-width:0">
          <h3 style="margin:0;font-size:16px;font-weight:800;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">更新許願狀態</h3>
          <div style="font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(w.title)}</div>
        </div>
      </div>
      <button type="button" class="icon-btn" data-close style="flex-shrink:0">✕</button>
    </div>
    <form class="form" id="wish-admin-form" style="gap:16px">
      <div class="field">
        <span>📌 目前處理狀態</span>
        <select name="status" style="width:100%;padding:9px 12px;border-radius:10px">
          ${WISH_STATUSES.map(s => `<option value="${s.id}" ${w.status === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <span>🛠️ 開發評估／回覆說明（選填）</span>
        <textarea name="adminNote" rows="3" placeholder="例如：已排入下週更新，預計週五上線！" style="width:100%;padding:10px 12px;border-radius:10px;resize:vertical">${esc(w.adminNote || '')}</textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;align-items:center;gap:10px;padding-top:12px;border-top:1px solid #f1f5f9">
        <button type="button" class="btn" data-close style="padding:8px 18px;border-radius:10px">取消</button>
        <button type="submit" class="btn primary" style="padding:8px 20px;border-radius:10px">儲存更新</button>
      </div>
    </form>
  `);
  document.getElementById('wish-admin-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    await saveWishItem({
      status: f.status.value,
      adminNote: f.adminNote.value.trim(),
    }, w);
    closeModal();
    toast('許願狀態已更新');
    onDone?.();
  };
}

// ============================================================
// 🌲 意見箱（秘境森林解憂古樹洞）：支援「完全匿名」吐苦水、紙飛機入樹洞、枝頭微光燈籠與營火焚毀鳥事
// ============================================================

// 森林空靈風鈴共鳴音效（紙飛機飛入樹洞／點亮燈籠）
function playForestChimeSound() {
  if (!isWishSoundEnabled()) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!wfAudioCtx) wfAudioCtx = new AudioCtx();
    if (wfAudioCtx.state === 'suspended') wfAudioCtx.resume();
    const now = wfAudioCtx.currentTime;

    // 空靈五聲音階和弦泛音 (C5 - E5 - G5 - B5)
    [523.25, 659.25, 783.99, 987.77].forEach((freq, i) => {
      const osc = wfAudioCtx.createOscillator();
      const gain = wfAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.001, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.11, now + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.07 + 0.75);
      osc.connect(gain);
      gain.connect(wfAudioCtx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.78);
    });
  } catch (_) {}
}

// 營火烈焰燃燒與柴火噼啪聲（把煩惱紙條丟進營火燒成灰燼）
function playCampfireBurnSound() {
  if (!isWishSoundEnabled()) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!wfAudioCtx) wfAudioCtx = new AudioCtx();
    if (wfAudioCtx.state === 'suspended') wfAudioCtx.resume();
    const now = wfAudioCtx.currentTime;

    // 火焰轟鳴低頻噪音 + 噼啪高頻火花
    const duration = 1.4;
    const bufferSize = Math.floor(wfAudioCtx.sampleRate * duration);
    const buffer = wfAudioCtx.createBuffer(1, bufferSize, wfAudioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      const crackle = Math.random() > 0.985 ? (Math.random() * 2 - 1) * 2.5 : 0;
      data[i] = ((Math.random() * 2 - 1) * 0.45 * env) + crackle;
    }
    const noise = wfAudioCtx.createBufferSource();
    noise.buffer = buffer;
    const filter = wfAudioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(620, now);
    filter.frequency.linearRampToValueAtTime(1400, now + 0.5);
    filter.frequency.linearRampToValueAtTime(380, now + duration);

    const gain = wfAudioCtx.createGain();
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(wfAudioCtx.destination);
    noise.start(now);
  } catch (_) {}
}

// 計算古樹枝頭每一盞「解憂微光燈籠」的自然懸掛位置（避開中央樹洞，分佈在左右上方的樹冠枝幹）
function getCanopyLanternPosition(id, idx) {
  // 預設 14 個順著左右樹枝分佈的精準座標點 (left%, top%)
  const branchAnchors = [
    { left: 23, top: 27 }, { left: 32, top: 24 }, { left: 17, top: 34 },
    { left: 75, top: 28 }, { left: 66, top: 23 }, { left: 82, top: 33 },
    { left: 38, top: 31 }, { left: 61, top: 31 }, { left: 27, top: 39 },
    { left: 71, top: 38 }, { left: 43, top: 21 }, { left: 57, top: 21 },
    { left: 14, top: 25 }, { left: 85, top: 24 },
  ];
  let hash = 0;
  const s = String(id || idx);
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) % 1000;
  const base = branchAnchors[idx % branchAnchors.length];
  const jitterX = ((hash % 9) - 4) * 0.7;
  const jitterY = (((hash >> 3) % 9) - 4) * 0.6;
  return {
    left: Math.max(10, Math.min(90, base.left + jitterX)).toFixed(1),
    top: Math.max(16, Math.min(44, base.top + jitterY)).toFixed(1),
  };
}

// 觸發「3D 發光紙飛機／森林信箋飛入中央古樹洞」動畫
function triggerPaperPlaneToHollow(rootEl, opts = {}) {
  const fxLayer = rootEl?.querySelector('[data-th-fx]');
  if (!fxLayer) return Promise.resolve();

  const targetLeftPct = Number(opts.leftPct ?? 50);
  const targetTopPct = Number(opts.topPct ?? 54);
  const labelText = opts.text || '✈️ 樹洞已溫柔收下您的心聲！';
  const symbol = opts.symbol || '✈️';

  const sceneRect = fxLayer.getBoundingClientRect();
  const w = sceneRect.width || 900;
  const h = sceneRect.height || 500;

  const endX = ((targetLeftPct - 50) / 100) * w;
  const endY = -((100 - targetTopPct) / 100) * h;
  const startX = (Math.random() - 0.5) * 180;

  playForestChimeSound();

  const wrap = document.createElement('div');
  wrap.className = 'th-flying-plane-x';
  wrap.style.setProperty('--start-x', `${startX.toFixed(0)}px`);
  wrap.style.setProperty('--end-x', `${endX.toFixed(0)}px`);

  const body = document.createElement('div');
  body.className = 'th-flying-plane-y';
  body.style.setProperty('--end-y', `${endY.toFixed(0)}px`);
  body.textContent = symbol;
  wrap.appendChild(body);
  fxLayer.appendChild(wrap);

  return new Promise(resolve => {
    setTimeout(() => {
      // 樹洞琥珀金光共鳴波紋
      [0, 140].forEach(delay => {
        setTimeout(() => {
          const ring = document.createElement('div');
          ring.className = 'th-hollow-ring';
          ring.style.left = `${targetLeftPct}%`;
          ring.style.top = `${targetTopPct}%`;
          fxLayer.appendChild(ring);
          setTimeout(() => ring.remove(), 1200);
        }, delay);
      });

      // 森林星塵粒子爆發
      for (let i = 0; i < 14; i++) {
        const drop = document.createElement('div');
        drop.className = `wf-splash-drop ${i % 2 === 0 ? 'gold' : ''}`;
        drop.style.left = `${targetLeftPct}%`;
        drop.style.top = `${targetTopPct}%`;
        const angle = (Math.PI * 2 * i) / 14;
        const dist = 28 + Math.random() * 38;
        drop.style.setProperty('--dx', `${(Math.cos(angle) * dist).toFixed(1)}px`);
        drop.style.setProperty('--dy', `${(Math.sin(angle) * dist - 12).toFixed(1)}px`);
        fxLayer.appendChild(drop);
        setTimeout(() => drop.remove(), 780);
      }

      const floatToast = document.createElement('div');
      floatToast.className = 'wf-float-toast';
      floatToast.style.left = `${targetLeftPct}%`;
      floatToast.style.top = `${targetTopPct}%`;
      floatToast.textContent = labelText;
      fxLayer.appendChild(floatToast);
      setTimeout(() => floatToast.remove(), 1550);
    }, 820);

    setTimeout(() => {
      wrap.remove();
      resolve();
    }, 950);
  });
}

// 🔥 壓箱寶動畫：把煩惱紙條丟進左下角營火中燃燒殆盡、化為漫天火星灰燼（不留資料庫）
function triggerBurnWorryInCampfire(rootEl, worryText = '煩惱退散！') {
  const fxLayer = rootEl?.querySelector('[data-th-fx]');
  if (!fxLayer) return;

  const fireLeftPct = 26;
  const fireTopPct = 81;

  playCampfireBurnSound();

  const paper = document.createElement('div');
  paper.className = 'th-burn-paper';
  paper.style.left = `${fireLeftPct}%`;
  paper.style.top = `${fireTopPct}%`;
  paper.textContent = `📜 ${worryText}`;
  fxLayer.appendChild(paper);

  // 營火竄出 24 顆沖天火星與灰燼
  setTimeout(() => {
    for (let i = 0; i < 24; i++) {
      setTimeout(() => {
        const ember = document.createElement('div');
        ember.className = 'th-ember-spark';
        ember.style.left = `${fireLeftPct + (Math.random() - 0.5) * 6}%`;
        ember.style.top = `${fireTopPct + (Math.random() - 0.5) * 4}%`;
        const ex = (Math.random() - 0.5) * 110;
        const ey = -(70 + Math.random() * 140);
        ember.style.setProperty('--ex', `${ex.toFixed(0)}px`);
        ember.style.setProperty('--ey', `${ey.toFixed(0)}px`);
        fxLayer.appendChild(ember);
        setTimeout(() => ember.remove(), 1400);
      }, i * 35);
    }
  }, 420);

  setTimeout(() => {
    const floatToast = document.createElement('div');
    floatToast.className = 'wf-float-toast';
    floatToast.style.left = `${fireLeftPct}%`;
    floatToast.style.top = `${fireTopPct - 12}%`;
    floatToast.style.borderColor = '#fb923c';
    floatToast.textContent = '🔥 鳥事已化為灰燼隨風消散！不留半點痕跡！';
    fxLayer.appendChild(floatToast);
    setTimeout(() => floatToast.remove(), 1700);
  }, 1150);

  setTimeout(() => paper.remove(), 2000);
}

export function mountVents(el) {
  const expandedReplyIds = new Set();
  let pendingPlaneOpts = null;

  function render() {
    const vents = ventList();
    const uid = myUid();
    const soundOn = isWishSoundEnabled();
    const totalReactions = vents.reduce((acc, v) => {
      const rx = v.reactions || {};
      return acc + (rx.hug?.length || 0) + (rx.cry?.length || 0) + (rx.cheer?.length || 0);
    }, 0);

    // 森林夜間流螢與溪流星光
    const firefliesHtml = Array.from({ length: 22 }, (_, i) => {
      const left = ((i * 39 + 7) % 90) + 5;
      const top = ((i * 27 + 9) % 78) + 8;
      const delay = ((i * 0.42) % 5.5).toFixed(2);
      const size = i % 3 === 0 ? 5.5 : 4;
      return `<span class="wf-firefly" style="left:${left}%;top:${top}%;width:${size}px;height:${size}px;animation-delay:${delay}s"></span>`;
    }).join('');

    // 將每一篇吐苦水化為古樹枝頭懸掛的一盞「微光祈福燈籠」
    const canopyLanternsHtml = vents.map((v, idx) => {
      const cat = VENT_CATEGORIES.find(c => c.id === v.category) || VENT_CATEGORIES[0];
      const rx = { hug: [], cry: [], cheer: [], ...(v.reactions || {}) };
      const rxCount = (rx.hug || []).length + (rx.cry || []).length + (rx.cheer || []).length;
      const pos = getCanopyLanternPosition(v.id, idx);
      const delay = ((idx * 0.43) % 3.8).toFixed(2);
      return `
        <div class="th-spirit-lantern cat-${esc(v.category || 'work')}"
             data-tree-lantern="${esc(v.id)}"
             style="left:${pos.left}%;top:${pos.top}%;animation-delay:${delay}s;z-index:${12 + idx}">
          <div class="th-lantern-body">
            <span>${esc(v.mood || '😤')}</span>
            ${rxCount > 0 ? `<span class="th-lantern-rx-badge">🫂${rxCount}</span>` : ''}
          </div>
          <div class="th-lantern-pop">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;margin-bottom:4px">
              <span style="color:#6ee7b7;font-weight:800">${esc(cat.label)}</span>
              <span style="color:#fda4af;font-size:10.5px">🫂 ${rxCount} 拍拍打氣</span>
            </div>
            <div style="font-weight:700;color:#fff;margin-bottom:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(v.content)}</div>
            <div style="color:#cbd5e1;font-size:10.5px">${esc(v.authorName || '匿名單車客 🚲')}（點擊燈籠送出 🫂 拍拍）</div>
          </div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="toolbar">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <h2 class="view-title" style="margin:0">🌲 意見箱（秘境森林解憂樹洞）</h2>
          <span class="info-pill-tip" data-tip="選擇『🥷 完全匿名』發表時，系統連資料庫都不會寫入您的真實帳號 UID，管理員與任何人都無法反查身分，請安心抒發！">🛡️ 100% 零追蹤匿名保護</span>
          <div class="compact-kpi-strip">
            <span class="kpi-chip">🏮 枝頭心聲燈籠 <b>${vents.length}</b></span>
            <span class="kpi-chip">🫂 累計溫暖拍拍 <b>${totalReactions}</b></span>
          </div>
        </div>
        <div class="toolbar-end" style="display:flex;gap:8px">
          <a href="#/wishes" class="btn sm ghost" style="text-decoration:none">🌠 切換至許願池</a>
          <button class="btn primary sm" data-new-vent>✈️ 摺紙飛機吐苦水</button>
        </div>
      </div>

      <!-- 🌲 電影級秘境森林千年發光古樹洞 ＆ 療癒營火舞台 -->
      <div class="th-hero-stage" data-th-stage>
        <!-- 隱藏的 SVG 溪流與營火熱氣搖曳光學濾鏡 -->
        <svg width="0" height="0" style="position:absolute;pointer-events:none;overflow:hidden" aria-hidden="true">
          <defs>
            <filter id="thForestStreamFilter" x="-5%" y="-5%" width="110%" height="110%">
              <feTurbulence type="fractalNoise" baseFrequency="0.016 0.045" numOctaves="2" seed="11" result="streamNoise">
                <animate attributeName="baseFrequency" dur="9s" values="0.016 0.045;0.024 0.062;0.016 0.045" repeatCount="indefinite" />
              </feTurbulence>
              <feDisplacementMap in="SourceGraphic" in2="streamNoise" scale="9" xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>
        </svg>

        <div class="wf-hero-topbar">
          <div class="wf-hero-title-box">
            <span class="wf-hero-badge" style="border-color:rgba(52,211,153,0.6);color:#6ee7b7">🌲 秘境森林千年解憂古樹洞</span>
            <span class="wf-hero-sub">把委屈摺成紙飛機射入樹洞化為枝頭暖燈，或丟進左下角營火燒成灰燼（純發洩不留存）！</span>
          </div>
          <div class="wf-hero-actions">
            <button type="button" class="wf-sound-btn" data-th-sound-toggle title="切換森林風鈴與營火音效">
              ${soundOn ? '🔊 音效開啟' : '🔇 音效靜音'}
            </button>
            <button type="button" class="wf-toss-demo-btn" data-th-burn-btn style="background:linear-gradient(135deg,#fb923c 0%,#ea580c 50%,#dc2626 100%);color:#fff;border-color:#fed7aa;box-shadow:0 4px 18px rgba(234,88,12,0.6)" title="純發洩不存檔！寫張紙條丟進營火燒成灰燼">
              🔥 燒毀煩惱紙條
            </button>
            <button type="button" class="wf-toss-demo-btn" data-new-vent style="background:linear-gradient(135deg,#34d399 0%,#059669 100%);color:#022c22;border-color:#a7f3d0;box-shadow:0 4px 18px rgba(16,185,129,0.55)">
              ✈️ 匿名投遞樹洞
            </button>
          </div>
        </div>

        <div class="th-scene" data-th-scene>
          <!-- 第 1 層：千年古樹洞高解析實景底圖 -->
          <div class="th-bg-still"></div>

          <!-- 第 2 層：左下營火與右下螢光溪流動態折射層 -->
          <div class="th-bg-stream-ripple"></div>

          <!-- 第 3 層：中央樹洞溫暖琥珀光呼吸層 -->
          <div class="th-hollow-warm-glow"></div>

          <!-- 第 4 層：森林夜間螢火蟲與流星 -->
          <div class="wf-stars">
            ${firefliesHtml}
            <div class="wf-shooting-star"></div>
          </div>

          <!-- 第 5 層：樹冠枝頭懸掛「微光心聲燈籠」互動層 -->
          <div class="th-canopy-bed">
            ${canopyLanternsHtml}
          </div>

          <!-- 第 6 層：中央古樹洞互動入口 -->
          <div class="th-hollow-portal" data-new-vent title="點擊將心聲或建議摺成紙飛機投入古樹洞">
            <span class="th-hollow-portal-tag">✈️ 點擊樹洞傾訴心聲</span>
          </div>

          <!-- 第 7 層：左下角療癒營火互動區（純發洩燒紙條） -->
          <div class="th-campfire-zone" data-th-burn-btn title="不想留下記錄？點此寫張紙條直接丟進營火燒成灰燼！">
            <span class="th-campfire-tag">🔥 點擊營火燒毀鳥事</span>
          </div>

          ${vents.length === 0 ? `
            <div class="wf-empty-floating-cta" style="bottom:8%;border-color:rgba(52,211,153,0.55)">
              <span style="font-size:24px">🌲</span>
              <div style="text-align:left">
                <div style="font-size:13.5px;font-weight:800;color:#6ee7b7">古樹洞裡目前風平浪靜，枝頭還沒有心聲燈籠</div>
                <div style="font-size:11.5px;color:#cbd5e1">開啟「🥷 完全匿名模式」把委屈或建議射進樹洞，或點左下角「🔥 營火」把鳥事燒成灰燼！</div>
              </div>
              <button type="button" class="wf-toss-demo-btn" data-new-vent style="background:linear-gradient(135deg,#34d399 0%,#059669 100%);color:#022c22;border-color:#a7f3d0">✈️ 投遞第一架紙飛機</button>
            </div>
          ` : ''}

          <!-- 第 8 層：紙飛機飛行與營火灰燼粒子動畫層 -->
          <div class="wf-fx-layer" data-th-fx></div>
        </div>

        <div class="wf-hero-foot" style="border-top-color:rgba(52,211,153,0.25)">
          <div class="wf-legend-list">
            <span style="font-weight:800;color:#6ee7b7">🏮 枝頭心聲燈籠：</span>
            <span class="wf-legend-item"><i class="wf-legend-dot" style="background:#f59e0b;box-shadow:0 0 8px #f59e0b"></i> 💼 工作制度 (${vents.filter(v => (v.category || 'work') === 'work').length})</span>
            <span class="wf-legend-item"><i class="wf-legend-dot" style="background:#10b981;box-shadow:0 0 8px #10b981"></i> 🚲 外勤辛酸 (${vents.filter(v => v.category === 'field').length})</span>
            <span class="wf-legend-item"><i class="wf-legend-dot" style="background:#0ea5e9;box-shadow:0 0 8px #0ea5e9"></i> 📞 跨部門溝通 (${vents.filter(v => v.category === 'comm').length})</span>
            <span class="wf-legend-item"><i class="wf-legend-dot" style="background:#c084fc;box-shadow:0 0 8px #c084fc"></i> ☕ 心情抒發 (${vents.filter(v => v.category === 'life').length})</span>
          </div>
          <div style="color:#fed7aa;font-weight:700">
            🔥 解壓秘技：點左下角「營火」可寫紙條直接燒成灰燼（100% 不留存）；點枝頭燈籠可幫夥伴拍拍打氣！
          </div>
        </div>
      </div>

      ${vents.length > 0 ? `
        <div class="vent-list-grid">
          ${vents.map(v => {
            const cat = VENT_CATEGORIES.find(c => c.id === v.category) || VENT_CATEGORIES[0];
            const rx = { hug: [], cry: [], cheer: [], ...(v.reactions || {}) };
            const myHug = (rx.hug || []).includes(uid);
            const myCry = (rx.cry || []).includes(uid);
            const myCheer = (rx.cheer || []).includes(uid);
            const replies = Array.isArray(v.replies) ? v.replies : [];
            const isRepOpen = expandedReplyIds.has(v.id);
            const canDel = (!v.isAnonymous && v.createdBy === uid) || isAdmin();

            return `
              <div class="card pad vent-card" data-vent-card="${esc(v.id)}">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <span style="font-size:20px">${esc(v.mood || '😤')}</span>
                    <strong style="font-size:13.5px;color:${v.isAnonymous ? '#475569' : 'var(--text)'}">${esc(v.authorName || '匿名單車客 🚲')}</strong>
                    ${v.isAnonymous ? `<span class="badge" style="background:#F1F5F9;color:#475569;font-size:11px">🥷 完全匿名</span>` : ''}
                    <span class="badge" style="background:#FEF3C7;color:#92400E;font-size:11px">${esc(cat.label)}</span>
                    <span class="muted" style="font-size:11.5px">${esc((v.createdAtIso || '').slice(0, 16).replace('T', ' '))}</span>
                  </div>
                  ${canDel ? `<button class="btn sm ghost" data-del-vent="${esc(v.id)}" style="color:var(--danger);padding:2px 6px">✕</button>` : ''}
                </div>

                <div style="font-size:14.5px;line-height:1.65;color:var(--text);white-space:pre-wrap;background:#F8FAFC;padding:12px 14px;border-radius:10px;border:1px solid var(--border)">${esc(v.content)}</div>

                <div style="display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap">
                  <button class="btn sm ${myHug ? 'primary' : ''}" data-vent-rx="${esc(v.id)}" data-rx-type="hug">🫂 拍拍 (${(rx.hug || []).length})</button>
                  <button class="btn sm ${myCry ? 'primary' : ''}" data-vent-rx="${esc(v.id)}" data-rx-type="cry">😭 懂你 (${(rx.cry || []).length})</button>
                  <button class="btn sm ${myCheer ? 'primary' : ''}" data-vent-rx="${esc(v.id)}" data-rx-type="cheer">💪 加油 (${(rx.cheer || []).length})</button>
                  <button class="btn sm ghost" data-toggle-vreply="${esc(v.id)}" style="margin-left:auto">
                    💬 暖心留言 (${replies.length}) ${isRepOpen ? '▴' : '▾'}
                  </button>
                </div>

                ${isRepOpen ? `
                  <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--border)">
                    ${replies.length > 0 ? `
                      <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px">
                        ${replies.map(r => `
                          <div style="font-size:12.5px;background:#fff;border:1px solid var(--border);padding:6px 10px;border-radius:8px">
                            <strong>${esc(r.authorName)}：</strong>${esc(r.text)}
                            <span class="muted" style="font-size:11px;margin-left:6px">${esc((r.at || '').slice(5, 16).replace('T', ' '))}</span>
                          </div>
                        `).join('')}
                      </div>
                    ` : ''}
                    <form class="vent-reply-form" data-vreply-form="${esc(v.id)}" style="display:flex;gap:6px;align-items:center">
                      <input type="text" name="text" required placeholder="寫下打氣或共鳴留言…" style="flex:1;padding:6px 10px;border-radius:8px;border:1px solid var(--border);font-size:13px">
                      <label style="display:flex;align-items:center;gap:4px;font-size:12px;white-space:nowrap;cursor:pointer">
                        <input type="checkbox" name="anon" checked> 匿名回覆
                      </label>
                      <button type="submit" class="btn sm primary">送出</button>
                    </form>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}
    `;

    if (pendingPlaneOpts) {
      const opts = pendingPlaneOpts;
      pendingPlaneOpts = null;
      setTimeout(() => triggerPaperPlaneToHollow(el, opts), 60);
    }

    // 音效開關
    const soundBtn = el.querySelector('[data-th-sound-toggle]');
    if (soundBtn) {
      soundBtn.onclick = () => {
        const nextMuted = isWishSoundEnabled() ? '1' : '0';
        localStorage.setItem('wf_sound_muted', nextMuted);
        if (nextMuted === '0') playForestChimeSound();
        render();
      };
    }

    // 🔥 燒毀煩惱紙條（純發洩不存檔）
    el.querySelectorAll('[data-th-burn-btn]').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        openBurnWorryModal(text => {
          triggerBurnWorryInCampfire(el, text);
        });
      };
    });

    // 點擊枝頭微光燈籠：送出「🫂 拍拍」並飛入暖心光點
    el.querySelectorAll('[data-tree-lantern]').forEach(lantern => {
      lantern.onclick = async e => {
        e.stopPropagation();
        const vid = lantern.dataset.treeLantern;
        pendingPlaneOpts = {
          leftPct: 50,
          topPct: 53,
          text: '🫂 已為夥伴送上溫暖拍拍與打氣星光！',
          symbol: '🫂',
        };
        await toggleVentReaction(vid, 'hug');
        render();

        const card = el.querySelector(`[data-vent-card="${CSS.escape(vid)}"]`);
        if (card) {
          card.classList.remove('th-card-highlight');
          void card.offsetWidth;
          card.classList.add('th-card-highlight');
        }
      };
    });

    // 點擊樹洞背景空白處也可試射一架森林紙飛機
    const thScene = el.querySelector('[data-th-scene]');
    if (thScene) {
      thScene.onclick = e => {
        if (e.target.closest('[data-tree-lantern],[data-new-vent],[data-th-burn-btn]')) return;
        triggerPaperPlaneToHollow(el, {
          leftPct: 50,
          topPct: 53,
          text: '✈️ 點擊中央「古樹洞」寫下心聲，或點左下「營火」燒掉鳥事！',
          symbol: '🍃',
        });
      };
    }

    el.querySelectorAll('[data-new-vent]').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        openNewVentModal(() => {
          pendingPlaneOpts = {
            leftPct: 50,
            topPct: 53,
            text: '✈️ 心聲已飛入千年樹洞，並化為枝頭暖燈！',
            symbol: '✈️',
          };
          render();
        });
      };
    });

    el.querySelectorAll('[data-vent-rx]').forEach(btn => {
      btn.onclick = async () => {
        const rxType = btn.dataset.rxType;
        const emojiMap = { hug: '🫂', cry: '😭', cheer: '💪' };
        el.querySelector('[data-th-stage]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        pendingPlaneOpts = {
          leftPct: 50,
          topPct: 53,
          text: `${emojiMap[rxType] || '🫂'} 溫暖打氣已傳遞至古樹洞！`,
          symbol: emojiMap[rxType] || '🫂',
        };
        await toggleVentReaction(btn.dataset.ventRx, rxType);
        render();
      };
    });

    el.querySelectorAll('[data-toggle-vreply]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.toggleVreply;
        if (expandedReplyIds.has(id)) expandedReplyIds.delete(id);
        else expandedReplyIds.add(id);
        render();
      };
    });

    el.querySelectorAll('[data-vreply-form]').forEach(form => {
      form.onsubmit = async e => {
        e.preventDefault();
        const vid = form.dataset.vreplyForm;
        const text = form.text.value.trim();
        const isAnon = form.anon.checked;
        if (!text) return;
        await addVentReply(vid, { text, isAnonymous: isAnon });
        toast('已送出暖心留言！');
        render();
      };
    });

    el.querySelectorAll('[data-del-vent]').forEach(btn => {
      btn.onclick = async () => {
        const vid = btn.dataset.delVent;
        if (!(await confirmDialog('確定要刪除這篇意見／吐苦水嗎？', { danger: true, okText: '刪除' }))) return;
        await deleteVentItem(vid);
        toast('已刪除');
        render();
      };
    });
  }

  render();
  return { onData: render };
}

// 🔥 壓箱寶彈窗：純發洩、不進資料庫的「把煩惱丟進營火燒成灰燼」
function openBurnWorryModal(onBurn) {
  openModal(`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #f1f5f9">
      <div style="display:flex;align-items:center;gap:10px;min-width:0">
        <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#fb923c 0%,#dc2626 100%);display:grid;place-items:center;font-size:21px;box-shadow:0 4px 12px rgba(220,38,38,0.3);flex-shrink:0">🔥</div>
        <div style="min-width:0">
          <h3 style="margin:0;font-size:17px;font-weight:800;color:#0f172a">把鳥事丟進營火燒成灰燼</h3>
          <div style="font-size:12px;color:#64748b;margin-top:2px">100% 純發洩解壓 · 絕不寫入資料庫 · 燒完隨風消散</div>
        </div>
      </div>
      <button type="button" class="icon-btn" data-close style="flex-shrink:0">✕</button>
    </div>

    <form class="form" id="burn-worry-form" style="gap:16px">
      <div style="display:flex;align-items:flex-start;gap:10px;background:linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%);border:1px solid #fed7aa;color:#9a3412;padding:11px 14px;border-radius:12px;font-size:12.5px;line-height:1.55">
        <span style="font-size:18px;line-height:1.2">🔥</span>
        <div>有些話只想痛快罵出來、不想留在版上？寫在這張森林羊皮紙上，按下「<b>丟進營火燒毀</b>」，它會在營火中化為灰燼與漫天火星徹底消失！</div>
      </div>

      <div class="field">
        <span>📜 想燒掉的鳥事、委屈或怒氣 <em>*</em></span>
        <textarea name="worry" rows="4" required placeholder="盡情把今天遇到的雷包、鳥事或壞心情寫下來，寫完直接丟進火裡燒掉…" style="width:100%;padding:10px 12px;border-radius:10px;resize:vertical;line-height:1.55;background:#fffbeb;border-color:#fcd34d"></textarea>
      </div>

      <div style="display:flex;justify-content:flex-end;align-items:center;gap:10px;padding-top:12px;border-top:1px solid #f1f5f9">
        <button type="button" class="btn" data-close style="padding:8px 18px;border-radius:10px">取消</button>
        <button type="submit" class="btn primary" style="padding:8px 20px;border-radius:10px;background:linear-gradient(135deg,#f97316,#dc2626);border-color:#ea580c;color:#fff;box-shadow:0 4px 14px rgba(220,38,38,0.35)">🔥 丟進營火燒成灰燼</button>
      </div>
    </form>
  `);

  document.getElementById('burn-worry-form').onsubmit = e => {
    e.preventDefault();
    const text = e.target.worry.value.trim();
    closeModal();
    onBurn?.(text.slice(0, 18));
  };
}

function openNewVentModal(onDone) {
  const moods = ['😤', '😮‍💨', '🤯', '🌧️', '🫠', '🤬', '🙏', '💡'];
  openModal(`
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #f1f5f9">
      <div style="display:flex;align-items:center;gap:10px;min-width:0">
        <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#34d399 0%,#059669 100%);display:grid;place-items:center;font-size:21px;box-shadow:0 4px 12px rgba(16,185,129,0.3);flex-shrink:0">✈️</div>
        <div style="min-width:0">
          <h3 style="margin:0;font-size:17px;font-weight:800;color:#0f172a">向古樹洞傾訴心聲／提意見</h3>
          <div style="font-size:12px;color:#64748b;margin-top:2px">100% 零追蹤匿名保護 · 化為枝頭暖燈讓夥伴拍拍打氣</div>
        </div>
      </div>
      <button type="button" class="icon-btn" data-close style="flex-shrink:0">✕</button>
    </div>

    <form class="form" id="vent-form" style="gap:16px">
      <div style="display:flex;align-items:flex-start;gap:10px;background:#F0FDF4;border:1px solid #BBF7D0;color:#166534;padding:11px 14px;border-radius:12px;font-size:12.5px;line-height:1.55">
        <span style="font-size:18px;line-height:1.2">🛡️</span>
        <div><b>隱私保證：</b>勾選「🥷 完全匿名發表」時，系統會隨機分配一個單車代號（如：匿名單車客 🚲），且<b>連資料庫都不會記錄您的 UID</b>，任何人與管理員皆無法得知您的身分。</div>
      </div>

      <div class="row2">
        <div class="field">
          <span>🙋 發表身分</span>
          <select name="isAnonymous" style="width:100%;padding:9px 12px;border-radius:10px">
            <option value="1" selected>🥷 完全匿名發表（隨機單車代號）</option>
            <option value="0">🙋‍♂️ 具名發表（顯示我的名字）</option>
          </select>
        </div>
        <div class="field">
          <span>🏷️ 主題分類</span>
          <select name="category" style="width:100%;padding:9px 12px;border-radius:10px">
            ${VENT_CATEGORIES.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="field">
        <span>🎭 當下心情圖示（將顯示於古樹枝頭燈籠上）</span>
        <div class="chips" style="padding:4px 0;display:flex;gap:8px;flex-wrap:wrap">
          ${moods.map((m, idx) => `
            <label class="chip-check" style="cursor:pointer">
              <input type="radio" name="mood" value="${m}" ${idx === 0 ? 'checked' : ''}>
              <span style="font-size:19px;padding:4px 8px">${m}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="field">
        <span>💬 想吐的苦水或建議內容 <em>*</em></span>
        <textarea name="content" rows="4" required placeholder="把在職場上遇到的鳥事、跨部門卡關、外勤委屈或真心建議暢快寫下來吧…" style="width:100%;padding:10px 12px;border-radius:10px;resize:vertical;line-height:1.55"></textarea>
      </div>

      <div style="display:flex;justify-content:flex-end;align-items:center;gap:10px;padding-top:12px;border-top:1px solid #f1f5f9">
        <button type="button" class="btn" data-close style="padding:8px 18px;border-radius:10px">取消</button>
        <button type="submit" class="btn primary" style="padding:8px 20px;border-radius:10px;box-shadow:0 4px 14px rgba(245,172,0,0.35)">✈️ 摺成紙飛機送入樹洞</button>
      </div>
    </form>
  `);

  document.getElementById('vent-form').onsubmit = async e => {
    e.preventDefault();
    const f = e.target;
    const isAnonymous = f.isAnonymous.value === '1';
    const mood = f.querySelector('input[name="mood"]:checked')?.value || '😤';
    await createVentItem({
      content: f.content.value.trim(),
      category: f.category.value,
      isAnonymous,
      mood,
    });
    closeModal();
    toast(isAnonymous ? '🥷 已完全匿名射入古樹洞！辛苦了，給你一個擁抱 🫂' : '✈️ 心聲已射入古樹洞並化為枝頭暖燈！');
    onDone?.();
  };
}
