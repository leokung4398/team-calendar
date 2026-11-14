// 改善提案・半年量化養成系統：【微笑單車・未來城市建造島】＆【楓之谷・天空之城建造島】
// - 專為改善提案負責人 包于巧 (Yu-Qiao) 量身打造，同時掛載於「每日回報 (#/dailyReport) 包于巧個人卡片」與「改善提案專區 (#/kaizen)」
// - 支援「半年計算（2026 上半年 H1 / 2026 下半年 H2）」雙賽季切換與即時雲端同步（toolsData/kaizenIsland）
// - 100% 支援包于巧本人（及主管/管理員）自由填寫與自訂：
//   1. 半年總目標件數（分母）＆ 目前已完成件數（分子，可選「由 4 大地標自動加總」或「手動自訂總數」）
//   2. 島嶼 4 大地標 / 階段子項目（名稱、地標建築名、目前數字、目標數字、快捷 +1/-1 按鈕）
// - 當全站切換為 data-theme="maple"（楓之谷主題）時，自動變身為「楓之谷・天空之城與弓箭手村建造島」！

import { state, isAdmin, isSupervisor, isSystemDesigner, isFieldDeputy, saveToolsDoc } from './data.js';
import { esc, toast, openModal, closeModal, ymd } from './utils.js';
import { triggerMapleLevelUpEffect } from './yb.js';

const KAIZEN_ISLAND_DOC_ID = 'kaizenIsland';

// 預設 4 大島嶼地標配置（同時提供經典城市版與楓之谷版地標名稱，使用者亦可自訂覆寫）
const DEFAULT_LANDMARKS = [
  {
    id: 'lm_station',
    code: 'ZONE 01',
    name: '收件初審・日常提案',
    cityBuilding: '綠能電輔車站',
    mapleBuilding: '弓箭手村蘑菇屋',
    icon: '🚲',
    mapleIcon: '🍄',
    pos: { left: 26, top: 47 },
    current: 8,
    target: 15,
  },
  {
    id: 'lm_bridge',
    code: 'ZONE 02',
    name: '單位核定・5~7等立案',
    cityBuilding: '跨河景觀單車橋',
    mapleBuilding: '魔法森林飛船碼頭',
    icon: '🌉',
    mapleIcon: '⛵',
    pos: { left: 48, top: 72 },
    current: 6,
    target: 12,
  },
  {
    id: 'lm_hub',
    code: 'ZONE 03',
    name: '高等審查・跨處優化',
    cityBuilding: '智慧自動化總倉',
    mapleBuilding: '玩具城積木工坊',
    icon: '🏭',
    mapleIcon: '🧸',
    pos: { left: 73, top: 47 },
    current: 3,
    target: 8,
  },
  {
    id: 'lm_tower',
    code: 'ZONE 04',
    name: '獎勵結案・月會表揚',
    cityBuilding: '創新市政鐘樓中心',
    mapleBuilding: '天空之城女神塔',
    icon: '🏛️',
    mapleIcon: '🏰',
    pos: { left: 50, top: 24 },
    current: 2,
    target: 5,
  },
];

// 預設賽季初始資料
function createDefaultSeasonData(seasonKey) {
  const isH1 = String(seasonKey).endsWith('H1');
  return {
    seasonKey,
    seasonLabel: isH1 ? '2026 上半年 (1~6月)' : '2026 下半年 (7~12月)',
    calcMode: 'sum', // 'sum' (由4大地標自動加總分子/分母) | 'manual' (手動直接指定半年總分子/分母)
    manualCurrent: 19,
    manualTarget: 40,
    islandSubtitle: '每完成 1 件改善提案審查，就為島嶼點亮一座新地標！',
    landmarks: DEFAULT_LANDMARKS.map(lm => ({ ...lm })),
    updatedAtIso: '',
    updatedByName: '包于巧',
  };
}

/** 根據台灣當前月份取得預設半年賽季 Key ('2026-H1' 或 '2026-H2') */
export function getCurrentHalfYearKey() {
  const d = ymd(); // YYYY-MM-DD (Taiwan UTC+8)
  const [y, m] = d.split('-');
  const monthNum = Number(m) || 1;
  return `${y}-${monthNum <= 6 ? 'H1' : 'H2'}`;
}

