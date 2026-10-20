import { state, myUid, isAdmin, saveSimulationDutyPlan, simulationDutyOf, dailyInspectionOf, saveEvent, activeTypes } from '../data.js';
import { esc, avatar, ymd, toast } from '../utils.js';
import { bike } from '../yb.js';
import { renderDailyInspectionView } from './dailyInspection.js';
import { startInteractiveSimulationSpotlightTour } from '../guideModal.js';
import { INITIAL_DAILY_INSPECTION_DATA } from '../dailyInspectionData.js';
import {
  SIMULATION_2026_MONTHS,
  MONTH_ZH_NAMES,
  FLEET_MASTER_SUMMARY,
  HISTORICAL_SIMULATION_2026,
} from '../simulationHistoricalData.js';

// 預設各縣市基準抽樣規模（若該月份尚未自訂，以此為基準）
export const DEFAULT_REGION_QUOTAS = [
  { region: '雙北', totalVehicles: 920, targetDays: 2, v20: 40, v20e: 60, mode: 'local', note: '本地常態執行' },
  { region: '桃園', totalVehicles: 245, targetDays: 7, v20: 29, v20e: 6, mode: 'single', note: '單日來回' },
  { region: '新竹縣市', totalVehicles: 105, targetDays: 3, v20: 25, v20e: 10, mode: 'single', note: '單日來回' },
  { region: '苗栗', totalVehicles: 68, targetDays: 1, v20: 43, v20e: 25, mode: 'overnight', note: '跨(含)台中兩天一夜' },
  { region: '台中', totalVehicles: 265, targetDays: 5, v20: 50, v20e: 3, mode: 'transit_overnight', note: '大眾運輸・兩天一夜' },
  { region: '嘉義', totalVehicles: 68, targetDays: 2, v20: 55, v20e: 13, mode: 'transit_single', note: '大眾運輸・單日來回' },
  { region: '台南', totalVehicles: 156, targetDays: 4, v20: 122, v20e: 34, mode: 'transit_single', note: '大眾運輸・單日來回' },
  { region: '屏東', totalVehicles: 40, targetDays: 2, v20: 26, v20e: 14, mode: 'transit_single', note: '大眾運輸・單日來回' },
  { region: '台東', totalVehicles: 24, targetDays: 1, v20: 12, v20e: 12, mode: 'transit_single', note: '大眾運輸・單日來回' },
  { region: '高雄', totalVehicles: 265, targetDays: 0, v20: 225, v20e: 40, mode: 'transit_single', note: '在地/專案排程' },
];

export const INITIAL_DUTY_ASSIGNMENTS_202610 = HISTORICAL_SIMULATION_2026['2026-10'].assignments;

// 縣市專屬色彩配置（高度還原 Excel 視覺色系，採現代柔和護眼馬卡龍調色）
const REGION_THEMES = {
  '雙北': { bg: '#ffe4e6', border: '#fda4af', text: '#9f1239' },
  '桃園': { bg: '#fef08a', border: '#fde047', text: '#854d0e' },
  '新竹縣市': { bg: '#dcfce7', border: '#86efac', text: '#166534' },
  '苗栗': { bg: '#bbf7d0', border: '#4ade80', text: '#14532d' },
  '台中': { bg: '#bae6fd', border: '#7dd3fc', text: '#0369a1' },
  '嘉義': { bg: '#bfdbfe', border: '#93c5fd', text: '#1d4ed8' },
  '台南': { bg: '#dbeafe', border: '#bfdbfe', text: '#1e40af' },
  '屏東': { bg: '#fbcfe8', border: '#f472b6', text: '#9d174d' },
  '台東': { bg: '#e9d5ff', border: '#c084fc', text: '#6b21a8' },
  '高雄': { bg: '#f3e8ff', border: '#d8b4fe', text: '#581c87' },
};

// 名稱對應表（對應試算表簡稱 Leo, Hao, Chun...）
const USER_NICK_MAP = {
  '孔令淳': 'Leo',
  '葉爵豪': 'Hao',
  '陸逸群': 'Chun',
  '張必忠': 'Josh',
  '賴宜平': 'Ben',
  '包于巧': 'Ciao',
  '陳麒任': 'Aidpan',
  '丁美云': 'Sunny',
  '蕭琮瀚': 'Jack',
  '徐嘉鴻': 'Jerry',
};

const PRIORITIZED_KEYS = ['Leo', 'Hao', 'Chun', 'Josh', 'Ben', 'Ciao', 'Aidpan', 'Sunny', 'Jack'];

/** 取得某月份的完整模擬體驗資料（優先使用雲端儲存，若無則套用 2026 歷史/預設資料庫） */
export function getMergedMonthSimulationData(monthKey) {
  const rawDuty = simulationDutyOf(monthKey) || {};
  const hist = HISTORICAL_SIMULATION_2026[monthKey] || {};
  const quotas = rawDuty.quotas || hist.quotas || DEFAULT_REGION_QUOTAS;
  const assignments = rawDuty.assignments || hist.assignments || {};
  const tripDates = rawDuty.tripDates || hist.tripDates || {};
  const workDays = rawDuty.workDays ?? hist.workDays ?? 20;
  const travelDays = rawDuty.travelDays ?? hist.travelDays ?? 15;
  const totalV20Vehicles = rawDuty.totalV20Vehicles || '96,810';
  const totalV20eVehicles = rawDuty.totalV20eVehicles || '17,284';

  return {
    rawDuty,
    hist,
    quotas,
    assignments,
    tripDates,
    workDays,
    travelDays,
    totalV20Vehicles,
    totalV20eVehicles,
  };
}