/** 判斷目前登入者是否可編輯「改善提案建造島」數字（包于巧本人、主管徐嘉鴻、系統設計者孔令淳、管理員） */
export function canEditKaizenIsland(user = state.me) {
  if (!user) return false;
  return isFieldDeputy(user) || isSupervisor(user) || isSystemDesigner(user) || isAdmin();
}

/** 判斷指定組員是否為改善提案負責人（包于巧） */
export function isKaizenManagerUser(u) {
  if (!u) return false;
  const name = u.displayName || '';
  const email = String(u.email || '').toLowerCase();
  return name.includes('包于巧') || email.startsWith('ciaopao@');
}

// 記錄哪些視圖展開了 3D 島嶼舞台（預設在 #/kaizen 展開、在 #/dailyReport 可一鍵展開且記憶狀態）
const expandedIslandSet = new Set(['kaizen_main']);
// 目前檢視中的半年賽季 Key
let activeSeasonKey = null;

/** 讀取並正規化雲端 kaizenIsland 資料 */
export function getKaizenIslandState(seasonKeyOverride = null) {
  const defaultKey = getCurrentHalfYearKey();
  const sKey = seasonKeyOverride || activeSeasonKey || defaultKey;
  activeSeasonKey = sKey;

  const rawDoc = state.toolsData.get(KAIZEN_ISLAND_DOC_ID) || {};
  const seasons = rawDoc.seasons || {};
  const base = createDefaultSeasonData(sKey);
  const saved = seasons[sKey] || {};

  const mergedLandmarks = DEFAULT_LANDMARKS.map((defLm, idx) => {
    const savedLm = Array.isArray(saved.landmarks)
      ? (saved.landmarks.find(x => x.id === defLm.id) || saved.landmarks[idx] || {})
      : {};
    const cur = Math.max(0, Number(savedLm.current ?? defLm.current) || 0);
    const tgt = Math.max(1, Number(savedLm.target ?? defLm.target) || 1);
    const pct = Math.max(0, Math.min(100, Math.round((cur / tgt) * 100)));
    const remain = Math.max(0, tgt - cur);
    let stageLabel = '規劃打樁中';
    let stageTone = 'seed';
    if (pct >= 100) { stageLabel = '地標已落成 ✨'; stageTone = 'max'; }
    else if (pct >= 60) { stageLabel = '主體完工 80%'; stageTone = 'high'; }
    else if (pct >= 25) { stageLabel = '熱烈興建中'; stageTone = 'mid'; }

    return {
      ...defLm,
      name: String(savedLm.name || defLm.name).trim(),
      cityBuilding: String(savedLm.cityBuilding || defLm.cityBuilding).trim(),
      mapleBuilding: String(savedLm.mapleBuilding || defLm.mapleBuilding).trim(),
      current: cur,
      target: tgt,
      pct,
      remain,
      stageLabel,
      stageTone,
    };
  });

  const calcMode = saved.calcMode === 'manual' ? 'manual' : 'sum';
  const sumCurrent = mergedLandmarks.reduce((acc, x) => acc + x.current, 0);
  const sumTarget = mergedLandmarks.reduce((acc, x) => acc + x.target, 0);

  const totalCurrent = calcMode === 'manual'
    ? Math.max(0, Number(saved.manualCurrent ?? sumCurrent) || 0)
    : sumCurrent;
  const totalTarget = calcMode === 'manual'
    ? Math.max(1, Number(saved.manualTarget ?? sumTarget) || 1)
    : Math.max(1, sumTarget);

  const progressPct = Math.max(0, Math.min(100, Math.round((totalCurrent / totalTarget) * 100)));
  const totalRemain = Math.max(0, totalTarget - totalCurrent);
  const overAchieved = Math.max(0, totalCurrent - totalTarget);

  // 島嶼繁榮度等級
  let islandLv = { lv: 'LV.1', title: '新生綠芽島', mapleTitle: '維多利亞初心島', tone: 'lv1', badge: '🌱 初階開拓' };
  if (progressPct >= 100) {
    islandLv = { lv: 'LV.MAX', title: '黃金未來微笑城', mapleTitle: '天空之城傳說聖域', tone: 'lv4', badge: '👑 半年目標完美達陣' };
  } else if (progressPct >= 70) {
    islandLv = { lv: 'LV.3', title: '智慧綠能示範島', mapleTitle: '玩具城星光飛島', tone: 'lv3', badge: '🚀 繁榮衝刺期' };
  } else if (progressPct >= 35) {
    islandLv = { lv: 'LV.2', title: '活力單車綠洲島', mapleTitle: '弓箭手村蘑菇島', tone: 'lv2', badge: '🏗️ 建設加速中' };
  }

  return {
    seasonKey: sKey,
    seasonLabel: saved.seasonLabel || base.seasonLabel,
    calcMode,
    manualCurrent: Math.max(0, Number(saved.manualCurrent ?? sumCurrent) || 0),
    manualTarget: Math.max(1, Number(saved.manualTarget ?? sumTarget) || 1),
    totalCurrent,
    totalTarget,
    progressPct,
    totalRemain,
    overAchieved,
    islandSubtitle: String(saved.islandSubtitle || base.islandSubtitle).trim(),
    landmarks: mergedLandmarks,
    islandLv,
    updatedAtIso: saved.updatedAtIso || '',
    updatedByName: saved.updatedByName || '包于巧',
    rawSeasons: seasons,
  };
}