/** 計算指定月份中，每位組員的「外縣市出差天數」與「總抽檢台數」 */
export function computeMonthUserMetrics(monthKey, sortedUsers, quotas, assignments, hist = {}) {
  const userTotalDays = {};
  const userTotalVehicles = {};
  const hasCustomCloud = Boolean(simulationDutyOf(monthKey)?.assignments);

  sortedUsers.forEach(u => {
    const nick = USER_NICK_MAP[u.displayName] || u.displayName;
    let travelDaysSum = 0;
    let vehicleSum = 0;

    if (nick === 'Chun') {
      const kaohsiung = quotas.find(q => q.region === '高雄');
      const kaoTotal = (Number(kaohsiung?.v20) || 0) + (Number(kaohsiung?.v20e) || 0);
      vehicleSum += kaoTotal;

      quotas.forEach(q => {
        const d = (assignments[q.region] && (assignments[q.region][nick] || assignments[q.region][u.displayName] || assignments[q.region][u.uid])) || 0;
        const count = Number(d) || 0;

        if (q.region === '苗栗' || q.region === '台中') {
          travelDaysSum += count * 2;
        } else if (q.region !== '雙北' && q.region !== '高雄') {
          travelDaysSum += count;
        }

        if (['嘉義', '台南', '屏東', '台東'].includes(q.region)) {
          const regTargetDays = Number(q.targetDays) || 1;
          const regTotalVehicles = (Number(q.totalVehicles) || ((Number(q.v20) || 0) + (Number(q.v20e) || 0)));
          vehicleSum += Math.round((regTotalVehicles / regTargetDays) * count);
        } else if (q.region !== '雙北' && q.region !== '高雄') {
          const perDay = (Number(q.v20) || 0) + (Number(q.v20e) || 0);
          vehicleSum += count * perDay;
        }
      });
    } else {
      quotas.forEach(q => {
        const d = (assignments[q.region] && (assignments[q.region][nick] || assignments[q.region][u.displayName] || assignments[q.region][u.uid])) || 0;
        const count = Number(d) || 0;

        if (q.region === '苗栗' || q.region === '台中') {
          travelDaysSum += count * 2;
        } else if (q.region !== '雙北' && q.region !== '高雄') {
          travelDaysSum += count;
        }

        if (q.region !== '雙北' && q.region !== '高雄') {
          const perDay = (Number(q.v20) || 0) + (Number(q.v20e) || 0);
          vehicleSum += count * perDay;
        }
      });

      if (['Leo', 'Hao'].includes(nick)) {
        const taipeiQuota = quotas.find(q => q.region === '雙北');
        const taipeiHalf = Math.round(((Number(taipeiQuota?.totalVehicles) || 920)) / 2);
        vehicleSum += taipeiHalf;
      }
    }

    // 若為歷史月份且尚未手動改寫，優先對齊試算表上的歷史結算數值
    if (!hasCustomCloud && hist.overrideOutDays && hist.overrideOutDays[nick] !== undefined) {
      travelDaysSum = hist.overrideOutDays[nick];
    }
    if (!hasCustomCloud && hist.overrideTotals && hist.overrideTotals[nick] !== undefined) {
      vehicleSum = hist.overrideTotals[nick];
    }

    userTotalDays[u.uid] = travelDaysSum;
    userTotalVehicles[u.uid] = vehicleSum;
  });

  return { userTotalDays, userTotalVehicles };
}

/** 從「北區 / 南區每日巡檢」月曆中，自動讀取 Leo / Hao / Chun 該月份的外縣市排程統計（供雙向核對） */
function getDailyInspectionCrossCheck(monthKey) {
  const result = {};
  ['north', 'south'].forEach(zone => {
    const defSched = INITIAL_DAILY_INSPECTION_DATA[zone]?.schedules || {};
    let localData = null;
    try {
      const raw = localStorage.getItem(`daily_inspection_${zone}`);
      if (raw) localData = JSON.parse(raw);
    } catch (e) {}
    const cloudData = dailyInspectionOf(zone);
    const savedSched = (cloudData && cloudData.schedules) ? cloudData.schedules : (localData?.schedules || {});

    const memberKeys = zone === 'north' ? ['Leo', 'Hao'] : ['Chun'];
    memberKeys.forEach(k => {
      const merged = { ...(defSched[k] || {}), ...(savedSched[k] || {}) };
      const outCities = [];
      const cityDays = {};
      Object.entries(merged).forEach(([dStr, loc]) => {
        if (!dStr.startsWith(monthKey) || !loc) return;
        ['桃園', '新竹', '苗栗', '台中', '嘉義', '台南', '屏東', '台東'].forEach(c => {
          if (loc.includes(c)) {
            const dayNum = Number(dStr.slice(8, 10));
            outCities.push(`${dayNum}日(${c})`);
            const normCity = c === '新竹' ? '新竹縣市' : c;
            cityDays[normCity] = (cityDays[normCity] || 0) + 1;
          }
        });
      });
      result[k] = {
        totalOutDays: outCities.length,
        outCities,
        cityDays,
      };
    });
  });
  return result;
}

export function mountSimulation(el, ctx = {}) {
  let curMonth = ctx.month || ymd().slice(0, 7);
  let activeSubTab = ctx.subTab || 'matrix'; // 'matrix' | 'north' | 'south' | 'annual'
  let annualViewMode = 'vertical'; // 'vertical' (Excel一月~十一月垂直展開) | 'summary' (年度趨勢彙整)

  function getSortedTeamUsers() {
    const allUsers = [...state.users.values()].filter(u => u.active !== false && u.displayName !== '徐嘉鴻');
    return [...allUsers].sort((a, b) => {
      const nickA = USER_NICK_MAP[a.displayName] || a.displayName;
      const nickB = USER_NICK_MAP[b.displayName] || b.displayName;
      const idxA = PRIORITIZED_KEYS.indexOf(nickA);
      const idxB = PRIORITIZED_KEYS.indexOf(nickB);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }

  function render() {
    const sortedUsers = getSortedTeamUsers();
    const {
      rawDuty,
      hist,
      quotas,
      assignments,
      tripDates,
      workDays,
      travelDays,
      totalV20Vehicles,
      totalV20eVehicles,
    } = getMergedMonthSimulationData(curMonth);

    const { userTotalDays, userTotalVehicles } = computeMonthUserMetrics(
      curMonth,
      sortedUsers,
      quotas,
      assignments,
      hist
    );

    const crossCheck = getDailyInspectionCrossCheck(curMonth);

    let totalTargetDaysSum = 0;
    let totalAssignedDaysSum = 0;
    let totalCheckCountSum = 0;

    quotas.forEach(q => {
      const isDailyLocal = q.region === '雙北' || q.mode === 'local';
      if (!isDailyLocal) {
        totalTargetDaysSum += Number(q.targetDays) || 0;
      }
      totalCheckCountSum += Number(q.totalVehicles) || 0;

      let regAssigned = 0;
      sortedUsers.forEach(u => {
        const nick = USER_NICK_MAP[u.displayName] || u.displayName;
        const d = (assignments[q.region] && (assignments[q.region][nick] || assignments[q.region][u.displayName] || assignments[q.region][u.uid])) || 0;
        regAssigned += Number(d) || 0;
      });

      if (!isDailyLocal) {
        totalAssignedDaysSum += regAssigned;
      }
    });

    const [yStr, mStr] = curMonth.split('-');

    el.innerHTML = `
      <div class="toolbar sim-toolbar">
        <div class="nav-group">
          <button class="btn icon" data-month-prev title="上個月">‹</button>
          <span style="font-weight:700; font-size:16px; min-width:110px; text-align:center;">${yStr} 年 ${Number(mStr)} 月</span>
          <button class="btn icon" data-month-next title="下個月">›</button>
        </div>
        <h2 class="view-title">🚲 模擬體驗排班規劃</h2>
        <div class="toolbar-end" style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn ghost guide-btn" data-open-sim-tour style="font-weight:700; color:#b45309; background:#fef3c7; border-color:#fde68a;" title="啟動模擬體驗 6 步實景聚焦導覽">
            🎯 模擬體驗導覽
          </button>
          <a class="btn ghost" href="https://docs.google.com/spreadsheets/d/1LZTYi7lptWpCXVOjaNs0WxkKl9SnDrfCVq1GmtqVgiI/edit?gid=1242229196#gid=1242229196" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:5px; font-weight:600; color:#15803d; border-color:#bbf7d0; background:#f0fdf4; text-decoration:none;" title="開啟原始 Google 試算表">
            <span>📗 原始試算表</span>
            <span style="font-size:11px;">↗</span>
          </a>
          <a class="btn ghost" href="https://leokung4398.github.io/YouBike-MaIM/" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:6px; font-weight:600; color:#1e293b; border-color:#cbd5e1; background:#fff; text-decoration:none;" title="在新分頁開啟維修維護提升改善會議資訊 (MaIM 儀表板)">
            <span>📊 維護改善會議資訊 (MaIM)</span>
            <span style="font-size:12px; color:#64748b;">↗</span>
          </a>
        </div>
      </div>

      <!-- 圖1 輕量化：2026 全年度月份選擇器（預設縮起為單一膠囊，滑鼠移入月份膠囊時才輕柔向右浮出 1~11 月，絕不推擠右側子分頁） -->
      <div id="sim-year-month-bar" class="sim-top-control-row">
        <div class="month-expander-bar" tabindex="0">
          <div class="month-expander-trigger">
            <span class="month-trigger-label">📅 ${yStr}年 · <b>${Number(mStr)}月${curMonth === '2026-10' ? ' (本月)' : ''}</b></span>
            <span class="month-trigger-hint">▸ 切換月份</span>
          </div>
          <div class="month-expander-ZeroDrawer">
            ${SIMULATION_2026_MONTHS.slice(0, 11).map(mKey => {
              const mNum = Number(mKey.slice(5, 7));
              const isCur = mKey === curMonth && activeSubTab !== 'annual';
              return `
                <button type="button" class="month-pill-item ${isCur ? 'active' : ''} ${mKey === '2026-10' ? 'is-current' : ''}" data-quick-month="${mKey}">
                  ${mNum}月${mKey === '2026-10' ? '(本月)' : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 頂部獨立功能子分頁（固定於右側，不受月份展開推擠） -->
        <div class="sim-nav-pills">
          <button type="button" class="sim-pill-btn ${activeSubTab === 'matrix' ? 'active tab-matrix' : ''}" data-tab="matrix">
            <span>📊 排班矩陣 (${Number(mStr)}月)</span>
          </button>
          <button type="button" class="sim-pill-btn ${activeSubTab === 'north' ? 'active tab-north' : ''}" data-tab="north">
            <span>🧭 北區巡檢 (Leo/Hao)</span>
          </button>
          <button type="button" class="sim-pill-btn ${activeSubTab === 'south' ? 'active tab-south' : ''}" data-tab="south">
            <span>🌴 南區巡檢 (Chun)</span>
          </button>
          <button type="button" class="sim-pill-btn ${activeSubTab === 'annual' ? 'active tab-matrix' : ''}" data-tab="annual" data-quick-annual>
            <span>📈 年度總覽 & 母體表</span>
          </button>
        </div>
      </div>

      <!-- 子分頁主容器 -->
      <div id="sim-tab-content-root"></div>
    `;

    const tabRoot = el.querySelector('#sim-tab-content-root');

    if (activeSubTab === 'north' || activeSubTab === 'south') {
      renderDailyInspectionView(tabRoot, activeSubTab, curMonth, (newMonth) => {
        curMonth = newMonth;
        render();
      });
      bindEvents();
      return;
    }

    if (activeSubTab === 'annual') {
      renderAnnualAndMasterView(tabRoot, sortedUsers);
      bindEvents();
      return;
    }

    // --- 子分頁 1：當月配額與排班矩陣 ('matrix') ---
    tabRoot.innerHTML = `
      <div class="sim-container" style="display:flex; flex-direction:column; gap:12px;">
        
        <!-- 輕量化單行指標條 + 圖2 外勤三人連動極簡膠囊（移上去或點擊才展開詳細日期） -->
        <div class="card sim-compact-bar">
          <div class="sim-compact-metrics">
            <span class="sim-metric-main">🎯 <b>${Number(mStr)}月</b>抽驗目標 <strong>${totalCheckCountSum.toLocaleString()}</strong> 台</span>
            <span class="sim-metric-pill">工作天 <b>${workDays}</b>d</span>
            <span class="sim-metric-pill">出差天 <b style="color:#2563eb">${travelDays}</b>d</span>
            <span class="sim-metric-pill clickable" data-goto-master title="點擊查看母體總數表">2.0母體 <b style="color:#b45309">${totalV20Vehicles}</b> ↗</span>
            <span class="sim-metric-pill clickable" data-goto-master title="點擊查看母體總數表">2.0E <b style="color:#be123c">${totalV20eVehicles}</b> ↗</span>
            <span class="sim-metric-pill">已排人天 <b style="color:${totalAssignedDaysSum === totalTargetDaysSum ? '#16a34a' : '#ea580c'}">${totalAssignedDaysSum}/${totalTargetDaysSum}</b></span>
          </div>

          ${(crossCheck.Leo?.totalOutDays || crossCheck.Hao?.totalOutDays || crossCheck.Chun?.totalOutDays) ? `
            <div class="sim-crosscheck-compact">
              <span class="crosscheck-label">🔗 外縣市月曆連動：</span>
              ${['Leo', 'Hao', 'Chun'].map(k => {
                const cc = crossCheck[k];
                if (!cc || !cc.totalOutDays) return '';
                const zoneTab = k === 'Chun' ? 'south' : 'north';
                return `
                  <div class="crosscheck-badge-wrap" tabindex="0">
                    <span class="crosscheck-mini-pill" data-jump-zone="${zoneTab}">
                      <b>${k}</b> · ${cc.totalOutDays}天 ▾
                    </span>
                    <div class="crosscheck-popover">
                      <div style="font-weight:700;margin-bottom:4px;color:#0369a1">${k} 當月已排外縣市（共 ${cc.totalOutDays} 天）</div>
                      <div style="font-size:12px;line-height:1.5;color:#334155">${esc(cc.outCities.join('、'))}</div>
                      <div style="margin-top:6px;font-size:11px;color:#2563eb;font-weight:600" data-jump-zone="${zoneTab}">👉 點擊跳轉至${k === 'Chun' ? '南區' : '北區'}巡檢月曆 ↗</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>

        <!-- 核心排班矩陣表格（完整包含 Excel 第 1~2 列「出差日期」與「外縣市天數」） -->
        <div class="card pad" style="overflow-x:auto;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
            <div style="display:flex;align-items:center;gap:8px">
              <h3 style="font-size:15.5px; margin:0;">📋 各縣市配額與組員排班矩陣（${yStr}/${mStr}）</h3>
              <span class="info-pill-tip" title="點選上方粉紅列『出差日期』可記錄幾號出差（例：15, 16）；點選下方格子可直接編輯排班次數">ⓘ 操作提示</span>
            </div>
          </div>

          <table class="sim-matrix-table" style="width:100%; border-collapse:collapse; min-width:980px; font-size:13px; text-align:center;">
            <thead id="sim-tripdate-thead">
              <!-- Excel 第 1 列：出差日期（內勤組員出差幾號） -->
              <tr style="background:#fff1f2; border-top:2px solid #fda4af; border-bottom:1px solid #fecdd3; height:34px;">
                <th colspan="4" style="padding:4px 8px; text-align:right; color:#9f1239; font-size:12px; font-weight:700; background:#f8fafc; border-right:1px solid #cbd5e1;">
                  當月工作天：<b>${workDays}</b> 天
                </th>
                <th colspan="3" style="padding:4px 8px; text-align:center; background:#ffe4e6; color:#9f1239; font-weight:800; font-size:12.5px; border-right:1px solid #fda4af;">
                  📅 出差日期 (幾號)
                </th>
                ${sortedUsers.map(u => {
                  const nick = USER_NICK_MAP[u.displayName] || u.displayName;
                  const tDateVal = tripDates[nick] || '';
                  const isMainInspector = ['Leo', 'Hao', 'Chun'].includes(nick);
                  const cc = crossCheck[nick];
                  return `
                    <th style="padding:3px 4px; background:#ffe4e6; border-right:1px solid #fecdd3;">
                      ${isMainInspector ? `
                        <span style="font-size:11px; color:#be123c; font-weight:700; cursor:pointer;" data-jump-zone="${nick === 'Chun' ? 'south' : 'north'}" title="主責巡檢員請點此查看北區/南區每日月曆">
                          ${cc && cc.totalOutDays ? `詳見月曆(${cc.totalOutDays}天)` : '詳見巡檢表'}
                        </span>
                      ` : `
                        <input type="text"
                          class="sim-tripdate-input"
                          data-nick="${esc(nick)}"
                          value="${esc(tDateVal)}"
                          placeholder="-"
                          title="輸入 ${esc(u.displayName)} 當月出差日期（如：15 或 15, 16）"
                          style="width:54px; text-align:center; font-size:12px; font-weight:800; padding:2px 4px; border:1px solid ${tDateVal ? '#f43f5e' : '#fecdd3'}; border-radius:4px; background:${tDateVal ? '#fecdd3' : '#fff'}; color:#881337;">
                      `}
                    </th>
                  `;
                }).join('')}
                <th style="padding:4px 8px; text-align:left; font-size:11px; color:#9f1239; background:#fff1f2;">
                  對應試算表上方粉紅列（幾號出差）
                </th>
              </tr>

              <!-- Excel 第 2 列：外縣市天數 -->
              <tr style="background:#ffe4e6; border-bottom:1px solid #fda4af; height:28px;">
                <th colspan="4" style="background:#f8fafc; border-right:1px solid #cbd5e1;"></th>
                <th colspan="3" style="padding:2px 8px; text-align:center; background:#fecdd3; color:#881337; font-weight:800; font-size:12px; border-right:1px solid #fda4af;">
                  🚄 外縣市天數
                </th>
                ${sortedUsers.map(u => {
                  const days = userTotalDays[u.uid] || 0;
                  return `
                    <th style="padding:2px 4px; background:#ffe4e6; color:#be123c; font-size:13px; font-weight:800; border-right:1px solid #fecdd3;" title="外縣市出差總天數（苗栗/台中以 2 天計）">
                      ${days > 0 ? days : '-'}
                    </th>
                  `;
                }).join('')}
                <th style="padding:2px 8px; text-align:left; font-size:11px; color:#9f1239; background:#ffe4e6;">
                  苗栗/台中兩天一夜自動 ×2 計算
                </th>
              </tr>

              <!-- Excel 第 3 列：欄位主標頭 -->
              <tr style="background:#f1f5f9; border-bottom:2px solid #cbd5e1; height:38px;">
                <th style="padding:6px; text-align:center; width:45px; white-space:nowrap;">項次</th>
                <th style="padding:6px; text-align:left; min-width:115px; white-space:nowrap;">縣市</th>
                <th style="padding:6px; min-width:75px; white-space:nowrap;">抽檢總數</th>
                <th style="padding:6px; min-width:90px; line-height:1.2; white-space:nowrap;">執行人數<br>/天數</th>
                <th style="padding:6px; min-width:70px; background:#fef9c3; white-space:nowrap;">2.0台/人</th>
                <th style="padding:6px; min-width:70px; background:#fce7f3; white-space:nowrap;">2.0E台/人</th>
                <th style="padding:6px; min-width:65px; background:#fff7ed; font-weight:700; white-space:nowrap;">單位總數</th>
                ${sortedUsers.map(u => {
                  const nick = USER_NICK_MAP[u.displayName] || u.displayName;
                  const isMe = u.uid === myUid();
                  return `<th style="padding:4px 6px; min-width:58px; white-space:nowrap; background:${isMe ? '#eff6ff' : 'transparent'};">
                    <span style="font-weight:800; font-size:13px; ${isMe ? 'color:#2563eb;' : 'color:#0f172a;'}">${esc(nick)}</span>
                    <div style="font-size:10px; color:#64748b; font-weight:normal;">${esc(u.displayName.slice(0, 3))}</div>
                  </th>`;
                }).join('')}
                <th style="padding:6px; text-align:left; min-width:210px; white-space:nowrap;">出差與交通模式</th>
              </tr>
            </thead>
            <tbody>
              ${quotas.map((q, qIdx) => {
                const perDayTotal = (q.region === '雙北' || q.region === '高雄') ? '' : ((Number(q.v20) || 0) + (Number(q.v20e) || 0));
                const isLastNorth = q.region === '台中';
                const isFirstSouth = q.region === '嘉義';
                const theme = REGION_THEMES[q.region] || { bg: '#f1f5f9', border: '#cbd5e1', text: '#334155' };

                return `
                  <tr style="border-bottom:${isLastNorth ? '3px solid #475569' : '1px solid #e2e8f0'}; height:42px;" data-region-row="${esc(q.region)}">
                    <td class="muted" style="white-space:nowrap;">${qIdx + 1}</td>
                    <td style="text-align:left; font-weight:700; white-space:nowrap;">
                      <span style="display:inline-block; padding:3px 8px; border-radius:5px; background:${theme.bg}; color:${theme.text}; border:1px solid ${theme.border}; font-size:13px; font-weight:700;">
                        ${esc(q.region)}
                      </span>
                      ${isLastNorth ? '<span class="badge-tag info tiny" style="margin-left:4px; font-size:10px; padding:2px 6px; white-space:nowrap; background:#e0f2fe; color:#0369a1;">北區訖</span>' : ''}
                      ${isFirstSouth ? '<span class="badge-tag warn tiny" style="margin-left:4px; font-size:10px; padding:2px 6px; white-space:nowrap; background:#fef3c7; color:#b45309;">南區起</span>' : ''}
                    </td>
                    <td style="white-space:nowrap;"><b>${q.totalVehicles || 0}</b></td>
                    <td style="white-space:nowrap;">
                      <b style="font-size:14px; color:#1e293b;">${q.targetDays ? q.targetDays : ''}</b>
                    </td>
                    <td style="background:#fefce8; color:#b45309; font-weight:700; white-space:nowrap;">${q.v20 || 0}</td>
                    <td style="background:#fdf2f8; color:#be123c; font-weight:700; white-space:nowrap;">${q.v20e || 0}</td>
                    <td style="background:#fff7ed; white-space:nowrap;">
                      ${perDayTotal ? `<b style="color:#c2410c; font-size:13px;">${perDayTotal}</b>` : '<span class="muted">-</span>'}
                    </td>
                    ${sortedUsers.map(u => {
                      const nick = USER_NICK_MAP[u.displayName] || u.displayName;
                      const val = (assignments[q.region] && (assignments[q.region][nick] || assignments[q.region][u.displayName] || assignments[q.region][u.uid])) || '';
                      const isMe = u.uid === myUid();
                      return `
                        <td style="padding:2px; background:${isMe ? '#f8fafc' : 'transparent'}; white-space:nowrap;">
                          <input type="number" min="0" max="300" step="1" 
                            class="sim-cell-input" 
                            data-region="${esc(q.region)}" 
                            data-nick="${esc(nick)}" 
                            data-uid="${esc(u.uid)}" 
                            value="${val}" 
                            placeholder="-"
                            style="width:46px; text-align:center; padding:4px 0; border:1px solid ${val ? theme.border : '#e2e8f0'}; border-radius:4px; font-weight:${val ? '800' : 'normal'}; background:${val ? theme.bg : '#fff'}; color:${val ? theme.text : 'inherit'};">
                        </td>`;
                    }).join('')}
                    <td style="text-align:left; font-size:12px; color:#475569; white-space:nowrap;">
                      ${q.mode?.includes('transit') ? '<span class="badge-tag info tiny" style="margin-right:4px; white-space:nowrap;">🚄 大眾運輸</span>' : ''}
                      ${q.mode?.includes('overnight') ? '<span class="badge-tag warn tiny" style="margin-right:4px; white-space:nowrap;">🏨 兩天一夜</span>' : ''}
                      ${q.note ? `<span style="white-space:nowrap;">${esc(q.note)}</span>` : ''}
                    </td>
                  </tr>`;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#f8fafc; border-top:2px solid #94a3b8; font-weight:700; height:44px; white-space:nowrap;">
                <td colspan="2" style="text-align:center; white-space:nowrap;">總數（抽檢台數）</td>
                <td style="white-space:nowrap;">${totalCheckCountSum}</td>
                <td style="white-space:nowrap;"><b style="font-size:15px; color:#ff0000;">${totalTargetDaysSum}</b></td>
                <td style="background:#fefce8; color:#854d0e; white-space:nowrap;">${quotas.reduce((acc, q) => acc + (Number(q.v20) || 0) * (q.region === '雙北' || q.region === '高雄' ? 1 : (Number(q.targetDays) || 1)), 0)}</td>
                <td style="background:#fdf2f8; color:#9d174d; white-space:nowrap;">${quotas.reduce((acc, q) => acc + (Number(q.v20e) || 0) * (q.region === '雙北' || q.region === '高雄' ? 1 : (Number(q.targetDays) || 1)), 0)}</td>
                <td style="background:#fff7ed; white-space:nowrap;">-</td>
                ${sortedUsers.map(u => {
                  const vehCount = userTotalVehicles[u.uid] || 0;
                  const isMe = u.uid === myUid();
                  return `
                    <td style="padding:4px; background:${isMe ? '#eff6ff' : 'transparent'}; white-space:nowrap;">
                      <div style="font-size:14px; font-weight:800; color:${vehCount > 0 ? '#1e293b' : '#94a3b8'};" title="個人當月抽檢總台數">
                        ${vehCount > 0 ? vehCount : '0'}
                      </div>
                    </td>`;
                }).join('')}
                <td style="text-align:left; font-size:11px; color:#64748b; white-space:nowrap;">
                  各組員全月抽檢總台數
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- 底部規則與防呆說明卡片 -->
        <div class="card pad" style="background:#fffbeb; border:1px solid #fef3c7; border-left:4px solid #f59e0b;">
          <h4 style="margin:0 0 8px 0; color:#b45309; font-size:15px; display:flex; align-items:center; gap:6px;">
            <span>🚩 模擬體驗現行 5 大執行規則與防呆</span>
          </h4>
          <ol style="margin:0; padding-left:20px; line-height:1.7; font-size:13px; color:#78350f;">
            <li><b>自主選擇與動態調整：</b>模擬體驗雖先以同仁自主選擇，仍會因各營運處月初發布的車輛數量等其他原因做區域及數量調整，最終以群組發布的資訊為執行準則。（如有住宿，請以彈性為原則）</li>
            <li><b>天數控管：</b>模擬體驗至多 <b>2 日 / 人 / 月</b>。（表格上方已提供出差日期與外縣市天數即時統計）</li>
            <li><b>交通工具規範：</b><b>台中（含）以下城市，一律以大眾運輸工具前往</b>。（避免開公務車產生長途疲勞與耗損）</li>
            <li><b>出差天數模式：</b>桃竹、嘉義、台南、屏東皆<b>單日來回</b>；苗栗、跨（含）台中為<b>兩天一夜</b>。</li>
            <li><b>避開財務關帳：</b>配合關帳帳務處理程序，出差安排<b>請避開關帳日及關帳後兩工作日</b>。</li>
          </ol>
        </div>

      </div>
    `;

    bindEvents();
  }

  /** 子分頁 4：渲染「📈 2026年度總覽（一月～十一月垂直展開表）」與「🔒 母體總數試算表」 */
  function renderAnnualAndMasterView(container, sortedUsers) {
    const activeMonths = SIMULATION_2026_MONTHS.slice(0, 11); // 2026-01 ~ 2026-11

    // 建立單一月份的唯讀精簡矩陣區塊（高度還原使用者截圖中「2026年度」一月、二月、三月垂直排列的視覺！）
    const renderMonthBlock = (mKey) => {
      const mData = getMergedMonthSimulationData(mKey);
      const { userTotalDays, userTotalVehicles } = computeMonthUserMetrics(
        mKey,
        sortedUsers,
        mData.quotas,
        mData.assignments,
        mData.hist
      );
      const zhMonth = MONTH_ZH_NAMES[mKey] || mKey;
      let totalTarget = 0;
      let totalVeh = 0;
      mData.quotas.forEach(q => {
        if (q.region !== '雙北') totalTarget += Number(q.targetDays) || 0;
        totalVeh += Number(q.totalVehicles) || 0;
      });

      return `
        <div class="card pad" style="border:1.5px solid #cbd5e1; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="background:#ef4444; color:#fff; font-weight:900; font-size:15px; padding:4px 14px; border-radius:4px; letter-spacing:1px;">
                ${esc(zhMonth)}
              </span>
              <span style="font-size:13px; color:#334155;">工作天：<b>${mData.workDays}</b> 天</span>
              <span style="font-size:13px; color:#475569;">｜ 總抽檢目標：<b>${totalVeh.toLocaleString()}</b> 台</span>
            </div>
            <button type="button" class="btn small ghost" data-edit-single-month="${mKey}" style="font-weight:700; color:#2563eb;">
              ✏️ 切換至 ${esc(zhMonth)} 編輯模式 ↗
            </button>
          </div>

          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; min-width:900px; font-size:12.5px; text-align:center; border:2px solid #334155;">
              <thead>
                <!-- 出差日期列 -->
                <tr style="background:#fff1f2; border-bottom:1px solid #fda4af; height:26px;">
                  <th colspan="2" style="background:#fff; border-right:1px solid #cbd5e1;"></th>
                  <th style="background:#fff; font-size:11.5px; color:#334155;">工作天</th>
                  <th style="background:#fff; font-weight:800; color:#0f172a; border-right:1px solid #334155;">${mData.workDays}</th>
                  <th rowspan="2" style="background:#f5d0fe; color:#0f172a; font-weight:800; border-right:1px solid #334155; width:72px;">出差<br>日期</th>
                  <th colspan="3" style="background:#fecdd3; color:#be123c; font-weight:800; border-right:1px solid #334155;">外縣市天數</th>
                  ${sortedUsers.slice(3).map(u => {
                    const nick = USER_NICK_MAP[u.displayName] || u.displayName;
                    const td = mData.tripDates[nick] || '';
                    return `<th style="background:${td ? '#fecdd3' : '#fff'}; color:#be123c; font-weight:800; border-right:1px solid #cbd5e1;">${esc(td)}</th>`;
                  }).join('')}
                </tr>
                <!-- 外縣市天數列 -->
                <tr style="background:#ffe4e6; border-bottom:1.5px solid #334155; height:26px;">
                  <th colspan="4" style="background:#fff; border-right:1px solid #334155;"></th>
                  ${sortedUsers.map(u => {
                    const d = userTotalDays[u.uid] || 0;
                    const nick = USER_NICK_MAP[u.displayName] || u.displayName;
                    const isMain = ['Leo', 'Hao', 'Chun'].includes(nick);
                    return `<th style="background:${isMain || d > 0 ? '#fecdd3' : '#fff'}; color:#be123c; font-weight:800; border-right:1px solid #cbd5e1;">${d > 0 ? d : ''}</th>`;
                  }).join('')}
                </tr>
                <!-- 欄位名稱列 -->
                <tr style="background:#f8fafc; border-bottom:2px solid #334155; height:30px; font-weight:800;">
                  <th style="border-right:1px solid #cbd5e1; width:60px;">總數</th>
                  <th style="border-right:1px solid #cbd5e1; width:85px;">縣市</th>
                  <th style="border-right:1px solid #cbd5e1; width:85px; font-size:11px;">執行人數/天數</th>
                  <th style="border-right:1px solid #cbd5e1; width:65px;">2.0台/人</th>
                  <th style="border-right:2px solid #334155; width:72px;">2.0E台/人</th>
                  ${sortedUsers.map(u => {
                    const nick = USER_NICK_MAP[u.displayName] || u.displayName;
                    return `<th style="border-right:1px solid #cbd5e1; min-width:52px;">${esc(nick)}</th>`;
                  }).join('')}
                </tr>
              </thead>
              <tbody>
                ${mData.quotas.map(q => {
                  const theme = REGION_THEMES[q.region] || { bg: '#f1f5f9', border: '#cbd5e1', text: '#334155' };
                  const isLastNorth = q.region === '台中';
                  return `
                    <tr style="border-bottom:${isLastNorth ? '2.5px solid #0f172a' : '1px solid #cbd5e1'}; height:28px;">
                      <td style="border-right:1px solid #cbd5e1; font-weight:600;">${q.totalVehicles || ''}</td>
                      <td style="border-right:1px solid #cbd5e1; background:${theme.bg}; color:${theme.text}; font-weight:800;">${esc(q.region)}</td>
                      <td style="border-right:1px solid #cbd5e1; background:${theme.bg}; color:#0f172a; font-weight:800;">${q.targetDays || ''}</td>
                      <td style="border-right:1px solid #cbd5e1; color:#dc2626; font-weight:800;">${q.v20 || ''}</td>
                      <td style="border-right:2px solid #334155; color:#dc2626; font-weight:800;">${q.v20e || ''}</td>
                      ${sortedUsers.map(u => {
                        const nick = USER_NICK_MAP[u.displayName] || u.displayName;
                        const val = (mData.assignments[q.region] && (mData.assignments[q.region][nick] || mData.assignments[q.region][u.displayName] || mData.assignments[q.region][u.uid])) || '';
                        return `<td style="border-right:1px solid #cbd5e1; background:${val ? theme.bg : '#fff'}; color:#0f172a; font-weight:800;">${val}</td>`;
                      }).join('')}
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr style="background:#f8fafc; border-top:2px solid #334155; height:30px; font-weight:800;">
                  <td style="border-right:1px solid #cbd5e1;">${totalVeh}</td>
                  <td style="border-right:1px solid #cbd5e1;">總數</td>
                  <td style="border-right:1px solid #cbd5e1; color:#dc2626;">${totalTarget}</td>
                  <td style="border-right:1px solid #cbd5e1; color:#dc2626;">${mData.quotas.reduce((a, q) => a + (Number(q.v20) || 0) * (q.region === '雙北' || q.region === '高雄' ? 1 : (Number(q.targetDays) || 1)), 0)}</td>
                  <td style="border-right:2px solid #334155; color:#dc2626;">${mData.quotas.reduce((a, q) => a + (Number(q.v20e) || 0) * (q.region === '雙北' || q.region === '高雄' ? 1 : (Number(q.targetDays) || 1)), 0)}</td>
                  ${sortedUsers.map(u => {
                    const v = userTotalVehicles[u.uid] || 0;
                    const nick = USER_NICK_MAP[u.displayName] || u.displayName;
                    return `<td style="border-right:1px solid #cbd5e1; color:${nick === 'Chun' ? '#dc2626' : '#0f172a'};">${v}</td>`;
                  }).join('')}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;
    };

    const fm = FLEET_MASTER_SUMMARY;

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:20px;">
        
        <!-- 區塊切換導覽按鈕 -->
        <div class="card pad" style="background:linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-left:4px solid #d97706; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <h3 style="margin:0; font-size:17px; color:#92400e;">📈 2026 全年度執行總覽 ＆ 🔒 全台母體車輛配額試算表</h3>
            <p style="margin:4px 0 0 0; font-size:12.5px; color:#b45309;">
              完整整合試算表中的「<b>2026年度 (一月～十一月垂直總表)</b>」與「<b>🔒 總數表 (全台 114,094 台母體抽驗比例公式)</b>」
            </p>
          </div>
          <div style="display:flex; gap:8px;">
            <button type="button" class="btn small ${annualViewMode === 'vertical' ? 'primary' : 'ghost'}" data-annual-mode="vertical">
              📋 2026年度垂直展開表 (一月～十一月)
            </button>
            <button type="button" class="btn small ${annualViewMode === 'master' ? 'primary' : 'ghost'}" data-annual-mode="master">
              🔒 母體總數與抽驗比例表 (總數表)
            </button>
          </div>
        </div>

        ${annualViewMode === 'vertical' ? `
          <!-- 一月～十一月垂直展開長表（完全還原使用者截圖視覺） -->
          <div style="display:flex; flex-direction:column; gap:18px;">
            ${activeMonths.map(mKey => renderMonthBlock(mKey)).join('')}
          </div>
        ` : ''}

        <!-- 🔒 母體總數表（無論在哪個模式都顯示於下方，或切到 master 時置頂展示） -->
        <div class="card pad" id="fleet-master-section" style="border-top:4px solid #0284c7;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px;">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="badge-tag info">🔒 總數表 (配額計算源頭)</span>
                <h3 style="margin:0; font-size:17px;">全台各縣市 2.0 / 2.0E 母體車輛數與抽驗配額試算表</h3>
              </div>
              <p class="muted small-text" style="margin:4px 0 0 0;">
                此表為每月排班矩陣的配額來源：依各縣市目前總車輛數（共 <b>${fm.grandTotal.toLocaleString()}</b> 台），按約 <b>1.86% ~ 2.14%</b> 抽樣比例計算出每月應測台數。
              </p>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
              <div class="sim-kpi-chip" style="background:#f8fafc; padding:6px 12px; border-radius:6px; border:1px solid #cbd5e1;">
                <span class="muted tiny" style="display:block;">全台 2.0 總車數</span>
                <b style="font-size:15px; color:#0369a1;">${fm.totalV20.toLocaleString()} 台</b>
              </div>
              <div class="sim-kpi-chip" style="background:#f8fafc; padding:6px 12px; border-radius:6px; border:1px solid #cbd5e1;">
                <span class="muted tiny" style="display:block;">全台 2.0E 總車數</span>
                <b style="font-size:15px; color:#be123c;">${fm.totalV20e.toLocaleString()} 台</b>
              </div>
              <div class="sim-kpi-chip" style="background:#f0fdf4; padding:6px 12px; border-radius:6px; border:1px solid #bbf7d0;">
                <span class="muted tiny" style="display:block;">2.0+2.0E 總抽驗數 (${fm.overallSampleRate})</span>
                <b style="font-size:15px; color:#15803d;">${fm.combinedQuotaTotal.toLocaleString()} 台/月</b>
              </div>
            </div>
          </div>

          <div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; min-width:920px; font-size:12.5px; text-align:center; border:1px solid #cbd5e1;">
              <thead>
                <tr style="background:#f1f5f9; border-bottom:2px solid #94a3b8; height:36px; font-weight:800; color:#1e293b;">
                  <th style="padding:6px; border-right:1px solid #cbd5e1;">區域群組</th>
                  <th style="padding:6px; border-right:1px solid #cbd5e1;">涵蓋縣市明細 (2.0 / 2.0E)</th>
                  <th style="padding:6px; border-right:1px solid #cbd5e1; background:#fefce8;">2.0 車輛加總</th>
                  <th style="padding:6px; border-right:1px solid #cbd5e1; background:#fdf2f8;">2.0E 車輛加總</th>
                  <th style="padding:6px; border-right:1px solid #cbd5e1; background:#f0f9ff;">目前總車輛數</th>
                  <th style="padding:6px; border-right:1px solid #cbd5e1;">一般月份 2.0 測試量</th>
                  <th style="padding:6px; border-right:1px solid #cbd5e1;">2月數量</th>
                  <th style="padding:6px; border-right:1px solid #cbd5e1;">2.0 抽驗比例</th>
                  <th style="padding:6px; border-right:1px solid #cbd5e1; background:#fdf2f8;">經營 2.0E 最低測試數</th>
                  <th style="padding:6px; border-right:1px solid #cbd5e1;">2.0E 比例</th>
                  <th style="padding:6px; background:#dcfce7; color:#14532d;">2.0 + 2.0E 總抽驗數 (比例)</th>
                </tr>
              </thead>
              <tbody>
                ${fm.cities.map(c => `
                  <tr style="border-bottom:1px solid #e2e8f0; height:36px;">
                    <td style="padding:6px 10px; font-weight:800; text-align:left; border-right:1px solid #e2e8f0; color:#0f172a;">${esc(c.group)}</td>
                    <td style="padding:6px 10px; text-align:left; border-right:1px solid #e2e8f0; font-size:12px; color:#475569;">
                      ${c.subCities.map(sc => `<span><b>${esc(sc.name)}</b> (${sc.v20.toLocaleString()} / ${sc.v20e.toLocaleString()})</span>`).join('、')}
                    </td>
                    <td style="padding:6px; border-right:1px solid #e2e8f0; background:#fefce8; font-weight:700; color:#854d0e;">${c.sumV20.toLocaleString()}</td>
                    <td style="padding:6px; border-right:1px solid #e2e8f0; background:#fdf2f8; font-weight:700; color:#9d174d;">${c.sumV20e.toLocaleString()}</td>
                    <td style="padding:6px; border-right:1px solid #e2e8f0; background:#f0f9ff; font-weight:800; color:#0369a1;">${c.totalFleet.toLocaleString()}</td>
                    <td style="padding:6px; border-right:1px solid #e2e8f0; font-weight:800;">${c.oaQuota20}</td>
                    <td style="padding:6px; border-right:1px solid #e2e8f0; color:#64748b;">${c.febQuota}</td>
                    <td style="padding:6px; border-right:1px solid #e2e8f0; color:#0369a1; font-weight:600;">${c.rate20}</td>
                    <td style="padding:6px; border-right:1px solid #e2e8f0; background:#fdf2f8; font-weight:800; color:#be123c;">${c.minQuota20e}</td>
                    <td style="padding:6px; border-right:1px solid #e2e8f0; color:#be123c; font-weight:600;">${c.rate20e}</td>
                    <td style="padding:6px; background:#f0fdf4; font-weight:800; color:#15803d;">
                      ${c.combinedQuota} 台 <span style="font-size:11px; font-weight:normal; color:#166534;">(${c.combinedRate})</span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr style="background:#f8fafc; border-top:2px solid #64748b; height:40px; font-weight:800; font-size:13px;">
                  <td colspan="2" style="text-align:right; padding-right:12px; border-right:1px solid #cbd5e1;">全台總計</td>
                  <td style="background:#fefce8; color:#854d0e; border-right:1px solid #cbd5e1;">${fm.totalV20.toLocaleString()}</td>
                  <td style="background:#fdf2f8; color:#9d174d; border-right:1px solid #cbd5e1;">${fm.totalV20e.toLocaleString()}</td>
                  <td style="background:#e0f2fe; color:#0369a1; border-right:1px solid #cbd5e1;">${fm.grandTotal.toLocaleString()}</td>
                  <td style="border-right:1px solid #cbd5e1;">${fm.teamQuotaTotal.toLocaleString()}</td>
                  <td style="border-right:1px solid #cbd5e1;">-</td>
                  <td style="border-right:1px solid #cbd5e1;">2.17%</td>
                  <td style="background:#fdf2f8; color:#be123c; border-right:1px solid #cbd5e1;">${fm.teamQuotaV20e}</td>
                  <td style="border-right:1px solid #cbd5e1;">${fm.overallSampleRate}</td>
                  <td style="background:#dcfce7; color:#14532d;">${fm.combinedQuotaTotal.toLocaleString()} 台</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- 跨部門協同測試名單（OA / RD / MK / HR / IT / FN / AD 共 36 人） -->
          <div style="margin-top:16px; padding:12px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
            <div style="font-size:13px; font-weight:800; color:#334155; margin-bottom:8px;">
              👥 總數表附錄：各部門測試名額配置（共 36 人）
            </div>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px; font-size:12px;">
              ${fm.crossDeptRoster.map(d => `
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:6px 10px;">
                  <div style="font-weight:800; color:#0f172a; margin-bottom:2px;">
                    <span class="badge-tag info tiny">${esc(d.dept)}</span> 名額：<b>${d.count}</b> 人
                  </div>
                  <div style="color:#475569; line-height:1.4;">
                    ${d.members.length ? esc(d.members.join('、')) : '<span class="muted">（依部門排定）</span>'}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>
    `;
  }

  function bindEvents() {
    const q = s => el.querySelector(s);

    // 啟動模擬體驗專屬 6 步實景聚焦導覽
    q('[data-open-sim-tour]')?.addEventListener('click', () => {
      startInteractiveSimulationSpotlightTour();
    });

    // 子分頁切換
    el.querySelectorAll('.sim-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab && tab !== activeSubTab) {
          activeSubTab = tab;
          render();
        }
      });
    });

    // 頂部 1月～11月 快速切換按鈕
    el.querySelectorAll('[data-quick-month]').forEach(btn => {
      btn.addEventListener('click', () => {
        curMonth = btn.dataset.quickMonth;
        if (activeSubTab === 'annual') {
          activeSubTab = 'matrix';
        }
        render();
      });
    });

    // 頂部「📈 2026年度全覽 & 母體總數表」快速按鈕
    q('[data-quick-annual]')?.addEventListener('click', () => {
      activeSubTab = 'annual';
      render();
    });

    // 點擊 KPI 卡片跳轉至母體總數表
    el.querySelectorAll('[data-goto-master]').forEach(chip => {
      chip.addEventListener('click', () => {
        activeSubTab = 'annual';
        annualViewMode = 'master';
        render();
      });
    });

    // 點擊連動膠囊跳轉至北區/南區每日巡檢月曆
    el.querySelectorAll('[data-jump-zone]').forEach(chip => {
      chip.addEventListener('click', () => {
        activeSubTab = chip.dataset.jumpZone;
        render();
      });
    });

    // 年度總覽內的模式切換（垂直展開表 vs 母體總數表）
    el.querySelectorAll('[data-annual-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        annualViewMode = btn.dataset.annualMode;
        render();
      });
    });

    // 年度總覽內點擊某月份「切換至編輯模式」
    el.querySelectorAll('[data-edit-single-month]').forEach(btn => {
      btn.addEventListener('click', () => {
        curMonth = btn.dataset.editSingleMonth;
        activeSubTab = 'matrix';
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    // 月份切換 (上個月 / 下個月)
    q('[data-month-prev]')?.addEventListener('click', () => {
      const [y, m] = curMonth.split('-').map(Number);
      const prev = new Date(y, m - 2, 1);
      curMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      render();
    });

    q('[data-month-next]')?.addEventListener('click', () => {
      const [y, m] = curMonth.split('-').map(Number);
      const next = new Date(y, m, 1);
      curMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
      render();
    });

    // 儲存「出差日期 (幾號)」列輸入
    let saveTimer = null;
    const persistCurrentMonthMatrix = async () => {
      const { rawDuty, quotas: curQuotas, assignments: baseAssign, tripDates: baseTripDates } = getMergedMonthSimulationData(curMonth);
      const nextAssign = JSON.parse(JSON.stringify(baseAssign));
      const nextTripDates = JSON.parse(JSON.stringify(baseTripDates));

      el.querySelectorAll('.sim-cell-input').forEach(cell => {
        const reg = cell.dataset.region;
        const nick = cell.dataset.nick;
        const num = Number(cell.value) || 0;
        if (!nextAssign[reg]) nextAssign[reg] = {};
        if (num > 0) {
          nextAssign[reg][nick] = num;
        } else {
          delete nextAssign[reg][nick];
        }
      });

      el.querySelectorAll('.sim-tripdate-input').forEach(inp => {
        const nick = inp.dataset.nick;
        const val = inp.value.trim();
        if (val) {
          nextTripDates[nick] = val;
        } else {
          delete nextTripDates[nick];
        }
      });

      try {
        await saveSimulationDutyPlan(curMonth, {
          ...rawDuty,
          quotas: curQuotas,
          assignments: nextAssign,
          tripDates: nextTripDates,
        });
        toast('排班與出差日期已自動儲存並更新統計', 'success');
        render();
      } catch (err) {
        console.error(err);
        toast('排班儲存失敗：' + (err.code || err.message), 'error');
      }
    };

    el.querySelectorAll('.sim-tripdate-input').forEach(inp => {
      inp.addEventListener('change', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(persistCurrentMonthMatrix, 300);
      });
    });

    // 儲存單格輸入即時高亮與自動雲端同步（套用各縣市專屬色彩）
    el.querySelectorAll('.sim-cell-input').forEach(inp => {
      inp.addEventListener('input', () => {
        const val = Number(inp.value) || 0;
        const region = inp.dataset.region;
        const theme = REGION_THEMES[region] || { bg: '#f1f5f9', border: '#cbd5e1', text: '#334155' };

        inp.style.background = val > 0 ? theme.bg : '#fff';
        inp.style.color = val > 0 ? theme.text : 'inherit';
        inp.style.borderColor = val > 0 ? theme.border : '#e2e8f0';
        inp.style.fontWeight = val > 0 ? '800' : 'normal';
      });

      inp.addEventListener('change', () => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(persistCurrentMonthMatrix, 300);
      });
    });
  }

  render();
  return {
    update: () => {
      const active = document.activeElement;
      if (active && el.contains(active) && (active.classList.contains('sim-cell-input') || active.classList.contains('sim-tripdate-input'))) return;
      render();
    }
  };
}