/** 儲存指定半年賽季的建造島資料至 Firestore */
export async function saveKaizenIslandSeason(seasonKey, seasonPayload) {
  const rawDoc = state.toolsData.get(KAIZEN_ISLAND_DOC_ID) || {};
  const nextSeasons = {
    ...(rawDoc.seasons || {}),
    [seasonKey]: {
      ...seasonPayload,
      seasonKey,
      updatedAtIso: new Date().toISOString(),
      updatedByName: state.me?.displayName || '包于巧',
    },
  };
  await saveToolsDoc(KAIZEN_ISLAND_DOC_ID, {
    activeSeasonKey: seasonKey,
    seasons: nextSeasons,
  });
}

/**
 * 渲染「微笑單車・未來城市建造島（或楓之谷・天空之城建造島）」主卡片
 * @param {Object} opts
 * @param {string} opts.contextId - 'daily_card' (在每日回報包于巧卡片內) | 'kaizen_main' (在改善提案專區頂部)
 * @param {boolean} opts.compact - 是否為緊湊模式
 */
export function renderKaizenIslandWidget({ contextId = 'daily_card', compact = false } = {}) {
  const isMaple = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'maple';
  const ks = getKaizenIslandState();
  const canEdit = canEditKaizenIsland();
  const isStageOpen = expandedIslandSet.has(contextId);

  const islandImg = isMaple
    ? 'assets/kaizen/kaizen_island_maple.jpg?v=20261114v71'
    : 'assets/kaizen/kaizen_island_city.jpg?v=20261114v71';

  const islandMainTitle = isMaple
    ? '《楓之谷・改善提案天空之城建造島》'
    : '《微笑單車・未來城市改善提案建造島》';

  const lvTitle = isMaple ? ks.islandLv.mapleTitle : ks.islandLv.title;

  const seasonOptions = [
    { key: '2026-H1', label: '2026 上半年 (H1)' },
    { key: '2026-H2', label: '2026 下半年 (H2)' },
    { key: '2027-H1', label: '2027 上半年 (H1)' },
  ];

  const renderHotspot = (lm, idx) => {
    const bName = isMaple ? lm.mapleBuilding : lm.cityBuilding;
    const bIcon = isMaple ? lm.mapleIcon : lm.icon;
    const isMax = lm.pct >= 100;
    return `
      <div class="kz-island-hotspot ${lm.stageTone} ${isMax ? 'is-completed' : ''}"
           style="left:${lm.pos.left}%; top:${lm.pos.top}%;"
           data-kz-spot-idx="${idx}"
           title="${esc(lm.name)}｜${esc(bName)}：目前 ${lm.current} / 目標 ${lm.target} 件（${lm.pct}%）">
        <div class="kz-spot-beacon">
          <span class="kz-spot-pulse"></span>
          <span class="kz-spot-icon">${bIcon}</span>
        </div>
        <div class="kz-spot-card">
          <div class="kz-spot-top">
            <span class="kz-spot-name">${esc(lm.name)}</span>
            <strong class="kz-spot-num">${lm.current}<small>/${lm.target}</small></strong>
          </div>
          <div class="kz-spot-bldg">${esc(bName)} ${isMax ? '✨' : ''}</div>
          <div class="kz-spot-bar">
            <span style="width:${lm.pct}%"></span>
          </div>
          ${canEdit ? `
            <div class="kz-spot-quick-btns">
              <button type="button" class="kz-spot-step-btn" data-kz-step-idx="${idx}" data-kz-step-delta="-1" title="減少 1 件">-1</button>
              <button type="button" class="kz-spot-step-btn plus" data-kz-step-idx="${idx}" data-kz-step-delta="1" title="完成 +1 件提案！">+1 件</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  };

  const renderLandmarkBox = (lm, idx) => {
    const bName = isMaple ? lm.mapleBuilding : lm.cityBuilding;
    const bIcon = isMaple ? lm.mapleIcon : lm.icon;
    return `
      <div class="kz-lm-box ${lm.stageTone}">
        <div class="kz-lm-head">
          <div class="kz-lm-title-wrap">
            <span class="kz-lm-emoji">${bIcon}</span>
            <div>
              <div class="kz-lm-name">${esc(lm.name)}</div>
              <div class="kz-lm-sub">${esc(bName)} · <span class="kz-lm-stage-tag">${esc(lm.stageLabel)}</span></div>
            </div>
          </div>
          <div class="kz-lm-Right">
            <div class="kz-lm-ratio">
              <strong>${lm.current}</strong><span>/ ${lm.target} 件</span>
            </div>
            <div class="kz-lm-pct">${lm.pct}% ${lm.remain > 0 ? `（差 ${lm.remain} 件）` : '🎉 達標'}</div>
          </div>
        </div>
        <div class="kz-lm-bar-track">
          <div class="kz-lm-bar-fill" style="width:${lm.pct}%"></div>
        </div>
        ${canEdit ? `
          <div class="kz-lm-ctrl-row">
            <span class="kz-lm-ctrl-hint">快速增減或直接輸入：</span>
            <div class="kz-lm-ctrl-actions">
              <button type="button" class="kz-mini-btn" data-kz-step-idx="${idx}" data-kz-step-delta="-1">-1</button>
              <input type="number" class="kz-inline-num-input" data-kz-direct-cur="${idx}" value="${lm.current}" min="0" max="999" title="直接修改目前件數">
              <span class="kz-slash">/</span>
              <input type="number" class="kz-inline-num-input target" data-kz-direct-tgt="${idx}" value="${lm.target}" min="1" max="999" title="直接修改半年目標件數">
              <button type="button" class="kz-mini-btn plus" data-kz-step-idx="${idx}" data-kz-step-delta="1">+1 件</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  };

  return `
    <div class="kz-island-widget ${ks.islandLv.tone} ${compact ? 'is-compact' : 'is-full'}" data-kz-island-root="${esc(contextId)}">
      <!-- 頂部島嶼榮譽橫幅 -->
      <div class="kz-island-header">
        <div class="kz-ih-left">
          <div class="kz-ih-avatar-wrap" data-kz-toggle-stage="${esc(contextId)}" title="點擊展開/收合 3D 未來城市建造島地圖">
            <img src="${esc(islandImg)}" alt="改善提案建造島" class="kz-ih-thumb">
            <span class="kz-ih-lv-pill">${esc(ks.islandLv.lv)}</span>
          </div>
          <div class="kz-ih-info">
            <div class="kz-ih-badge-row">
              <select class="kz-season-select" data-kz-season-select title="切換上半年 / 下半年計算賽季">
                ${seasonOptions.map(opt => `<option value="${esc(opt.key)}" ${opt.key === ks.seasonKey ? 'selected' : ''}>${esc(opt.label)}</option>`).join('')}
              </select>
              <span class="kz-ih-prosperity-badge">${esc(ks.islandLv.badge)}</span>
              ${canEdit ? `
                <button type="button" class="kz-edit-modal-btn" data-kz-open-editor title="由包于巧自由設定半年目標、目前件數與 4 大子項目名稱">
                  ✏️ 自訂半年數字與地標
                </button>
              ` : ''}
            </div>
            <div class="kz-ih-title">
              <strong>${esc(islandMainTitle)}</strong>
              <span class="kz-ih-lv-name">｜${esc(lvTitle)}</span>
            </div>
            <div class="kz-ih-subtitle">${esc(ks.islandSubtitle)}</div>
          </div>
        </div>

        <div class="kz-ih-right">
          <div class="kz-ih-score-label">半年累計完成 / 半年總目標</div>
          <div class="kz-ih-score-nums">
            <strong class="kz-ih-cur">${ks.totalCurrent}</strong>
            <span class="kz-ih-max">/ ${ks.totalTarget} 件</span>
          </div>
          <div class="kz-ih-remain-sub">
            ${ks.totalRemain > 0
              ? `距離半年目標還差 <b>${ks.totalRemain} 件</b>（達成率 <b>${ks.progressPct}%</b>）`
              : `🎉 已完美達標！超額完成 <b>+${ks.overAchieved} 件</b>（<b>${ks.progressPct}%</b>）`}
          </div>
        </div>
      </div>

      <!-- 島嶼建設總進度條（10段式能量槽） -->
      <div class="kz-island-main-bar-wrap">
        <div class="kz-island-bar-track">
          <div class="kz-island-bar-fill" style="width:${ks.progressPct}%"></div>
          <div class="kz-island-bar-notches"></div>
        </div>
        <div class="kz-island-bar-meta">
          <button type="button" class="kz-island-stage-toggle" data-kz-toggle-stage="${esc(contextId)}">
            <span>${isStageOpen ? '▴' : '▾'}</span>
            <span>${isStageOpen
              ? '收合 3D 建造島地圖與 4 大子項目明細'
              : `展開 3D 未來城市建造島（4 大地標進度：${ks.landmarks.map(l => `${l.current}/${l.target}`).join(' · ')}）`}</span>
          </button>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            ${canEdit ? `
              <button type="button" class="kz-quick-plus-hero-btn" data-kz-open-editor>
                ＋ 填寫/更新提案數字
              </button>
            ` : ''}
            <span>島嶼完工度 <b>${ks.progressPct}%</b></span>
          </div>
        </div>
      </div>

      <!-- 可收合的 3D 微縮城市建造舞台 ＆ 4 大子項目即時控制台 -->
      <div class="kz-island-collapsible" ${isStageOpen ? '' : 'hidden'}>
        <div class="kz-island-visual-stage">
          <img src="${esc(islandImg)}" alt="${esc(islandMainTitle)}" class="kz-island-stage-img" loading="lazy">
          <div class="kz-island-stage-vignette"></div>

          <!-- 左上角賽季與建造模式浮水印 -->
          <div class="kz-stage-top-hud">
            <span class="kz-hud-pill">🏝️ ${esc(ks.seasonLabel)}</span>
            <span class="kz-hud-pill gold">✨ 已點亮 ${ks.landmarks.filter(l => l.pct >= 100).length} / 4 座地標</span>
          </div>

          <!-- 4 大地標互動熱區 -->
          <div class="kz-island-hotspots-layer">
            ${ks.landmarks.map(renderHotspot).join('')}
          </div>

          <!-- 底部提示列 -->
          <div class="kz-stage-bottom-hud">
            <span>💡 點擊島上地標建築的「<b>+1 件</b>」即可直接增加進度並升級地標！</span>
            ${canEdit ? `<button type="button" class="kz-hud-edit-btn" data-kz-open-editor>⚙️ 完整自訂 4 大子項目與半年總數</button>` : ''}
          </div>
        </div>

        <!-- 4 大地標/子項目詳細進度與直接輸入面板 -->
        <div class="kz-landmarks-panel">
          <div class="kz-lp-header">
            <div>
              <strong>🏗️ 島嶼 4 大改善提案子項目（地標建築進度）</strong>
              <span class="muted tiny" style="margin-left:6px">
                ${ks.calcMode === 'manual'
                  ? '目前總數採「手動指定半年總數」模式'
                  : '目前半年總進度由下方 4 大子項目自動加總'}
              </span>
            </div>
            ${canEdit ? `
              <button type="button" class="btn sm primary" data-kz-open-editor style="padding:4px 12px;font-size:12px">
                ✏️ 修改項目名稱與半年目標
              </button>
            ` : ''}
          </div>
          <div class="kz-landmarks-grid">
            ${ks.landmarks.map(renderLandmarkBox).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * 綁定「改善提案建造島」所有互動事件（展開收合、切換上下半年、+1/-1 快速增減、直接改數字、開啟完整自訂彈窗）
 */
export function bindKaizenIslandEvents(containerEl, onRerender) {
  if (!containerEl) return;

  // 1. 切換上半年 / 下半年賽季
  containerEl.querySelectorAll('[data-kz-season-select]').forEach(sel => {
    sel.onchange = e => {
      activeSeasonKey = e.target.value;
      onRerender?.();
    };
  });

  // 2. 展開 / 收合 3D 島嶼舞台
  containerEl.querySelectorAll('[data-kz-toggle-stage]').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const ctxId = btn.dataset.kzToggleStage || 'daily_card';
      if (expandedIslandSet.has(ctxId)) expandedIslandSet.delete(ctxId);
      else expandedIslandSet.add(ctxId);
      onRerender?.();
    };
  });

  // 3. 地標快捷 +1 / -1 按鈕
  containerEl.querySelectorAll('[data-kz-step-idx]').forEach(btn => {
    btn.onclick = async e => {
      e.stopPropagation();
      if (!canEditKaizenIsland()) return toast('僅包于巧本人或主管可調整改善提案數字喔！', 'info');
      const idx = Number(btn.dataset.kzStepIdx);
      const delta = Number(btn.dataset.kzStepDelta) || 0;
      const ks = getKaizenIslandState();
      const lm = ks.landmarks[idx];
      if (!lm) return;

      const prevPct = lm.pct;
      const nextCur = Math.max(0, lm.current + delta);
      const nextLandmarks = ks.landmarks.map((item, i) =>
        i === idx ? { ...item, current: nextCur } : { ...item }
      );
      const nextManualCurrent = ks.calcMode === 'manual'
        ? Math.max(0, ks.manualCurrent + delta)
        : nextLandmarks.reduce((s, x) => s + x.current, 0);

      await saveKaizenIslandSeason(ks.seasonKey, {
        seasonLabel: ks.seasonLabel,
        calcMode: ks.calcMode,
        manualCurrent: nextManualCurrent,
        manualTarget: ks.manualTarget,
        islandSubtitle: ks.islandSubtitle,
        landmarks: nextLandmarks,
      });

      const newPct = Math.round((nextCur / lm.target) * 100);
      const isMaple = document.documentElement.getAttribute('data-theme') === 'maple';
      const bName = isMaple ? lm.mapleBuilding : lm.cityBuilding;
      if (delta > 0 && newPct >= 100 && prevPct < 100) {
        triggerMapleLevelUpEffect(`🎉 恭喜落成！【${bName}】已達成 100% 半年目標！`);
      } else if (delta > 0) {
        toast(`🏗️ 【${lm.name}】+${delta} 件！（目前 ${nextCur} / ${lm.target} 件）`);
      } else {
        toast(`已調整【${lm.name}】為 ${nextCur} / ${lm.target} 件`);
      }
      onRerender?.();
    };
  });

  // 4. 行內直接輸入分子（目前件數）或分母（目標件數）
  const handleDirectInputChange = async (idx, field, val) => {
    if (!canEditKaizenIsland()) return;
    const ks = getKaizenIslandState();
    const numVal = field === 'target' ? Math.max(1, Number(val) || 1) : Math.max(0, Number(val) || 0);
    const nextLandmarks = ks.landmarks.map((item, i) =>
      i === idx ? { ...item, [field]: numVal } : { ...item }
    );
    await saveKaizenIslandSeason(ks.seasonKey, {
      seasonLabel: ks.seasonLabel,
      calcMode: ks.calcMode,
      manualCurrent: ks.manualCurrent,
      manualTarget: ks.manualTarget,
      islandSubtitle: ks.islandSubtitle,
      landmarks: nextLandmarks,
    });
    toast(`已更新【${ks.landmarks[idx]?.name || '地標'}】數字！`);
    onRerender?.();
  };

  containerEl.querySelectorAll('[data-kz-direct-cur]').forEach(inp => {
    inp.onchange = e => handleDirectInputChange(Number(inp.dataset.kzDirectCur), 'current', e.target.value);
  });
  containerEl.querySelectorAll('[data-kz-direct-tgt]').forEach(inp => {
    inp.onchange = e => handleDirectInputChange(Number(inp.dataset.kzDirectTgt), 'target', e.target.value);
  });

  // 5. 開啟完整「包于巧專屬・半年改善提案數字與地標自訂彈窗」
  containerEl.querySelectorAll('[data-kz-open-editor]').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      openKaizenIslandEditorModal(onRerender);
    };
  });
}

/**
 * 彈窗：讓包于巧自由填寫半年總數（分子/分母）與 4 大地標子項目（名稱、地標名、目前數、目標數）
 */
export function openKaizenIslandEditorModal(onSaved) {
  const ks = getKaizenIslandState();
  const isMaple = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'maple';

  openModal(`
    <div class="modal-head" style="padding-bottom:12px;border-bottom:1px solid #e2e8f0;margin-bottom:14px">
      <div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="yb-sum-pill" style="background:#fef3c7;color:#b45309;border:1px solid #fde68a;font-weight:800">包于巧專屬・半年量化控制台</span>
          <strong style="font-size:18px;color:#0f172a">🏝️ 自訂改善提案「半年目標＆4大地標數字」</strong>
        </div>
        <div class="muted tiny" style="margin-top:4px">
          這裡修改的數字會即時同步到「<b>每日回報（包于巧個人卡片）</b>」與「<b>改善提案專區</b>」！分子、分母、子項目名稱都可以自由填寫。
        </div>
      </div>
      <button type="button" class="icon-btn" data-close>✕</button>
    </div>

    <form id="kz-island-editor-form" class="form" style="gap:14px;max-height:75vh;overflow-y:auto;padding-right:4px">
      <!-- 賽季與計算模式設定 -->
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="field">
          <span>計分半年賽季</span>
          <select name="seasonKey" id="kz-modal-season-sel" style="font-weight:700">
            <option value="2026-H1" ${ks.seasonKey === '2026-H1' ? 'selected' : ''}>2026 上半年 (1~6月 · H1)</option>
            <option value="2026-H2" ${ks.seasonKey === '2026-H2' ? 'selected' : ''}>2026 下半年 (7~12月 · H2)</option>
            <option value="2027-H1" ${ks.seasonKey === '2027-H1' ? 'selected' : ''}>2027 上半年 (1~6月 · H1)</option>
          </select>
        </div>
        <div class="field">
          <span>半年總數計算方式</span>
          <select name="calcMode" id="kz-modal-calc-mode" style="font-weight:700">
            <option value="sum" ${ks.calcMode === 'sum' ? 'selected' : ''}>自動由下方 4 大子項目加總（推薦）</option>
            <option value="manual" ${ks.calcMode === 'manual' ? 'selected' : ''}>手動直接指定半年總完成數 / 總目標數</option>
          </select>
        </div>
      </div>

      <!-- 手動指定半年總分子 / 分母區塊（當選 manual 時醒目顯示，選 sum 時也可預覽） -->
      <div id="kz-manual-total-box" style="background:#fffbeb;border:1.5px solid #fcd34d;border-radius:12px;padding:12px 14px;display:${ks.calcMode === 'manual' ? 'grid' : 'none'};grid-template-columns:1fr 1fr;gap:12px">
        <div class="field">
          <span>🎯 手動填寫：半年目前累計完成件數（分子）</span>
          <input type="number" name="manualCurrent" value="${ks.manualCurrent}" min="0" max="9999" style="font-size:16px;font-weight:800;color:#0f172a">
        </div>
        <div class="field">
          <span>🏁 手動填寫：半年總目標件數（分母）</span>
          <input type="number" name="manualTarget" value="${ks.manualTarget}" min="1" max="9999" style="font-size:16px;font-weight:800;color:#b45309">
        </div>
      </div>

      <!-- 4 大島嶼地標 / 子項目自訂表 -->
      <div style="background:#ffffff;border:1px solid #cbd5e1;border-radius:12px;padding:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px">
          <strong style="font-size:14px;color:#0f172a">🏗️ 島嶼 4 大子項目 / 地標部位設定（名稱、目前件數、目標件數皆可自訂）</strong>
          <span class="muted tiny">每當子項目達 100%，島上對應地標就會發光落成！</span>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px">
          ${ks.landmarks.map((lm, i) => `
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;display:grid;grid-template-columns:36px 1.3fr 1.1fr 95px 95px;gap:8px;align-items:end" class="kz-modal-lm-row">
              <div style="font-size:22px;text-align:center;padding-bottom:4px">${isMaple ? lm.mapleIcon : lm.icon}</div>
              <div class="field">
                <span>子項目 ${i + 1} 名稱（考核/階段）</span>
                <input type="text" name="lm_name_${i}" value="${esc(lm.name)}" required>
              </div>
              <div class="field">
                <span>對應島嶼地標建築名</span>
                <input type="text" name="lm_bldg_${i}" value="${esc(isMaple ? lm.mapleBuilding : lm.cityBuilding)}" required>
              </div>
              <div class="field">
                <span>目前數字(分子)</span>
                <input type="number" name="lm_cur_${i}" value="${lm.current}" min="0" max="999" required style="font-weight:800;color:#0369a1">
              </div>
              <div class="field">
                <span>半年目標(分母)</span>
                <input type="number" name="lm_tgt_${i}" value="${lm.target}" min="1" max="999" required style="font-weight:800;color:#b45309">
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="field">
        <span>島嶼標語 / 備註說明（顯示於卡片標題下方）</span>
        <input type="text" name="islandSubtitle" value="${esc(ks.islandSubtitle)}" placeholder="例如：每完成 1 件改善提案審查，就為島嶼點亮一座新地標！">
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:12px;border-top:1px solid #e2e8f0;flex-wrap:wrap;gap:10px">
        <span class="muted tiny">最後更新：${ks.updatedAtIso ? `${esc(ks.updatedByName)}（${new Date(ks.updatedAtIso).toLocaleString('zh-TW')}）` : '預設初始值'}</span>
        <div style="display:flex;gap:10px">
          <button type="button" class="btn" data-close>取消</button>
          <button type="submit" class="btn primary">💾 儲存半年數字並更新建造島</button>
        </div>
      </div>
    </form>
  `, { wide: true });

  const modeSel = document.getElementById('kz-modal-calc-mode');
  const manualBox = document.getElementById('kz-manual-total-box');
  if (modeSel && manualBox) {
    modeSel.onchange = () => {
      manualBox.style.display = modeSel.value === 'manual' ? 'grid' : 'none';
    };
  }

  const seasonSel = document.getElementById('kz-modal-season-sel');
  if (seasonSel) {
    seasonSel.onchange = () => {
      activeSeasonKey = seasonSel.value;
      closeModal();
      openKaizenIslandEditorModal(onSaved);
    };
  }

  const form = document.getElementById('kz-island-editor-form');
  if (form) {
    form.onsubmit = async e => {
      e.preventDefault();
      const sKey = form.seasonKey.value;
      const isH1 = sKey.endsWith('H1');
      const yearStr = sKey.split('-')[0] || '2026';
      const seasonLabel = `${yearStr} ${isH1 ? '上半年 (1~6月)' : '下半年 (7~12月)'}`;

      const nextLandmarks = ks.landmarks.map((lm, i) => {
        const bldgVal = form[`lm_bldg_${i}`].value.trim();
        return {
          ...lm,
          name: form[`lm_name_${i}`].value.trim() || lm.name,
          cityBuilding: isMaple ? lm.cityBuilding : (bldgVal || lm.cityBuilding),
          mapleBuilding: isMaple ? (bldgVal || lm.mapleBuilding) : lm.mapleBuilding,
          current: Math.max(0, Number(form[`lm_cur_${i}`].value) || 0),
          target: Math.max(1, Number(form[`lm_tgt_${i}`].value) || 1),
        };
      });

      const calcMode = form.calcMode.value === 'manual' ? 'manual' : 'sum';
      const manualCurrent = Math.max(0, Number(form.manualCurrent.value) || 0);
      const manualTarget = Math.max(1, Number(form.manualTarget.value) || 1);

      await saveKaizenIslandSeason(sKey, {
        seasonLabel,
        calcMode,
        manualCurrent,
        manualTarget,
        islandSubtitle: form.islandSubtitle.value.trim(),
        landmarks: nextLandmarks,
      });

      activeSeasonKey = sKey;
      closeModal();
      triggerMapleLevelUpEffect('🏝️ 改善提案建造島進度已更新！');
      onSaved?.();
    };
  }
}
